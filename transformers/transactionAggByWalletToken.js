const { formatCompactNumber } = require('../utils/format');
const { WALLET_ADDRESSES } = require('../constants/walletAddresses');

async function transactionAggByWalletToken(transactions, getWalletScores) {
    const groupedData = {};

    const walletScoreDataByAddress = {};
    const walletNameByAddress = {};
    const res = await getWalletScores(transactions.map((t) => t.walletAddress));
    res.forEach((r) => {
        walletScoreDataByAddress[r.wallet_address] = {
            profitPerDay: r.profit_per_day,
            uniqueTokensPerDay: r.unique_tokens_traded_per_day,
            rank: r.rank,
        };
    });

    transactions.forEach((tx) => {
        const {
            altTokenAmount,
            altTokenCA,
            altTokenMetadata,
            altTokenSymbol,
            blockTime,
            stableTokenAmount,
            stableTokenSymbol,
            transactionType,
            walletAddress,
            walletName,
        } = tx;

        walletNameByAddress[walletAddress] = walletName;
        const { marketCap } = altTokenMetadata;

        // Ensure wallet entry exists
        if (!groupedData[walletAddress]) {
            groupedData[walletAddress] = {};
        }

        // Ensure altToken entry exists under wallet
        if (!groupedData[walletAddress][altTokenCA]) {
            groupedData[walletAddress][altTokenCA] = {
                altTokenCA,
                altTokenSymbol,
                altTokenMetadata,
                blockTime,
                buys: {
                    totalAltAmount: 0,
                    totalSpent: 0,
                    weightedMarketCapSum: 0,
                    weightedMarketCapAmount: 0,
                    currency: '',
                    count: 0,
                },
                sells: {
                    totalAltAmount: 0,
                    totalReceived: 0,
                    weightedMarketCapSum: 0,
                    weightedMarketCapAmount: 0,
                    currency: '',
                    count: 0,
                },
            };
        }

        const entry = groupedData[walletAddress][altTokenCA];

        if (transactionType === 'BUY') {
            entry.buys.totalAltAmount += altTokenAmount;
            entry.buys.totalSpent += stableTokenAmount; // SOL/USDC spent
            entry.buys.currency = stableTokenSymbol; // SOL or USDC
            // Weighted market cap calculation
            entry.buys.weightedMarketCapSum += marketCap * stableTokenAmount;
            entry.buys.weightedMarketCapAmount += stableTokenAmount;
            entry.buys.count += 1;
        } else if (transactionType === 'SELL') {
            entry.sells.totalAltAmount += altTokenAmount;
            entry.sells.totalReceived += stableTokenAmount; // SOL/USDC received
            entry.sells.currency = stableTokenSymbol; // SOL or USDC
            // Weighted market cap calculation
            entry.sells.weightedMarketCapSum += marketCap * stableTokenAmount;
            entry.sells.weightedMarketCapAmount += stableTokenAmount;
            entry.sells.count += 1;
        }
        // update with the latest txn metadata since early might be missing MC
        if (entry.blockTime < blockTime) {
            entry.blockTime = blockTime;
            entry.altTokenMetadata = altTokenMetadata;
        }
    });

    // Transform grouped data into a readable array format
    return Object.entries(groupedData).map(([walletAddress, tokens]) => ({
        walletAddress,
        walletName: walletNameByAddress[walletAddress],
        walletScoreData: walletScoreDataByAddress[walletAddress],
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
                altTokenMetadata: data.altTokenMetadata,
                buySummary: {
                    totalAltAmount: data.buys.totalAltAmount,
                    totalNonAltAmount: data.buys.totalSpent,
                    totalNonAltSymbol: data.buys.currency,
                    avgMarketCap: avgBuyMarketCap,
                    count: data.buys.count,
                },
                latestBuyTime: data.blockTime,
                sellSummary: {
                    totalAltAmount: data.sells.totalAltAmount,
                    totalNonAltAmount: data.sells.totalReceived,
                    totalNonAltSymbol: data.sells.currency,
                    avgMarketCap: avgSellMarketCap,
                    count: data.sells.count,
                },
            };
        }),
    }));
}

