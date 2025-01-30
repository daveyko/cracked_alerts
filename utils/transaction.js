import { addTransaction as addTransactionRedis } from './redis';

function getTransaction(swapResult, transactionId, walletAddress) {
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
        const altTokenMarketCap = titleToken.info?.marketcap || 0;
        const altTokenPrice = titleToken.info?.price;
        const spentAmount = Math.abs(spentToken.amount).toFixed(
            spentToken.symbol === 'SOL' ? 4 : 2
        );
        const receivedAmount = Math.abs(receivedToken.amount).toFixed(
            receivedToken.symbol === 'SOL' ? 4 : 2
        );
        const transactionType = receivedToken.symbol === 'SOL' || 'USDC' ? 'SELL' : 'BUY';
        return {
            altTokenCA,
            altTokenName,
            altTokenMarketCap,
            altTokenPrice,
            boughtAmount: receivedAmount,
            boughtToken: receivedToken.symbol,
            soldAmount: spentAmount,
            soldToken: spentToken.symbol,
            transactionId,
            transactionType,
            walletName,
        };
    }
    return null;
}

export async function addTransaction(swapResult, transactionId, walletAddress) {
    try {
        await addTransactionRedis(getTransaction(swapResult, transactionId, walletAddress));
    } catch (err) {
        console.error(
            `Error writing transaction: ${transactionId}-${walletAddress} to redis. Error: ${error}`
        );
    }
}
