const { WALLET_NAMES } = require('../constants/walletAddresses');

const GAS_FEE_THRESHOLD = 0.01; // Ignore SOL changes below this amount when other tokens are present

module.exports = function formatSwapMessage(swapResult, signature, walletAddress) {
    const { USDC, SOL, ...otherTokens } = swapResult;
    const walletName = WALLET_NAMES[walletAddress] || walletAddress.slice(0, 4) + '...';

    let message = `🔄 <b>Cracked Swap Detected</b>\n👤 <b>${walletName} 🔄</b>\n\n`;

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

        // Add token address for the received token if it's not SOL or USDC
        console.log('receivedToken', receivedToken);
        if (receivedToken.symbol !== 'SOL' && receivedToken.symbol !== 'USDC') {
            message += `\n\n📝 Token Address: <code>${receivedToken.address}</code>`;
        }
    }

    message += `\n\n🔗 <a href="https://solscan.io/tx/${signature}">View Transaction</a>`;

    return message;
}

