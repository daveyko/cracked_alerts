const { insertTransactions: insertTransactionsDB } = require('../db/transactions');
const { transactionOverThreshold } = require('../utils/transactionThreshold');

const MINIMIUM_USD_TRANSACTION = 17;
const MINIMUM_SOL_TRANSACTION = 0.1;

async function insertTransactions(transactions) {
    for (const transaction of transactions) {
        if (
            transactionOverThreshold(transaction, MINIMUM_SOL_TRANSACTION, MINIMIUM_USD_TRANSACTION)
        ) {
            await insertTransactionsDB([transaction]);
        }
    }
}

module.exports = {
    insertTransactions,
};
