const { formatCompactNumber } = require('./format')

function formatAggMessage(data) {
    let message = `<b>Net Recent Trades (last 15 min):</b>\n`;
    data.forEach(wallet => {
        const totalTransactionCount = wallet.summaries.reduce((tokenSum, summary) => tokenSum + summary.buySummary.count + summary.sellSummary.count, 0)
        message += `\n👤 <b>${wallet.walletName}</b>\n`;
        message += `<i>Last ${totalTransactionCount} ${totalTransactionCount === 1 ? "transaction" : "transactions"}:</i>\n`;
        wallet.summaries.forEach(summary => {
            if (summary.buySummary.count > 0) { 
                message += `🟢 ${Math.abs(summary.buySummary.totalNonAltAmount).toFixed(2)} ${summary.buySummary.totalNonAltSymbol} → ${formatCompactNumber(Math.abs(summary.buySummary.totalAltAmount))} <a href="https://dexscreener.com/solana/${summary.altTokenCA}">${summary.altTokenSymbol.toLowerCase()}</a> | avg_mc: ${formatCompactNumber(summary.buySummary.avgMarketCap)}\n`;
            } 
            if (summary.sellSummary.count > 0) { 
                message += `🔴 ${formatCompactNumber(Math.abs(summary.sellSummary.totalAltAmount))} <a href="https://dexscreener.com/solana/${summary.altTokenCA}">${summary.altTokenSymbol.toLowerCase()}</a> → ${Math.abs(summary.sellSummary.totalNonAltAmount).toFixed(2)} $${summary.sellSummary.totalNonAltSymbol.toLowerCase()} | avg_mc: ${formatCompactNumber(summary.sellSummary.avgMarketCap)}\n`;
            }
            message += `---\n`
        });
    });
    return message;
}

module.exports = { 
    formatAggMessage
}