const {
    transactionAggByWalletToken,
    transactionAggByWalletTokenMessage,
} = require('../transformers/transactionAggByWalletToken');
const { getWalletScores } = require('../db/walletScores');
const { transactionOverThreshold } = require('../utils/transactionThreshold');
const MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING_VIP = 2000;
const MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING_VIP = 10;
const MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING_WHALE = 10000;
const MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING_WHALE = 50;
const PORTNOY_WALLET_ADDRESS = '5rkPDK4JnVAumgzeV2Zu8vjggMTtHdDtrsd5o9dhGZHD';
const Y22_WALLET_ADDRESS = 'GgG65z3MXpmGnV3ZapKv5ayDqox1x7CJnqP1LD8FaZdt';

async function transactionAlert(transaction, postMessage) {
    const { walletAddress, walletName } = transaction;
    if (
        transactionOverThreshold(
            transaction,
            MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING_VIP,
            MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING_VIP
        ) &&
        [PORTNOY_WALLET_ADDRESS, Y22_WALLET_ADDRESS].includes(walletAddress)
    ) {
        await sendMessage(
            `${walletName} VIP`,
            process.env.TELEGRAM_CHAT_ID_VIP,
            transaction,
            postMessage
        );
    } else if (
        transactionOverThreshold(
            transaction,
            MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING_WHALE,
            MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING_WHALE
        )
    ) {
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

module.exports = {
    transactionAlert,
};
