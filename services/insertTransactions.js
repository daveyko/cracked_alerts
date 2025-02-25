const { insertTransactions: insertTransactionsDB } = require('../db/transactions');
const { transactionOverThreshold } = require('../utils/transactionThreshold');
const { isStableCoinTransaction } = require('../utils/coinType');

const MINIMIUM_USD_TRANSACTION = 20;
const MINIMUM_SOL_TRANSACTION = 0.1;

async function insertTransactions(transactions) {
    for (const transaction of transactions) {
        if (
            transactionOverThreshold(
                transaction,
                MINIMUM_SOL_TRANSACTION,
                MINIMIUM_USD_TRANSACTION
            ) &&
            //TODO: for now we can't really handle the pnl of stablecoin swaps -- look into handling this in the future
            !isStableCoinTransaction(transaction)
        ) {
            await insertTransactionsDB([transaction]);
        }
    }
}

module.exports = {
    insertTransactions,
};
