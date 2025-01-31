const cache = require('./memory');
const { aggregateTransactions } = require('./transactionAgg')
const { formatAggMessage } = require('./formatAggMessage')
const { bot } = require('./tgbot')

async function processTransactions() {
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

function startCron() { 
    console.log('Starting cron')
    setInterval(processTransactions, 60*5*1000)
}

module.exports = { 
    startCron
}
