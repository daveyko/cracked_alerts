const { isSOL, isUSDC, isStableCoin } = require('../utils/coinType');

function transactionOverThreshold(transaction, solThreshold, usdcThreshold) {
    const {
        receivedTokenCA,
        receivedTokenSymbol,
        receivedTokenPrice,
        receivedTokenAmount,
        spentTokenAmount,
        spentTokenPrice,
        spentTokenCA,
        spentTokenSymbol,
    } = transaction;
    if (isUSDC(receivedTokenCA)) {
        return receivedTokenAmount > usdcThreshold;
    }
    if (isUSDC(spentTokenCA)) {
        return spentTokenAmount > usdcThreshold;
    }
    if (isSOL(receivedTokenCA, receivedTokenSymbol)) {
        return receivedTokenAmount > solThreshold;
    }
    if (isSOL(spentTokenCA, spentTokenSymbol)) {
        return spentTokenAmount > solThreshold;
    }
    if (
        !isStableCoin(receivedTokenCA, receivedTokenSymbol) &&
        !isStableCoin(spentTokenCA, spentTokenSymbol)
    ) {
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
