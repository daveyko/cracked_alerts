const {
    transactionAggByWalletToken,
    transactionAggByWalletTokenMessage,
} = require('../transformers/transactionAggByWalletToken');
const { getWalletScores } = require('../db/walletScores');
const MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING_VIP = 200;
const MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING_VIP = 1;
const MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING_WHALE = 20000;
const MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING_WHALE = 100;
const PORTNOY_WALLET_ADDRESS = '5rkPDK4JnVAumgzeV2Zu8vjggMTtHdDtrsd5o9dhGZHD';

async function transactionAlert(transaction, postMessage) {
    const { stableTokenAmount, stableTokenSymbol, walletAddress, walletName } = transaction;
    if (
        shouldProcessTransactionAlert(stableTokenAmount, stableTokenSymbol) &&
        [PORTNOY_WALLET_ADDRESS].includes(walletAddress)
    ) {
        await sendMessage(
            `${walletName} VIP`,
            process.env.TELEGRAM_CHAT_ID_VIP,
            transaction,
            postMessage
        );
    } else if (shouldProcessTransactionAlertWhaleBuy(stableTokenAmount, stableTokenSymbol)) {
        await sendMessage(
            `${walletName} SIZED`,
            process.env.TELEGRAM_CHAT_ID_HIGH_THRESHOLD,
            transaction,
            postMessage
        );
    }
}

async function sendMessage(title, chatId, transaction, postMessage) {
    const agg = await transactionAggByWalletToken([transaction], getWalletScores);
    if (agg.length > 0) {
        const message = transactionAggByWalletTokenMessage(agg, title);
        await postMessage(message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            chatId,
        });
    }
}

function shouldProcessTransactionAlert(stableTokenAmount, stableTokenSymbol) {
    if (stableTokenSymbol === 'SOL') {
        return stableTokenAmount > MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING_VIP;
    }
    if (stableTokenSymbol === 'USDC') {
        return stableTokenAmount > MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING_VIP;
    }
    return false;
}

function shouldProcessTransactionAlertWhaleBuy(stableTokenAmount, stableTokenSymbol) {
    if (stableTokenSymbol === 'SOL') {
        return stableTokenAmount > MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING_WHALE;
    }
    if (stableTokenSymbol === 'USDC') {
        return stableTokenAmount > MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING_WHALE;
    }
    return false;
}

module.exports = {
    transactionAlert,
};
