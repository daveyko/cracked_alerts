const USDC_CA = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_CA = 'So11111111111111111111111111111111111111112';

function isUSDC(tokenCA) {
    return tokenCA === USDC_CA;
}

function isSOL(tokenCA) {
    return tokenCA === SOL_CA;
}

function isStableCoin(tokenCA) {
    return isUSDC(tokenCA) || isSOL(tokenCA);
}

function isStableCoinBuy(receivedTokenCA, spentTokenCA) {
    return isSOL(receivedTokenCA) && isUSDC(spentTokenCA);
}

function isStableCoinSell(receivedTokenCA, spentTokenCA) {
    return isSOL(spentTokenCA) && isUSDC(receivedTokenCA);
}

module.exports = {
    isUSDC,
    isSOL,
    isStableCoin,
    isStableCoinBuy,
    isStableCoinSell,
};
