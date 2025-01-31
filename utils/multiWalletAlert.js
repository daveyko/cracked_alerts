const { aggregateTransactions } = require('./transactionAgg')
const { formatAggMessage } = require('./formatAggMessage')
const { bot } = require('./tgbot')
const ALERT_THRESHOLD = 3; // Trigger alert when 3 unique wallets buy/sell the same token

async function multiWalletAlert(transaction) {
    const { altTokenCA, walletName, transactionType } = transaction;
    const cacheKey = `${altTokenCA}-${transactionType}`
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
        const agg = aggregateTransactions([...tokenEntry.transactions]) 
        if (agg.length > 0) {
            const message = formatAggMessage(agg, "3 WALLET ACTION ALERT!")
            await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML', disable_web_page_preview: true });
        }
        cache.del(cacheKey);
    }
}

module.exports = { 
    multiWalletAlert
}