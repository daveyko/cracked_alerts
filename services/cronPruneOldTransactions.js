const PRUNE_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
const TRANSACTION_EXPIRY = 10 * 60 * 1000; // Transactions older than 10 minutes should be removed

function pruneOldTransactions(cache) {
    const now = Date.now();
    console.log('Pruning old transactions. Current cache size:', cache.size());
    cache.getAll().forEach((entry, key) => {
        // Filter out old transactions
        entry.transactions = entry.transactions.filter((tx) => {
            return now - tx.blockTime < TRANSACTION_EXPIRY;
        });
        // Remove wallets that no longer have recent transactions
        entry.uniqueWallets = new Set(entry.transactions.map((tx) => tx.walletName));
        // If there are no transactions left, remove the entry
        if (entry.transactions.length === 0) {
            cache.del([key]);
        }
    });
    console.log('Pruned old transactions. Current cache size:', cache.size());
}

function pruneCacheStartCron(cache) {
    setInterval(() => {
        pruneOldTransactions(cache);
    }, PRUNE_INTERVAL);
}

module.exports = {
    pruneCacheStartCron,
};
