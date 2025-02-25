const USDC_CA = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function isUSDC(tokenCA) {
    return tokenCA === USDC_CA;
}

function isSOL(tokenCA, tokenSymbol) {
    return tokenSymbol === 'SOL' && !tokenCA;
}

function isStableCoin(tokenCA, tokenSymbol) {
    return isUSDC(tokenCA) || isSOL(tokenCA, tokenSymbol);
}

function isStableCoinTransaction(transaction) {
    const { receivedTokenCA, receivedTokenSymbol, spentTokenCA, spentTokenSymbol } = transaction;
    return (
        isStableCoin(receivedTokenCA, receivedTokenSymbol) &&
        isStableCoin(spentTokenCA, spentTokenSymbol)
    );
}

module.exports = {
    isUSDC,
    isSOL,
    isStableCoin,
    isStableCoinTransaction,
};
