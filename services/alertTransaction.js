const {
    transactionAggByWalletToken,
    transactionAggByWalletTokenMessage,
} = require('../transformers/transactionAggByWalletToken');
const { getWalletScores } = require('../db/walletScores');
const { createSimulatedTrade } = require('../db/tradeSimulator');
const { transactionOverThreshold } = require('../utils/transactionThreshold');
const MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING_WHALE = 10000;
const MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING_WHALE = 50;

async function transactionAlert(transaction, postMessage) {
    const { walletName } = transaction;
    if (
        transactionOverThreshold(
            transaction,
            MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING_WHALE,
            MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING_WHALE
        )
    ) {
        await createSimulatedTrade(transaction);
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
