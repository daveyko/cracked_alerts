const { WALLET_NAMES } = require('../constants/walletAddresses');

const GAS_FEE_THRESHOLD = 0.01; // Ignore SOL changes below this amount when other tokens are present

module.exports = function formatSwapMessage(swapResult, signature, walletAddress) {
    const { USDC, SOL, ...otherTokens } = swapResult;
    const walletName = WALLET_NAMES[walletAddress] || walletAddress.slice(0, 4) + '...';

    let message = '';
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
            ...token
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
                    ...token
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
        const titleToken = [spentToken, receivedToken].find(token =>
            token.symbol !== 'SOL' && token.symbol !== 'USDC'
        ) || receivedToken; // Fallback to receivedToken if both are SOL/USDC


        message += `<b>Cracked Swap Detected for ${titleToken.symbol}</b>
        
<b>Token Information</b>
Name: ${titleToken.info?.name || 'Unknown'}
Symbol: ${titleToken.info?.symbol || 'Unknown'}
Socials: ${titleToken.info?.socials?.map(social =>
            `<a href="${social.url}">${social.type.charAt(0).toUpperCase() + social.type.slice(1)}</a>`
        ).join(' | ') || 'None'}
CA: <code>${titleToken.info?.address || titleToken.address}</code>
Market Cap: $${formatMarketCap(titleToken.info?.marketcap || 0)}
Price: $${(titleToken.info?.price).toLocaleString()}
5 min txns (buy / sell): ${titleToken.info?.['5mtxn']?.buys || 0} / ${titleToken.info?.['5mtxn']?.sells || 0}

Security Information
Token Age: ${titleToken.info?.pairCreatedAt ? Math.floor((Date.now() - titleToken.info.pairCreatedAt) / (1000 * 60)) : 'Unknown'}m

`

        // Security Information
        // Dev: 74BX...1kMC
        // Dev Balance: 0.00 tokens

        // Total SOL Spent: 98.70 SOL

        message += `👤 <b>${walletName}</b>\n\n`;

        const spentAmount = Math.abs(spentToken.amount).toFixed(
            spentToken.symbol === 'SOL' ? 4 : 2
        );
        const receivedAmount = Math.abs(receivedToken.amount).toFixed(
            receivedToken.symbol === 'SOL' ? 4 : 2
        );


        const spentSymbol = spentToken.symbol === 'SOL' ? '◎' :
            spentToken.symbol === 'USDC' ? '💵' : '';
        const receivedSymbol = receivedToken.symbol === 'SOL' ? '◎' :
            receivedToken.symbol === 'USDC' ? '💵' : '';

        message += `Swapped ${spentSymbol}${spentAmount} ${spentToken.symbol} for ${receivedSymbol}${receivedAmount} ${receivedToken.symbol}`;

        // Add price info if available for non-SOL/USDC tokens
        if (receivedToken.info?.price) {
            const totalValue = (Math.abs(receivedToken.amount) * receivedToken.info.price).toFixed(2);
            message += `\nToken Price: $${receivedToken.info.price.toFixed(4)} (Total: $${totalValue})`;
        }
    }

    return message;
}

function formatMarketCap(value) {
    if (value >= 1e9) {
        return (value / 1e9).toFixed(2) + 'B';
    } else if (value >= 1e6) {
        return (value / 1e6).toFixed(2) + 'M';
    } else if (value >= 1e3) {
        return (value / 1e3).toFixed(2) + 'K';
    }
    return value.toFixed(2);
}

