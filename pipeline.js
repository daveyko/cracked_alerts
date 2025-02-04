const { postMessage } = require('./clients/tgbot')
const { fetchDexTokenData } = require('./clients/dexscreener')
const { multiWalletAlert, shouldProcessMultiWalletAlert } = require('./services/alertMultiWallet')
const { pruneCacheStartCron } = require('./services/cronPruneOldTransactions')
const { getTransaction } = require('./transformers/transaction')
const cache = require('./utils/cache')


//Runs once for each wallet transaction
async function runWalletTransactionPipeline(transaction, address) { 
    const parsedTransaction = await getTransaction(transaction, address, fetchDexTokenData)
    // Only proceed if we have both spent and received tokens
    if (parsedTransaction !== null) {
        const { stableTokenAmount, stableTokenSymbol } = parsedTransaction
        if (shouldProcessMultiWalletAlert(stableTokenAmount, stableTokenSymbol)) {
            console.log(`New ${parsedTransaction.transactionType} transaction detected for wallet: ${address} and token: ${parsedTransaction.altTokenCA}`);
            multiWalletAlert(parsedTransaction, cache, postMessage);
        }
    } else {
        console.log('Not a swap transaction (no spent or received tokens pair found)');
    }
}

//Runs once per app start
function runCronPipeline() { 
    pruneCacheStartCron(cache)
}

module.exports = { 
    runWalletTransactionPipeline, 
    runCronPipeline,
}