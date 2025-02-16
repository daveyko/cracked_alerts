const {
    transactionAggByWalletToken,
    transactionAggByWalletTokenMessage,
} = require('../transformers/transactionAggByWalletToken');
const { getWalletScores } = require('../db/walletScores');

const MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING = 200;
const MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING = 1;
const ALERT_THRESHOLD = 3;
const ALERT_THRESHOLD_HIGH_THRESHOLD = 5;
const ALERT_THRESHOLD_REFRESH = 10;

async function multiWalletAlert(transaction, cache, postMessage) {
    const { altTokenCA, stableTokenAmount, stableTokenSymbol, walletName, transactionType } =
        transaction;
    if (shouldProcessMultiWalletAlert(stableTokenAmount, stableTokenSymbol)) {
        const cacheKey = `${altTokenCA}-${transactionType}`;
        // Initialize the cache entry for this token if it doesn't exist
        if (!cache.get(cacheKey)) {
            cache.set(cacheKey, {
                uniqueWallets: new Set(),
                transactions: [],
                walletsAlertSent: new Set(),
            });
        }
        const tokenEntry = cache.get(cacheKey);
        // Add the wallet to the unique set of buyers
        tokenEntry.uniqueWallets.add(walletName);
        // Store the full transaction metadata
        tokenEntry.transactions.push({ walletName, ...transaction });
        // If 3 unique wallets have bought this token, trigger an alert
        if (
            tokenEntry.uniqueWallets.size >= ALERT_THRESHOLD &&
            tokenEntry.uniqueWallets.size <= ALERT_THRESHOLD_HIGH_THRESHOLD
        ) {
            const filteredTransactions = tokenEntry.transactions.filter(
                (t) => !tokenEntry.walletsAlertSent.has(t.walletName)
            );
            await sendMessage(
                filteredTransactions,
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
                //on first alert send all transaction -- subsequent ones just filter out the wallets
                tokenEntry.uniqueWallets.size === ALERT_THRESHOLD_HIGH_THRESHOLD + 1
                    ? tokenEntry.transactions
                    : tokenEntry.transactions.filter(
                          (t) => !tokenEntry.walletsAlertSent.has(t.walletName)
                      );
            await sendMessage(
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

function shouldProcessMultiWalletAlert(stableTokenAmount, stableTokenSymbol) {
    if (stableTokenSymbol === 'SOL') {
        return stableTokenAmount > MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING;
    }
    if (stableTokenSymbol === 'USDC') {
        return stableTokenAmount > MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING;
    }
    return false;
}

module.exports = {
    multiWalletAlert,
};
