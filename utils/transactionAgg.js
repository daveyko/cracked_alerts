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
    // Group by walletName
    const groupedByWallet = transactions.reduce((acc, tx) => {
        if (!acc[tx.walletName]) {
            acc[tx.walletName] = {};
        }

        const tokenGroup = acc[tx.walletName];

        // Group by altTokenCA
        if (!tokenGroup[tx.altTokenCA]) {
            tokenGroup[tx.altTokenCA] = {
                altTokenCA: tx.altTokenCA,
                altTokenName: tx.altTokenSymbol,
                totalAltBought: 0,
                totalAltSold: 0,
                totalNonAltSpent: 0, // Amount of SOL/USDC spent or received
                nonAltTokenName: tx.soldToken === tx.altTokenSymbol ? tx.boughtToken : tx.soldToken,
                weightedMarketCapSum: 0,
                weightedMarketCapCount: 0,
                avgMarketCap: 0
            };
        }

        const tokenData = tokenGroup[tx.altTokenCA];

        if (tx.transactionType === "BUY") {
            tokenData.totalAltBought += tx.boughtAmount;
            tokenData.totalNonAltSpent -= tx.soldAmount; // Non-alt token spent (e.g., SOL/USDC)
        } else if (tx.transactionType === "SELL") {
            tokenData.totalAltSold += tx.soldAmount;
            tokenData.totalNonAltSpent += tx.boughtAmount; // Non-alt token received (e.g., SOL/USDC)
        }

        // Calculate weighted market cap
        tokenData.weightedMarketCapSum += tx.altTokenMarketCap * (tx.boughtAmount + tx.soldAmount);
        tokenData.weightedMarketCapCount += (tx.boughtAmount + tx.soldAmount);

        return acc;
    }, {});

    // Convert to a readable array format
    return Object.entries(groupedByWallet).map(([walletName, tokens]) => ({
        walletName,
        tokens: Object.values(tokens).map(token => ({
            altTokenCA: token.altTokenCA,
            altTokenName: token.altTokenName,
            netAltAmount: token.totalAltBought - token.totalAltSold, // Net buy/sell of alt token
            netNonAltAmount: token.totalNonAltSpent, // Net SOL/USDC spent or received
            nonAltTokenName: token.nonAltTokenName, // Name of non-alt token (SOL/USDC)
            netType: token.totalAltBought - token.totalAltSold > 0 ? "NET BUY" : token.totalAltBought - token.totalAltSold < 0 ? "NET SELL" : "NEUTRAL",
            avgMarketCap: token.weightedMarketCapCount > 0
                ? token.weightedMarketCapSum / token.weightedMarketCapCount
                : 0
        })).sort((a, b) => Math.abs(b.netAltAmount) - Math.abs(a.netAltAmount)) // Sort by largest net transaction
    }));
}

module.exports = {
    aggregateTransactions
}