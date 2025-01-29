require("dotenv").config();
const express = require("express");
const { WebSocketServer } = require("ws");
const { Connection, clusterApiUrl, PublicKey } = require("@solana/web3.js");
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const wss = new WebSocketServer({ server });
const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl("mainnet-beta"), "confirmed");

const subscriptions = new Map();

// create map for tokens (usdc, sol)

// Rate limit configuration
const RATE_LIMIT_DELAY = 2000;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 1000;
let lastRequestTime = 0;

// Transaction handling configuration
const TRANSACTION_NOT_FOUND_RETRIES = 3;
const TRANSACTION_NOT_FOUND_DELAY = 1000;
const MINIMUM_USDC_CHANGE = 10.0;
const MINIMUM_SOL_CHANGE = 0.2;
const recentTransactions = new Set();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Enhanced throttled request with exponential backoff
async function throttledRequest(callback) {
    const now = Date.now();
    const timeToWait = Math.max(0, RATE_LIMIT_DELAY - (now - lastRequestTime));

    if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
    }

    lastRequestTime = Date.now();

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await callback();
        } catch (error) {
            if (error.message.includes('429')) {
                const backoffTime = INITIAL_BACKOFF * Math.pow(2, attempt);
                console.log(`Rate limit hit, retrying in ${backoffTime}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);

                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                    continue;
                }
            }
            throw error;
        }
    }
}

async function detectTokenSwap(preTokenBalances, postTokenBalances, walletAddress, preBalances, postBalances) {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const preMap = new Map();
    const postMap = new Map();
    let otherTokenMint = null;

    function populateMap(map, balances) {
        for (const balance of balances) {
            const { mint, owner, uiTokenAmount } = balance;
            if (owner === walletAddress) {
                map.set(mint, uiTokenAmount.uiAmount);
                // Identify non-USDC token
                if (mint !== USDC_MINT) {
                    otherTokenMint = mint;
                }
            }
        }
    }

    populateMap(preMap, preTokenBalances);
    populateMap(postMap, postTokenBalances);

    let tokenInfo = null;
    // If we found a non-USDC token, fetch its metadata
    if (otherTokenMint) {
        try {
            // Add a small delay before making the API call
            await new Promise(resolve => setTimeout(resolve, 500));

            const response = await fetch('https://mainnet.helius-rpc.com/?api-key=' + process.env.HELIUS_API_KEY, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "jsonrpc": "2.0",
                    "id": "test",
                    "method": "getAsset",
                    "params": {
                        "id": otherTokenMint,
                    }
                }),
            });
            const data = await response.json();

            // Add null checks before accessing properties
            if (data && data.result) {
                if (data.result.content && data.result.content.links) {
                }
                if (data.result.token_info && data.result.token_info.price_info) {
                }
            } else {
                console.log('No token data found:', data);
            }

            if (data && data.result && data.result.token_info) {
                tokenInfo = {
                    symbol: data.result.token_info.symbol,
                    price: data.result.token_info.price_info?.price_per_token || 0,
                    decimals: data.result.token_info.decimals
                };
            }
        } catch (error) {
            console.error('Error fetching token metadata:', error);
        }
    }

    // Get USDC changes
    const preUSDC = preMap.get(USDC_MINT) || 0;
    const postUSDC = postMap.get(USDC_MINT) || 0;
    const usdcChange = postUSDC - preUSDC;

    // Calculate SOL change from native balances
    const preSOL = preBalances[0] / 1e9; // Convert lamports to SOL
    const postSOL = postBalances[0] / 1e9;
    const solChange = postSOL - preSOL;

    // Calculate other token changes
    const preToken = preMap.get(otherTokenMint) || 0;
    const postToken = postMap.get(otherTokenMint) || 0;
    const tokenChange = postToken - preToken;

        const result = {};
        
        if (Math.abs(usdcChange) > 0) {
            result.USDC = {
                amount: usdcChange,
                type: usdcChange > 0 ? 'Received' : 'Spent'
            };
        }
        
        if (Math.abs(solChange) > 0) {
            result.SOL = {
                amount: solChange,
                type: solChange > 0 ? 'Received' : 'Spent'
            };
        }
        
        if (tokenChange !== 0) {
            result.TOKEN = {
                amount: tokenChange,
                type: tokenChange > 0 ? 'Received' : 'Spent',
                info: tokenInfo
            };
        }
    
    return result;
}

// Handle WebSocket connections
wss.on("connection", (ws) => {
    console.log("New WebSocket connection established.");

    ws.on("message", async (message) => {
        console.log("Received message:", message.toString());
        try {
            const { address } = JSON.parse(message.toString());
            console.log(`Subscribing to wallet: ${address}`);

            const publicKey = new PublicKey(address);


            // Subscribe to confirmed transactions
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

                    // Only send message if changes are above minimum thresholds
                    if (swapResult && (
                        (swapResult.SOL?.amount && Math.abs(swapResult.SOL.amount) > MINIMUM_SOL_CHANGE) ||
                        (swapResult.USDC?.amount && Math.abs(swapResult.USDC.amount) > MINIMUM_USDC_CHANGE)
                    )) {
                        console.log('swapResult', swapResult);
                        try {
                            const message = formatSwapMessage(swapResult, signature);
                            await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML' });
                        } catch (error) {
                            console.error('Error sending Telegram message:', error);
                        }
                    } else {
                        console.log('Transaction below $10 threshold, skipping notification');
                    }
                } catch (error) {
                    console.error('Error in subscription handler:', error);
                }
            }, "confirmed");

            // Store subscription
            subscriptions.set(ws, subscriptionId);

        } catch (error) {
            console.error("Error handling WebSocket message:", error);
            ws.send(JSON.stringify({ error: "Invalid request format." }));
        }
    });

    ws.on("close", () => {
        console.log("WebSocket connection closed.");

        // Remove subscription if it exists
        if (subscriptions.has(ws)) {
            connection.removeOnLogsListener(subscriptions.get(ws));
            subscriptions.delete(ws);
        }
    });
});

// Add this helper function at the bottom of the file
function formatSwapMessage(swapResult, signature) {
    const { USDC, SOL, TOKEN } = swapResult;
    // Only calculate amounts if USDC/SOL exists
    const usdcAmount = USDC ? Math.abs(USDC.amount).toFixed(2) : '0';
    const solAmount = SOL ? Math.abs(SOL.amount).toFixed(4) : '0';

    let message = '🔄 <b>Swap Detected</b>\n\n';

    // Handle token swaps
    if (TOKEN && TOKEN.info) {
        const tokenAmount = Math.abs(TOKEN.amount).toFixed(2);
        const tokenValue = (Math.abs(TOKEN.amount) * TOKEN.info.price).toFixed(2);
        const tokenSymbol = TOKEN.info.symbol;

        if (USDC && USDC.amount !== 0) {
            if (TOKEN.type === 'Received') {
                message += `Swapped 💵 ${usdcAmount} USDC for ${tokenAmount} ${tokenSymbol}\n`;
                message += `Token Price: $${TOKEN.info.price.toFixed(4)} (Total: $${tokenValue})`;
            } else {
                message += `Swapped ${tokenAmount} ${tokenSymbol} for 💵 ${usdcAmount} USDC\n`;
                message += `Token Price: $${TOKEN.info.price.toFixed(4)} (Total: $${tokenValue})`;
            }
        } else if (SOL && SOL.amount !== 0) {
            if (TOKEN.type === 'Received') {
                message += `Swapped ◎${solAmount} SOL for ${tokenAmount} ${tokenSymbol}\n`;
                message += `Token Price: $${TOKEN.info.price.toFixed(4)} (Total: $${tokenValue})`;
            } else {
                message += `Swapped ${tokenAmount} ${tokenSymbol} for ◎${solAmount} SOL\n`;
                message += `Token Price: $${TOKEN.info.price.toFixed(4)} (Total: $${tokenValue})`;
            }
        }
    }
    // Handle USDC/SOL swaps
    else if (USDC && SOL && USDC.amount !== 0 && SOL.amount !== 0) {
        if (USDC.type === 'Spent' && SOL.type === 'Received') {
            message += `Swapped 💵 ${usdcAmount} USDC for ◎${solAmount} SOL`;
        } else if (SOL.type === 'Spent' && USDC.type === 'Received') {
            message += `Swapped ◎${solAmount} SOL for 💵 ${usdcAmount} USDC`;
        }
    }

    message += `\n\n🔗 <a href="https://solscan.io/tx/${signature}">View Transaction</a>`;

    return message;
}

