const { formatCompactNumber } = require('../utils/format')

function transactionAggByWalletToken(transactions) {
    const groupedData = {};

    transactions.forEach(tx => {
        const { 
            altTokenAmount,
            altTokenCA, 
            altTokenMetadata, 
            altTokenSymbol, 
            stableTokenAmount,
            stableTokenSymbol,
            transactionType,
            walletName, 
        } = tx;

        const { marketCap } = altTokenMetadata

        // Ensure wallet entry exists
        if (!groupedData[walletName]) {
            groupedData[walletName] = {};
        }

        // Ensure altToken entry exists under wallet
        if (!groupedData[walletName][altTokenCA]) {
            groupedData[walletName][altTokenCA] = {
                altTokenCA,
                altTokenSymbol,
                buys: { totalAltAmount: 0, totalSpent: 0, weightedMarketCapSum: 0, weightedMarketCapAmount: 0, currency: "" , count: 0 },
                sells: { totalAltAmount: 0, totalReceived: 0, weightedMarketCapSum: 0, weightedMarketCapAmount: 0, currency: "", count: 0 }
            };
        }

        const entry = groupedData[walletName][altTokenCA];

        if (transactionType === "BUY") {
            entry.buys.totalAltAmount += altTokenAmount;
            entry.buys.totalSpent += stableTokenAmount; // SOL/USDC spent
            entry.buys.currency = stableTokenSymbol; // SOL or USDC
            // Weighted market cap calculation
            entry.buys.weightedMarketCapSum += marketCap * stableTokenAmount; 
            entry.buys.weightedMarketCapAmount += stableTokenAmount;
            entry.buys.count += 1
        } else if (transactionType === "SELL") {
            entry.sells.totalAltAmount += altTokenAmount;
            entry.sells.totalReceived += stableTokenAmount; // SOL/USDC received
            entry.sells.currency = stableTokenSymbol; // SOL or USDC
            // Weighted market cap calculation
            entry.sells.weightedMarketCapSum += marketCap * stableTokenAmount; 
            entry.sells.weightedMarketCapAmount += stableTokenAmount;
            entry.sells.count += 1
        }
    });

    // Transform grouped data into a readable array format
    return Object.entries(groupedData).map(([walletName, tokens]) => ({
        walletName,
        summaries: Object.entries(tokens).map(([altTokenCA, data]) => {
            const avgBuyMarketCap = data.buys.weightedMarketCapAmount 
                ? data.buys.weightedMarketCapSum / data.buys.weightedMarketCapAmount 
                : 0;
            const avgSellMarketCap = data.sells.weightedMarketCapAmount 
                ? data.sells.weightedMarketCapSum / data.sells.weightedMarketCapAmount 
                : 0;
            return {
                altTokenCA,
                altTokenSymbol: data.altTokenSymbol,
                altTokenMetadata,
                buySummary: {
                    totalAltAmount: data.buys.totalAltAmount,
                    totalNonAltAmount: data.buys.totalSpent,
                    totalNonAltSymbol: data.buys.currency, 
                    avgMarketCap: avgBuyMarketCap,
                    count: data.buys.count
                },
                sellSummary: {
                    totalAltAmount: data.sells.totalAltAmount,
                    totalNonAltAmount: data.sells.totalReceived,
                    totalNonAltSymbol: data.sells.currency, 
                    avgMarketCap: avgSellMarketCap,
                    count: data.sells.count
                }
            };
        })
    }));
}

function transactionAggByWalletTokenMessage(data, title) {
    let message = `<b>${title}:</b>\n`;
    const tokenCaToMetadata = {}
    data.forEach(wallet => { 
        wallet.summaries.forEach(summary => { 
            if (!tokenCaToMetadata[summary.altTokenCA]) { 
                tokenCaToMetadata[altTokenCA] = { ...summary.altTokenMetadata, symbol: summary.altTokenSymbol }
            }
        })
    })
    Object.entries(tokenCaToMetadata).forEach(([altTokenCA, tokenMetaData]) => { 
        message += `
        <b>Token Information</b>
        Name: ${tokenMetaData.symbol || 'Unknown'}
        Socials: ${!!tokenMetaData.socials ? tokenMetaData.socials?.map(social =>
                `<a href="${social.url}">${social.type.charAt(0).toUpperCase() + social.type.slice(1)}</a>`
            ).join(' | ') : 'None'}
        CA: <code>${altTokenCA}</code>
        Market Cap: $${formatCompactNumber(tokenMetaData.marketCap || 0)}
        Price: $${(tokenMetaData.price)?.toLocaleString()}
        5 min txns (buy / sell): ${tokenMetaData.fiveMinTxn?.buys || 0} / ${tokenMetaData.fiveMinTxn?.sells || 0}
            
        Security Information
        Token Age: ${tokenMetaData.pairCreatedAt ? Math.floor((Date.now() - tokenMetaData.pairCreatedAt) / (1000 * 60)) : 'Unknown'}m
            
            --------------------------------------------------------------------

            `  
    })
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
    transactionAggByWalletToken, 
    transactionAggByWalletTokenMessage
}