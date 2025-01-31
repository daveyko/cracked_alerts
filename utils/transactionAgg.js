/*
[
  {
    "walletName": "Wallet1",
    "tokens": [
      {
        "altTokenCA": "TokenA",
        "altTokenName": "symbol",
        "netAltAmount": 7,
        "netNonAltAmount": -7.5,
        "nonAltTokenName": "SOL",
        "netType": "NET BUY",
        "avgMarketCap": 6000000
      }
    ]
  }
]
*/

function aggregateTransactions(transactions) {
    const groupedData = {};

    transactions.forEach(tx => {
        const { 
            walletName, 
            altTokenCA, 
            altTokenSymbol, 
            altTokenMarketCap, 
            boughtAmount, 
            boughtToken, 
            soldAmount, 
            soldToken, 
            transactionType 
        } = tx;


        // Ensure wallet entry exists
        if (!groupedData[walletName]) {
            groupedData[walletName] = {};
        }

        // Ensure altToken entry exists under wallet
        if (!groupedData[walletName][altTokenCA]) {
            groupedData[walletName][altTokenCA] = {
                altTokenCA,
                altTokenSymbol,
                buys: { totalAltAmount: 0, totalSpent: 0, weightedMarketCapSum: 0, weightedMarketCapAmount: 0, currency: "" , count: 0},
                sells: { totalAltAmount: 0, totalReceived: 0, weightedMarketCapSum: 0, weightedMarketCapAmount: 0, currency: "", count: 0 }
            };
        }

        const entry = groupedData[walletName][altTokenCA];

        if (transactionType === "BUY") {
            entry.buys.totalAltAmount += boughtAmount;
            entry.buys.totalSpent += soldAmount; // SOL/USDC spent
            entry.buys.currency = soldToken; // SOL or USDC
            // Weighted market cap calculation
            entry.buys.weightedMarketCapSum += altTokenMarketCap * soldAmount; 
            entry.buys.weightedMarketCapAmount += soldAmount;
            entry.buys.count += 1
        } else if (transactionType === "SELL") {
            entry.sells.totalAltAmount += soldAmount;
            entry.sells.totalReceived += boughtAmount; // SOL/USDC received
            entry.sells.currency = boughtToken; // SOL or USDC
            // Weighted market cap calculation
            entry.sells.weightedMarketCapSum += altTokenMarketCap * boughtAmount; 
            entry.sells.weightedMarketCapAmount += boughtAmount;
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

module.exports = {
    aggregateTransactions
}