const { WALLET_NAMES } = require('../constants/walletAddresses');
const { detectTokenSwap } = require('./tokenSwap');
const GAS_FEE_THRESHOLD = 0.01; // Ignore SOL changes below this amount when other tokens are present
const { isUSDC, isSOL, isStableCoin } = require('../utils/coinType');

async function getTransaction(rawTransaction, walletAddress, fetchTokenData) {
    const swapResult = await detectTokenSwap(rawTransaction, walletAddress, fetchTokenData);
    const { USDC, SOL, ...otherTokens } = swapResult;
    const walletName = WALLET_NAMES[walletAddress] || walletAddress.slice(0, 4) + '...';
    const spentTokens = [];
    const receivedTokens = [];
    // Sort USDC and SOL first if they exist, but ignore small SOL amounts when other tokens are present
    if (USDC) {
        if (USDC.type === 'Spent') spentTokens.push({ symbol: 'USDC', ...USDC });
        else receivedTokens.push({ symbol: 'USDC', ...USDC });
    }
    if (SOL && Math.abs(SOL.amount) > GAS_FEE_THRESHOLD) {
        if (SOL.type === 'Spent') spentTokens.push({ symbol: 'SOL', ...SOL });
        else receivedTokens.push({ symbol: 'SOL', ...SOL });
    }
    // Add other tokens
    for (const [mint, token] of Object.entries(otherTokens)) {
        const tokenData = {
            symbol: token.info?.symbol || mint.slice(0, 4) + '...',
            ...token,
        };

        if (token.type === 'Spent') spentTokens.push(tokenData);
        else receivedTokens.push(tokenData);
    }
    // If we have no spent tokens yet (because we ignored SOL gas fee) but have other token movements
    if (spentTokens.length === 0 && Object.keys(otherTokens).length > 0) {
        for (const [mint, token] of Object.entries(otherTokens)) {
            if (token.type === 'Spent') {
                spentTokens.push({
                    symbol: token.info?.symbol || mint.slice(0, 4) + '...',
                    ...token,
                });
                break;
            }
        }
    }
    // Format amounts
    if (spentTokens.length && receivedTokens.length) {
        const spentToken = spentTokens[0];
        const receivedToken = receivedTokens[0];
        //Sometimes seeing transactions of USDC to USDC which we don't care about
        if (spentToken.symbol === receivedToken.symbol) {
            return null;
        }
        const receivedTokenSymbol = receivedToken.symbol;
        const receivedTokenCA = receivedToken.info?.address || receivedToken.address;
        const receivedTokenName = receivedToken.info?.name || receivedTokenSymbol;
        const receivedTokenPrice = receivedToken.info?.price;
        const receivedTokenAmount = parseFloat(Math.abs(receivedToken.amount).toFixed(2));

        const spentTokenSymbol = spentToken.symbol;
        const spentTokenCA = spentToken.info?.address || spentToken.address || null;
        const spentTokenName = spentToken.info?.name ?? spentTokenSymbol;
        const spentTokenPrice = spentToken.info?.price;
        const spentTokenAmount = parseFloat(Math.abs(spentToken.amount).toFixed(2));

        const transactionType = getTransactionType(
            receivedTokenSymbol,
            receivedTokenCA,
            spentTokenSymbol,
            spentTokenCA
        );

        return {
            receivedTokenAmount,
            receivedTokenCA,
            receivedTokenName,
            receivedTokenMetadata: getTokenMetadata(receivedToken),
            receivedTokenPrice,
            receivedTokenSymbol,
            spentTokenSymbol,
            spentTokenAmount,
            spentTokenCA,
            spentTokenMetadata: getTokenMetadata(spentToken),
            spentTokenName,
            spentTokenPrice,
            blockTime: rawTransaction.blockTime ?? Math.floor(Date().now() / 1000),
            transactionType,
            walletAddress,
            walletName,
        };
    }
    return null;
}

function getTransactionType(receivedTokenSymbol, receivedTokenCA, spentTokenSymbol, spentTokenCA) {
    if (
        (isStableCoin(receivedTokenCA, receivedTokenSymbol) &&
            !isStableCoin(spentTokenCA, spentTokenSymbol)) ||
        (isUSDC(receivedTokenCA) && isSOL(spentTokenCA, spentTokenSymbol))
    ) {
        return 'SELL';
    }
    if (
        (!isStableCoin(receivedTokenCA, receivedTokenSymbol) &&
            isStableCoin(spentTokenCA, spentTokenSymbol)) ||
        (isSOL(receivedTokenCA, receivedTokenSymbol) && isUSDC(spentTokenCA))
    ) {
        return 'BUY';
    }
    return 'SWAP';
}

function getTokenMetadata(token) {
    if (!isStableCoin(token)) {
        return {
            fiveMinTxn: token.info?.['5mtxn'],
            fiveMinVol: token.info?.['5mvol'],
            marketCap: token.info?.marketcap,
            pairCreatedAt: token.info?.pairCreatedAt,
            price: token.info?.price || 0,
            socials: token.info?.socials || null,
            website: token.info?.website || null,
        };
    }
    return {};
}

module.exports = {
    getTransaction,
};
