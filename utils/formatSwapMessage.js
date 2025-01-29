module.exports = function formatSwapMessage(swapResult, signature) {
    const { USDC, SOL, TOKEN } = swapResult;
    // Only calculate amounts if USDC/SOL exists
    const usdcAmount = USDC ? Math.abs(USDC.amount).toFixed(2) : '0';
    const solAmount = SOL ? Math.abs(SOL.amount).toFixed(4) : '0';

    let message = '🔄 <b>Swap Detected</b>\n\n';

    // Handle token swaps
    if (TOKEN && TOKEN.info) {
        const tokenAmount = Math.abs(TOKEN.amount).toFixed(2);
        const tokenValue = (Math.abs(TOKEN.amount) * TOKEN.info.price).toFixed(2);
        const tokenSymbol = TOKEN.info.symbol;

        if (USDC && USDC.amount !== 0) {
            if (TOKEN.type === 'Received') {
                message += `Swapped 💵 ${usdcAmount} USDC for ${tokenAmount} ${tokenSymbol}\n`;
                message += `Token Price: $${TOKEN.info.price.toFixed(4)} (Total: $${tokenValue})`;
            } else {
                message += `Swapped ${tokenAmount} ${tokenSymbol} for 💵 ${usdcAmount} USDC\n`;
                message += `Token Price: $${TOKEN.info.price.toFixed(4)} (Total: $${tokenValue})`;
            }
        } else if (SOL && SOL.amount !== 0) {
            if (TOKEN.type === 'Received') {
                message += `Swapped ◎${solAmount} SOL for ${tokenAmount} ${tokenSymbol}\n`;
                message += `Token Price: $${TOKEN.info.price.toFixed(4)} (Total: $${tokenValue})`;
            } else {
                message += `Swapped ${tokenAmount} ${tokenSymbol} for ◎${solAmount} SOL\n`;
                message += `Token Price: $${TOKEN.info.price.toFixed(4)} (Total: $${tokenValue})`;
            }
        }
    }
    // Handle USDC/SOL swaps
    else if (USDC && SOL && USDC.amount !== 0 && SOL.amount !== 0) {
        if (USDC.type === 'Spent' && SOL.type === 'Received') {
            message += `Swapped 💵 ${usdcAmount} USDC for ◎${solAmount} SOL`;
        } else if (SOL.type === 'Spent' && USDC.type === 'Received') {
            message += `Swapped ◎${solAmount} SOL for 💵 ${usdcAmount} USDC`;
        }
    }

    message += `\n\n🔗 <a href="https://solscan.io/tx/${signature}">View Transaction</a>`;

    return message;
}

