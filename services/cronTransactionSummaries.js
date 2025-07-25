const { aggregateTransactions } = require('./transactionAgg')
const { formatAggMessage } = require('./formatAggMessage')


async function transactionSummaries(cache, postMessage) {
    console.log('Running transaction processor...');
    const transactions = cache.getAll();
    const transactionIds = [...transactions.keys()]
    const agg = aggregateTransactions([...transactions.values()]) 
    if (agg.length > 0) {
        const message = formatAggMessage(agg)
        await postMessage(message, { parse_mode: 'HTML', disable_web_page_preview: true });
    }
    cache.del(transactionIds);
    console.log(`Processed and cleared ${transactionIds.length} transactions.`);
}

function transactionSummariesStartCron(cache, postMessage) { 
    setInterval(() => { 
        transactionSummaries(cache, postMessage)
    }, 60*15*1000)
}


module.exports = { 
    transactionSummaries, 
    transactionSummariesStartCron
}

