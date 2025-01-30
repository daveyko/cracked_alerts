require("dotenv").config();
const express = require("express");
const { WebSocketServer } = require("ws");
const { Connection, clusterApiUrl, PublicKey } = require("@solana/web3.js");
const TelegramBot = require('node-telegram-bot-api');
const formatSwapMessage = require('./utils/formatSwapMessage');
const throttledRequest = require('./utils/throttleRequest');
const { WALLET_ADDRESSES } = require('./constants/walletAddresses');
const detectTokenSwap = require('./utils/detectTokenSwap');
const { addTransaction } = require('./utils/transaction')

const app = express();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initializeWalletSubscriptions();
});
const wss = new WebSocketServer({ server });
const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl("mainnet-beta"), "confirmed");

const subscriptions = new Map();

// TODO: create map for common tokens (usdc, sol)


const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Transaction handling configuration
const TRANSACTION_NOT_FOUND_RETRIES = 3;
const TRANSACTION_NOT_FOUND_DELAY = 1000;
const MINIMUM_USDC_CHANGE = 2.0;
const MINIMUM_SOL_CHANGE = 0.02;
const recentTransactions = new Set();

// Add this function to handle wallet subscription
const subscribeToWallet = async (address) => {
    try {
        const publicKey = new PublicKey(address);

        const subscriptionId = connection.onLogs(publicKey, async (logInfo) => {
            try {
                console.log(`New transaction detected for ${address}`);
                const signature = logInfo.signature;

                let transaction;
                for (let i = 0; i < TRANSACTION_NOT_FOUND_RETRIES; i++) {
                    try {
                        transaction = await throttledRequest(() =>
                            connection.getTransaction(signature, {
                                commitment: 'confirmed',
                                maxSupportedTransactionVersion: 0
                            })
                        );

                        if (transaction) {
                            break;
                        }

                        console.log(`Transaction not found, attempt ${i + 1}/${TRANSACTION_NOT_FOUND_RETRIES}. Waiting ${TRANSACTION_NOT_FOUND_DELAY}ms...`);
                        await new Promise(resolve => setTimeout(resolve, TRANSACTION_NOT_FOUND_DELAY));
                    } catch (error) {
                        console.error('Error fetching transaction:', error);
                        if (i === TRANSACTION_NOT_FOUND_RETRIES - 1) {
                            throw error;
                        }
                    }
                }

                if (!transaction) {
                    console.log(`Transaction ${signature} not found after ${TRANSACTION_NOT_FOUND_RETRIES} attempts`);
                    return;
                }

                // Check if we've already processed this transaction
                if (recentTransactions.has(signature)) {
                    console.log(`Skipping duplicate transaction ${signature}`);
                    return;
                }

                // Add to recent transactions
                recentTransactions.add(signature);

                // Clean up old transactions after 1 minute
                setTimeout(() => {
                    recentTransactions.delete(signature);
                }, 60000);

                const preTokenBalances = transaction.meta.preTokenBalances;
                const postTokenBalances = transaction.meta.postTokenBalances;

                const swapResult = await detectTokenSwap(
                    preTokenBalances,
                    postTokenBalances,
                    address,
                    transaction.meta.preBalances,
                    transaction.meta.postBalances
                );

                // Count spent and received tokens
                const spentTokens = Object.values(swapResult).filter(token => token.type === 'Spent');
                const receivedTokens = Object.values(swapResult).filter(token => token.type === 'Received');

                // Only proceed if we have both spent and received tokens
                if (spentTokens.length > 0 && receivedTokens.length > 0) {
                    // Check minimum thresholds
                    const meetsThreshold = (
                        (swapResult.SOL?.amount && Math.abs(swapResult.SOL.amount) > MINIMUM_SOL_CHANGE) ||
                        (swapResult.USDC?.amount && Math.abs(swapResult.USDC.amount) > MINIMUM_USDC_CHANGE)
                    );

                    if (meetsThreshold) {
                        console.log('swapResult', swapResult);
                        try {
                            const message = formatSwapMessage(swapResult, signature, address);
                            await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML', disable_web_page_preview: true });
                        } catch (error) {
                            console.error('Error sending Telegram message:', error);
                        }
                        addTransaction(swapResult, transaction.slot, address);
                    } else {
                        console.log('Transaction below threshold, skipping notification');
                    }
                } else {
                    console.log('Not a swap transaction (no spent or received tokens pair found)');
                }
            } catch (error) {
                console.error('Error in subscription handler:', error);
            }
        }, "confirmed");

        // Store subscription with address as key
        subscriptions.set(address, subscriptionId);
        console.log(`Successfully subscribed to wallet: ${address}`);
    } catch (error) {
        console.error(`Error subscribing to wallet ${address}:`, error);
    }
};

// Initialize subscriptions for all wallet addresses
const initializeWalletSubscriptions = async () => {
    console.log('Initializing wallet subscriptions...');
    for (const address of WALLET_ADDRESSES) {
        await subscribeToWallet(address);
    }
    console.log(`Initialized subscriptions for ${WALLET_ADDRESSES.length} wallets`);
    try {
        const message = `💉 CRACKED ALERTS IS ONLINE!\n🔍 Monitoring ${WALLET_ADDRESSES.length} wallets 🔎`;
        await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
    } catch (error) {
        console.error('Error sending Telegram connection message:', error);
    }
};

// Modify WebSocket connection handler to only handle cleanup
wss.on("connection", (ws) => {
    console.log("New WebSocket connection established.");

    ws.on("close", () => {
        console.log("WebSocket connection closed.");
    });
});
