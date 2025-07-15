const { postMessage } = require('./clients/tgbot');
const { fetchDexTokenData } = require('./clients/dexscreener');
const { multiWalletAlert } = require('./services/alertMultiWallet');
const { pruneCacheStartCron } = require('./services/cronPruneOldTransactions');
const { insertTransactions } = require('./services/insertTransactions');
const { updateWalletScoresCron } = require('./services/cronUpdateWalletScores');
const { runSimulatedTradesCron } = require('./services/cronGenerateDailyPaperTradeSummary');
const { alertSizeTransaction } = require('./services/alertSizeTransaction');
const { getTransaction } = require('./transformers/transaction');
const cache = require('./utils/cache');

//Runs once for each wallet transaction
async function runWalletTransactionPipeline(transaction, address) {
    const parsedTransaction = await getTransaction(transaction, address, fetchDexTokenData);
    // Only proceed if we have both spent and received tokens
    if (parsedTransaction !== null) {
        console.log(
            `New ${parsedTransaction.transactionType} transaction detected for wallet: ${address} and token: ${parsedTransaction.transactionType === 'SELL' ? parsedTransaction.spentTokenSymbol : parsedTransaction.receivedTokenSymbol}`
        );
        await Promise.all([
            multiWalletAlert(parsedTransaction, cache, postMessage),
            alertSizeTransaction(parsedTransaction, postMessage),
            insertTransactions([parsedTransaction]),
        ]);
    } else {
        console.log('Not a swap transaction');
    }
}

//Runs once per app start
function runCronPipeline() {
    pruneCacheStartCron(cache);
    updateWalletScoresCron();
    runSimulatedTradesCron(postMessage);
}

module.exports = {
    runWalletTransactionPipeline,
    runCronPipeline,
};
