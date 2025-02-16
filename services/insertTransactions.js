const { insertTransactions: insertTransactionsDB } = require('../db/transactions');

const MINIMIUM_USD_TRANSACTION = 20;
const MINIMUM_SOL_TRANSACTION = 0.1;

async function insertTransactions(transactions) {
    for (const transaction of transactions) {
        const { stableTokenAmount, stableTokenSymbol } = transaction;
        if (shouldInsertTransaction(stableTokenAmount, stableTokenSymbol, transaction)) {
            await insertTransactionsDB(transactions);
        }
    }
}

function shouldInsertTransaction(stableTokenAmount, stableTokenSymbol, transaction) {
    // price is required for transactions to be parseable
    // TODO: look into if MC can be used instead (if MC is avialable when price isn't)
    if (!transaction.altTokenPrice) {
        return false;
    }
    if (stableTokenSymbol === 'SOL') {
        return stableTokenAmount > MINIMUM_SOL_TRANSACTION;
    }
    if (stableTokenSymbol === 'USDC') {
        return stableTokenAmount > MINIMIUM_USD_TRANSACTION;
    }
    return false;
}

module.exports = {
    insertTransactions,
};
