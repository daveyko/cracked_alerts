const {
    transactionAggByWalletToken,
    transactionAggByWalletTokenMessage,
} = require('../transformers/transactionAggByWalletToken');
const { getWalletScores } = require('../db/walletScores');
const { transactionOverThreshold } = require('../utils/transactionThreshold');
const { isStableCoin } = require('../utils/coinType');

const MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING = 200;
const MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING = 1;
const ALERT_THRESHOLD = 3;
const ALERT_THRESHOLD_HIGH_THRESHOLD = 5;
const ALERT_THRESHOLD_REFRESH = 10;

async function multiWalletAlert(transaction, cache, postMessage) {
    const { receivedTokenCA, receivedTokenSymbol, spentTokenCA, spentTokenSymbol, walletName } =
        transaction;
    if (
        transactionOverThreshold(
            transaction,
            MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING,
            MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING
        )
    ) {
        // Only track **non-stable** tokens (alt tokens) for alerts
        if (!isStableCoin(receivedTokenCA, receivedTokenSymbol)) {
            processTokenAlert(cache, walletName, receivedTokenCA, transaction, 'BUY', postMessage);
        }
        if (!isStableCoin(spentTokenCA, spentTokenSymbol)) {
            processTokenAlert(cache, walletName, spentTokenCA, transaction, 'SELL', postMessage);
        }
    }
}

function processTokenAlert(cache, walletName, tokenCA, transaction, buyOrSell, postMessage) {
    const cacheKey = `${tokenCA}-${buyOrSell}`;

    if (!cache.get(cacheKey)) {
        cache.set(cacheKey, {
            uniqueWallets: new Set(),
            transactions: [],
            walletsAlertSent: new Set(),
        });
    }
    const tokenEntry = cache.get(cacheKey);
    // Add wallet to unique set of traders
    tokenEntry.uniqueWallets.add(walletName);
    tokenEntry.transactions.push({ walletName, ...transaction });
    // Trigger alert if threshold is met
    if (
        tokenEntry.uniqueWallets.size >= ALERT_THRESHOLD &&
        tokenEntry.uniqueWallets.size <= ALERT_THRESHOLD_HIGH_THRESHOLD
    ) {
        sendMessage(
            tokenEntry.transactions.filter((t) => !tokenEntry.walletsAlertSent.has(t.walletName)),
            getWalletScores,
            tokenEntry.uniqueWallets.size,
            process.env.TELEGRAM_CHAT_ID_LOW_THRESHOLD,
            postMessage,
            tokenEntry
        );
    } else if (
        tokenEntry.uniqueWallets.size > ALERT_THRESHOLD_HIGH_THRESHOLD &&
        tokenEntry.uniqueWallets.size <= ALERT_THRESHOLD_REFRESH
    ) {
        const filteredTransactions =
            tokenEntry.uniqueWallets.size === ALERT_THRESHOLD_HIGH_THRESHOLD + 1
                ? tokenEntry.transactions
                : tokenEntry.transactions.filter(
                      (t) => !tokenEntry.walletsAlertSent.has(t.walletName)
                  );
        sendMessage(
            filteredTransactions,
            getWalletScores,
            tokenEntry.uniqueWallets.size,
            process.env.TELEGRAM_CHAT_ID_HIGH_THRESHOLD,
            postMessage,
            tokenEntry
        );
    }
    if (tokenEntry.uniqueWallets.size > ALERT_THRESHOLD_REFRESH) {
        cache.del([cacheKey]);
    }
}

async function sendMessage(
    filteredTransactions,
    getWalletScores,
    size,
    chatId,
    postMessage,
    tokenEntry
) {
    const agg = await transactionAggByWalletToken(filteredTransactions, getWalletScores);
    if (agg.length > 0) {
        const message = transactionAggByWalletTokenMessage(agg, `${size} BUNDLED`);
        await postMessage(message, { parse_mode: 'HTML', disable_web_page_preview: true, chatId });
        tokenEntry.uniqueWallets.forEach((wallet) => tokenEntry.walletsAlertSent.add(wallet));
    }
}

module.exports = {
    multiWalletAlert,
};