function transactionAggByWalletTokenMessage(data, title) {
    let message = '';
    const tokenCaToMetadata = {};
    for (let i = data.length - 1; i >= 0; i--) {
        const wallet = data[i];
        const summariesLatestFirst = wallet.summaries.sort(
            (a, b) => b.latestBuyTime - a.latestBuyTime
        );
        summariesLatestFirst.forEach((summary) => {
            if (!tokenCaToMetadata[summary.altTokenCA]) {
                tokenCaToMetadata[summary.altTokenCA] = {
                    ...summary.altTokenMetadata,
                    symbol: summary.altTokenSymbol,
                };
            }
        });
    }
    Object.entries(tokenCaToMetadata).forEach(([_, tokenMetaData]) => {
        message += `${data[0].summaries[0].buySummary.count > 0 ? `🟢🟢🟢 <b>${title}</b> BUY` : data[0].summaries[0].sellSummary.count > 0 ? `🔴🔴🔴 <b>${title}</b> SELL` : '🟡🟡🟡 STABLE (probably)'} Swap Detected for: $${tokenMetaData.symbol || 'Unknown'} 💉💉💉
<b>Token Information</b>
Socials: ${
            !!tokenMetaData.socials
                ? tokenMetaData.socials
                      ?.map(
                          (social) =>
                              `<a href="${social.url}">${social.type.charAt(0).toUpperCase() + social.type.slice(1)}</a>`
                      )
                      .join(' | ')
                : 'None'
        }
Market Cap: $${formatCompactNumber(tokenMetaData.marketCap || 0)}
5 min txns (buy / sell): ${tokenMetaData.fiveMinTxn?.buys || 0} / ${tokenMetaData.fiveMinTxn?.sells || 0}
Token Age: ${tokenMetaData.pairCreatedAt ? Math.floor((Date.now() - tokenMetaData.pairCreatedAt) / (1000 * 60)) : 'Unknown'}m
    --------------------------------------------------------------------
            `;
    });
    const sortedByWalletRank = data
        .slice()
        .sort((a, b) => a.walletScoreData.rank - b.walletScoreData.rank);
    sortedByWalletRank.forEach((wallet) => {
        const totalTransactionCount = wallet.summaries.reduce(
            (tokenSum, summary) => tokenSum + summary.buySummary.count + summary.sellSummary.count,
            0
        );
        message += `\n👤 <b>${wallet.walletName}</b>\n`;
        if (wallet.walletScoreData) {
            message += `\nprofit/day: $${formatCompactNumber(wallet.walletScoreData.profitPerDay)}\n`;
            message += `tokenSwaps/day: ${wallet.walletScoreData.uniqueTokensPerDay.toFixed(2)}\n`;
            message += `<b>rank: ${wallet.walletScoreData.rank}/${WALLET_ADDRESSES.length}</b>\n`;
        }
        message += `\n<i>Last ${totalTransactionCount} ${totalTransactionCount === 1 ? 'transaction' : 'transactions'}:</i>\n`;
        wallet.summaries.forEach((summary) => {
            if (summary.buySummary.count > 0) {
                message += `🟢 ${formatCompactNumber(Math.abs(summary.buySummary.totalNonAltAmount))} ${summary.buySummary.totalNonAltSymbol} → ${formatCompactNumber(Math.abs(summary.buySummary.totalAltAmount))} <a href="https://dexscreener.com/solana/${summary.altTokenCA}">${summary.altTokenSymbol.toLowerCase()}</a> | avg_mc: ${formatCompactNumber(summary.buySummary.avgMarketCap)}\n`;
            }
            if (summary.sellSummary.count > 0) {
                message += `🔴 ${formatCompactNumber(Math.abs(summary.sellSummary.totalAltAmount))} <a href="https://dexscreener.com/solana/${summary.altTokenCA}">${summary.altTokenSymbol.toLowerCase()}</a> → ${formatCompactNumber(Math.abs(summary.sellSummary.totalNonAltAmount))} $${summary.sellSummary.totalNonAltSymbol.toLowerCase()} | avg_mc: ${formatCompactNumber(summary.sellSummary.avgMarketCap)}\n`;
            }
            message += `---\n`;
        });
    });

    const altTokenCA = Object.keys(tokenCaToMetadata)[0];

    message += `\n<b>Quick Links:</b>\n`;
    message += `\n<b>📊 Charts:</b> <a href="https://dexscreener.com/solana/${altTokenCA}">Dexscreener</a> | <a href="https://photon-sol.tinyastro.io/en/lp/${altTokenCA}?handle=66478257f2babf7339037">Photon</a> | <a href="https://neo.bullx.io/terminal?chainId=1399811149&address=${altTokenCA}">BullX</a>`;
    message += `\n<b>🤖 Tg Bots:</b> <a href="https://t.me/achilles_trojanbot?start=r-justinrh-${altTokenCA}">Trojan</a>`;
    message += `\n<b>🔍 Explorer:</b> <a href="https://solscan.io/token/${altTokenCA}">View Token</a>`;
    message += `\n<b>📝 CA:</b> <code>${altTokenCA}</code>`;
    return message;
}

module.exports = {
    transactionAggByWalletToken,
    transactionAggByWalletTokenMessage,
};
