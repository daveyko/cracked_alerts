const cache = require('./memory');
const { aggregateTransactions } = require('./transactionAgg')
const { formatAggMessage } = require('./formatAggMessage')
const { bot } = require('./tgbot')
const PRUNE_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
const TRANSACTION_EXPIRY = 10 * 60 * 1000; // Transactions older than 10 minutes should be removed

async function transactionSummaries() {
    console.log('Running transaction processor...');
    const transactions = cache.getAll();
    const transactionIds = [...transactions.keys()]
    const agg = aggregateTransactions([...transactions.values()]) 
    if (agg.length > 0) {
        const message = formatAggMessage(agg)
        await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML', disable_web_page_preview: true });
    }
    cache.del(transactionIds);
    console.log(`Processed and cleared ${transactionIds.length} transactions.`);
}

function transactionSummariesStartCron() { 
    console.log('Starting cron')
    setInterval(processTransactions, 60*15*1000)
}

function pruneOldTransactions() {
    const now = Date.now();
    console.log("Pruning old transactions. Current cache size:", cache.size());
    cache.getAll().forEach((entry, key) => {
        // Filter out old transactions
        entry.transactions = entry.transactions.filter(tx => { 
            return now - tx.blockTime < TRANSACTION_EXPIRY
        });
        // Remove wallets that no longer have recent transactions
        entry.uniqueWallets = new Set(entry.transactions.map(tx => tx.walletName));
        // If there are no transactions left, remove the entry
        if (entry.transactions.length === 0) {
            cache.del([key]);
        }
    });
    console.log("Pruned old transactions. Current cache size:", cache.size());
}

function pruneCacheStartCron() { 
    setInterval(pruneOldTransactions, PRUNE_INTERVAL);
}

module.exports = { 
    pruneCacheStartCron
}
