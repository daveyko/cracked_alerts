const { WALLET_NAMES } = require('../constants/walletAddresses');
const { detectTokenSwap } = require('./tokenSwap');
const GAS_FEE_THRESHOLD = 0.01; // Ignore SOL changes below this amount when other tokens are present

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
        // Determine which token to show in title (non-SOL/USDC token)
        const titleToken =
            [spentToken, receivedToken].find(
                (token) => token.symbol !== 'SOL' && token.symbol !== 'USDC'
            ) || receivedToken; // Fallback to receivedToken if both are SOL/USDC
        const altTokenCA = titleToken.info?.address || titleToken.address;
        const altTokenName = titleToken.info?.name || 'Unknown';
        const altTokenPrice = titleToken.info?.price;
        const spentAmount = parseFloat(
            Math.abs(spentToken.amount).toFixed(spentToken.symbol === 'SOL' ? 4 : 2)
        );
        const receivedAmount = parseFloat(
            Math.abs(receivedToken.amount).toFixed(receivedToken.symbol === 'SOL' ? 4 : 2)
        );
        const transactionType =
            receivedToken.symbol === 'SOL' || receivedToken.symbol === 'USDC' ? 'SELL' : 'BUY';
        const altTokenAmount = transactionType === 'BUY' ? receivedAmount : spentAmount;
        const stableTokenAmount = transactionType === 'BUY' ? spentAmount : receivedAmount;
        const stableTokenSymbol =
            transactionType === 'BUY' ? spentToken.symbol : receivedToken.symbol;
        return {
            altTokenCA,
            altTokenName,
            altTokenSymbol: titleToken.symbol,
            altTokenPrice,
            altTokenAmount,
            altTokenMetadata: {
                fiveMinTxn: titleToken.info?.['5mtxn'],
                fiveMinVol: titleToken.info?.['5mvol'],
                marketCap: titleToken.info?.marketcap,
                pairCreatedAt: titleToken.info?.pairCreatedAt,
                price: titleToken.info?.price || 0,
                socials: titleToken.info?.socials || null,
                website: titleToken.info?.website || null,
            },
            blockTime: rawTransaction.blockTime ?? Math.floor(Date().now() / 1000),
            stableTokenAmount,
            stableTokenSymbol,
            transactionType,
            walletAddress,
            walletName,
        };
    }
    return null;
}

module.exports = {
    getTransaction,
};
