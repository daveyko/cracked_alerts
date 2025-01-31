const { formatCompactNumber } = require('./format')

function formatAggMessage(data) {
    let message = `<b>Recent Trades (last 5 min):</b>\n`;
    data.forEach(wallet => {
        message += `\n👤 <b>${wallet.walletName}</b>\n`;
        message += `<i>Last ${wallet.tokens.length} ${wallet.tokens.length === 1 ? "transaction" : "transactions"}:</i>\n`;
        wallet.tokens.forEach(token => {
            if (token.netType === "NET BUY") { 
                message += `🟢 ${Math.abs(token.netNonAltAmount).toFixed(2)} ${token.nonAltTokenName} → ${formatCompactNumber(Math.abs(token.netAltAmount))} $${token.altTokenName.toLowerCase()} | avg_mc: ${formatCompactNumber(token.avgMarketCap)}\n`;
            } else if (token.netType === "NET SELL") { 
                message += `🔴 ${formatCompactNumber(Math.abs(token.netAltAmount))} ${token.altTokenName} → ${Math.abs(token.netNonAltAmount).toFixed(2)} $${token.nonAltTokenName.toLowerCase()} | avg_mc: ${formatCompactNumber(token.avgMarketCap)}\n`;
            }
        });
    });
    return message;
}

module.exports = { 
    formatAggMessage
}