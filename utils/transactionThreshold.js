const { isSOL, isUSDC, isStableCoin } = require('../utils/coinType');

function transactionOverThreshold(transaction, solThreshold, usdcThreshold) {
    const {
        receivedTokenCA,
        receivedTokenPrice,
        receivedTokenAmount,
        spentTokenAmount,
        spentTokenPrice,
        spentTokenCA,
    } = transaction;
    if (isUSDC(receivedTokenCA)) {
        return receivedTokenAmount > usdcThreshold;
    }
    if (isUSDC(spentTokenCA)) {
        return spentTokenAmount > usdcThreshold;
    }
    if (isSOL(receivedTokenCA)) {
        return receivedTokenAmount > solThreshold;
    }
    if (isSOL(spentTokenCA)) {
        return spentTokenAmount > solThreshold;
    }
    if (!isStableCoin(receivedTokenCA) && !isStableCoin(spentTokenCA)) {
        return (
            receivedTokenAmount * receivedTokenPrice > usdcThreshold ||
            spentTokenAmount * spentTokenPrice > usdcThreshold
        );
    }
    throw new Error('Invalid transaction type');
}

module.exports = {
    transactionOverThreshold,
};
