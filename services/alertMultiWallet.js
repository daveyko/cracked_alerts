const {
    transactionAggByWalletToken,
    transactionAggByWalletTokenMessage,
} = require('../transformers/transactionAggByWalletToken');

const MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING = 200;
const MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING = 1;
const ALERT_THRESHOLD = 3;

async function multiWalletAlert(transaction, cache, postMessage) {
    const { altTokenCA, walletName, transactionType } = transaction;
    const cacheKey = `${altTokenCA}-${transactionType}`;
    // Initialize the cache entry for this token if it doesn't exist
    if (!cache.get(cacheKey)) {
        cache.set(cacheKey, { uniqueWallets: new Set(), transactions: [] });
    }
    const tokenEntry = cache.get(cacheKey);
    // Add the wallet to the unique set of buyers
    tokenEntry.uniqueWallets.add(walletName);
    // Store the full transaction metadata
    tokenEntry.transactions.push({ walletName, ...transaction });
    // If 3 unique wallets have bought this token, trigger an alert
    if (tokenEntry.uniqueWallets.size >= ALERT_THRESHOLD) {
        const agg = transactionAggByWalletToken([...tokenEntry.transactions]);
        if (agg.length > 0) {
            const message = transactionAggByWalletTokenMessage(agg, '3 WALLET ACTION ALERT!');
            await postMessage(message, { parse_mode: 'HTML', disable_web_page_preview: true });
        }
        cache.del([cacheKey]);
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
    shouldProcessMultiWalletAlert,
};
