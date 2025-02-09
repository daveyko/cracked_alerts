const { postMessage } = require('./clients/tgbot');
const { fetchDexTokenData } = require('./clients/dexscreener');
const { multiWalletAlert } = require('./services/alertMultiWallet');
const { pruneCacheStartCron } = require('./services/cronPruneOldTransactions');
const { insertTransactions } = require('./services/insertTransactions');
const { updateWalletScoresCron } = require('./services/cronUpdateWalletScores');
const { transactionAlert } = require('./services/alertTransaction');
const { getTransaction } = require('./transformers/transaction');
const { detectTokenSwap } = require('./transformers/tokenSwap');
const { PORTNOY_WALLET_ADDRESS, VIP_CHAT_ID } = require('./constants/vipChat');
const cache = require('./utils/cache');

//Runs once for each wallet transaction
async function runWalletTransactionPipeline(transaction, address, signature) {
    const parsedTransaction = await getTransaction(transaction, address, fetchDexTokenData);
    // Only proceed if we have both spent and received tokens
    if (parsedTransaction !== null) {
        console.log(
            `New ${parsedTransaction.transactionType} transaction detected for wallet: ${address} and token: ${parsedTransaction.altTokenCA}`
        );
        await Promise.all([
            multiWalletAlert(parsedTransaction, cache, postMessage),
            insertTransactions([parsedTransaction]),
        ]);
        if (address === PORTNOY_WALLET_ADDRESS) {
            const swapResult = await detectTokenSwap(transaction, address, fetchDexTokenData);
            await transactionAlert({ swapResult, address, signature }, postMessage, VIP_CHAT_ID);
        }
    } else {
        console.log('Not a swap transaction (no spent or received tokens pair found)');
    }
}

//Runs once per app start
function runCronPipeline() {
    pruneCacheStartCron(cache);
    updateWalletScoresCron();
}

module.exports = {
    runWalletTransactionPipeline,
    runCronPipeline,
};
