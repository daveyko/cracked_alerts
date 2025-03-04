const { formatCompactNumber } = require('../utils/format');
const { formatTimeFromSeconds } = require('../utils/format');
const { WALLET_ADDRESSES } = require('../constants/walletAddresses');
const { isStableCoin, isStableCoinBuy, isStableCoinSell } = require('../utils/coinType');

function getTokenEntry(
    groupedData,
    walletAddress,
    boughtOrSoldTokenCA,
    boughtOrSoldTokenSymbol,
    spentOrReceivedTokenSymbol,
    blockTime,
    metadata
) {
    if (!groupedData[walletAddress]) {
        groupedData[walletAddress] = {};
    }
    if (!groupedData[walletAddress][boughtOrSoldTokenCA]) {
        groupedData[walletAddress][boughtOrSoldTokenCA] = {
            tokenCA: boughtOrSoldTokenCA,
            tokenSymbol: boughtOrSoldTokenSymbol,
            tokenMetadata: metadata,
            blockTime,
            buys: {
                totalBoughtAmount: 0,
                totalSpentAmount: 0,
                spentTokenSymbol: spentOrReceivedTokenSymbol,
                weightedMarketCapSum: 0,
                weightedMarketCapAmount: 0,
                count: 0,
                transactions: [],
            },
            sells: {
                totalSoldAmount: 0,
                totalReceivedAmount: 0,
                receivedTokenSymbol: spentOrReceivedTokenSymbol,
                weightedMarketCapSum: 0,
                weightedMarketCapAmount: 0,
                count: 0,
                transactions: [],
            },
        };
    }
    const entry = groupedData[walletAddress][boughtOrSoldTokenCA];
    if (entry.blockTime < blockTime) {
        entry.blockTime = blockTime;
        entry.tokenMetadata = metadata;
    }
    return entry;
}

function updateEntry(entry, type, boughtOrSoldAmount, spentOrReceivedAmount, marketCap, tx) {
    if (!entry) {
        return;
    }
    const isBuy = type === 'buy';
    const target = isBuy ? entry.buys : entry.sells;
    if (isBuy) {
        target.totalBoughtAmount += boughtOrSoldAmount;
        target.totalSpentAmount += spentOrReceivedAmount;
    } else {
        target.totalSoldAmount += boughtOrSoldAmount;
        target.totalReceivedAmount += spentOrReceivedAmount;
    }
    target.weightedMarketCapSum += marketCap * spentOrReceivedAmount;
    target.weightedMarketCapAmount += spentOrReceivedAmount;
    target.count++;
    target.transactions.push(tx);
}

async function transactionAggByWalletToken(transactions, getWalletScores) {
    const groupedData = {};
    const walletNames = {};
    const walletScores = {};
    const tokenCounts = {};

    const scores = await getWalletScores(transactions.map((t) => t.walletAddress));
    scores.forEach((r) => {
        walletScores[r.wallet_address] = {
            profitPerDay: r.profit_per_day,
            uniqueTokensPerDay: r.unique_tokens_traded_per_day,
            rank: r.rank,
            avgHoldDurationSeconds: r.avg_hold_duration_seconds,
        };
    });

    transactions.forEach((tx) => {
        const {
            receivedTokenAmount,
            receivedTokenCA,
            receivedTokenMetadata,
            receivedTokenSymbol,
            spentTokenAmount,
            spentTokenCA,
            spentTokenMetadata,
            spentTokenSymbol,
            blockTime,
            walletAddress,
            walletName,
            transactionType,
        } = tx;

        walletNames[walletAddress] = walletName;

        [receivedTokenCA, spentTokenCA].forEach((ca) => {
            tokenCounts[ca] = tokenCounts[ca] || { buys: 0, sells: 0, swapBuys: 0, swapSells: 0 };
        });

        if (transactionType === 'BUY') {
            tokenCounts[receivedTokenCA].buys++;
        } else if (transactionType === 'SELL') {
            tokenCounts[spentTokenCA].sells++;
        } else if (transactionType === 'SWAP') {
            tokenCounts[receivedTokenCA].swapBuys++;
            tokenCounts[spentTokenCA].swapSells++;
        }

        const receivedEntry =
            !isStableCoin(receivedTokenCA) || isStableCoinBuy(receivedTokenCA, spentTokenCA)
                ? getTokenEntry(
                      groupedData,
                      walletAddress,
                      receivedTokenCA,
                      receivedTokenSymbol,
                      spentTokenSymbol,
                      blockTime,
                      receivedTokenMetadata
                  )
                : null;
        const spentEntry =
            !isStableCoin(spentTokenCA) || isStableCoinSell(receivedTokenCA, spentTokenCA)
                ? getTokenEntry(
                      groupedData,
                      walletAddress,
                      spentTokenCA,
                      spentTokenSymbol,
                      receivedTokenSymbol,
                      blockTime,
                      spentTokenMetadata
                  )
                : null;

        const receivedMarketCap = receivedTokenMetadata?.marketCap || 0;
        const spentMarketCap = spentTokenMetadata?.marketCap || 0;

        if (transactionType === 'BUY') {
            updateEntry(
                receivedEntry,
                'buy',
                receivedTokenAmount,
                spentTokenAmount,
                receivedMarketCap,
                tx
            );
        } else if (transactionType === 'SELL') {
            updateEntry(
                spentEntry,
                'sell',
                spentTokenAmount,
                receivedTokenAmount,
                spentMarketCap,
                tx
            );
        } else if (transactionType === 'SWAP') {
            const receivedCounts = tokenCounts[receivedTokenCA];
            const spentCounts = tokenCounts[spentTokenCA];
            const isSellDominant = spentCounts.swapSells > receivedCounts.swapBuys;
            const isBuyDominant = receivedCounts.swapBuys > spentCounts.swapSells;

            if (isSellDominant) {
                updateEntry(
                    spentEntry,
                    'sell',
                    spentTokenAmount,
                    receivedTokenAmount,
                    spentMarketCap,
                    tx
                );
            } else if (isBuyDominant) {
                updateEntry(
                    receivedEntry,
                    'buy',
                    receivedTokenAmount,
                    spentTokenAmount,
                    receivedMarketCap,
                    tx
                );
            } else {
                updateEntry(
                    spentEntry,
                    'sell',
                    spentTokenAmount,
                    receivedTokenAmount,
                    spentMarketCap,
                    tx
                );
                updateEntry(
                    receivedEntry,
                    'buy',
                    receivedTokenAmount,
                    spentTokenAmount,
                    receivedMarketCap,
                    tx
                );
            }
        }
    });

    return Object.entries(groupedData).map(([walletAddress, tokens]) => ({
        walletAddress,
        walletName: walletNames[walletAddress],
        walletScoreData: walletScores[walletAddress],
        summaries: Object.entries(tokens).map(([tokenCA, data]) => ({
            tokenCA,
            tokenSymbol: data.tokenSymbol,
            tokenMetadata: data.tokenMetadata,
            buySummary: {
                totalBoughtAmount: data.buys.totalBoughtAmount,
                totalSpentAmount: data.buys.totalSpentAmount,
                spentTokenSymbol: data.buys.spentTokenSymbol,
                avgMarketCap: data.buys.weightedMarketCapAmount
                    ? data.buys.weightedMarketCapSum / data.buys.weightedMarketCapAmount
                    : 0,
                count: data.buys.count,
                transactions: data.buys.transactions,
            },
            latestBuyTime: data.blockTime,
            sellSummary: {
                totalSoldAmount: data.sells.totalSoldAmount,
                totalReceivedAmount: data.sells.totalReceivedAmount,
                receivedTokenSymbol: data.sells.receivedTokenSymbol,
                avgMarketCap: data.sells.weightedMarketCapAmount
                    ? data.sells.weightedMarketCapSum / data.sells.weightedMarketCapAmount
                    : 0,
                count: data.sells.count,
                transactions: data.sells.transactions,
            },
        })),
    }));
}

function getDominantTokenData(data) {
    const groupedTokens = {};
    data.forEach((wallet) => {
        const summariesLatestFirst = wallet.summaries.sort(
            (a, b) => b.latestBuyTime - a.latestBuyTime
        );
        summariesLatestFirst.forEach((summary) => {
            const tokenCA = summary.tokenCA;
            if (!groupedTokens[tokenCA]) {
                groupedTokens[tokenCA] = {
                    ...summary.tokenMetadata,
                    symbol: summary.tokenSymbol,
                    buys: 0,
                    sells: 0,
                    swapBuys: 0,
                    swapSells: 0,
                };
            }
            groupedTokens[tokenCA].buys += summary.buySummary.count;
            groupedTokens[tokenCA].sells += summary.sellSummary.count;
            summary.buySummary.transactions.forEach((tx) => {
                if (tx.transactionType === 'SWAP') groupedTokens[tokenCA].swapBuys++;
            });
            summary.sellSummary.transactions.forEach((tx) => {
                if (tx.transactionType === 'SWAP') groupedTokens[tokenCA].swapSells++;
            });
        });
    });
    const [dominantTokenData] = Object.entries(groupedTokens).sort(([_a, metaA], [_b, metaB]) => {
        const totalBuysA = metaA.buys + metaA.swapBuys;
        const totalSellsA = metaA.sells + metaA.swapSells;
        const maxA = Math.max(totalBuysA, totalSellsA);
        const totalBuysB = metaB.buys + metaB.swapBuys;
        const totalSellsB = metaB.sells + metaB.swapSells;
        const maxB = Math.max(totalBuysB, totalSellsB);
        // Sort from least to greatest
        if (maxA !== maxB) return maxB - maxA;
        // If tied, prioritize buys
        return totalBuysB - totalBuysA;
    });
    return dominantTokenData;
}

function transactionAggByWalletTokenMessage(data, title) {
    let message = '';
    const [dominantTokenCA, dominantTokenData] = getDominantTokenData(data);
    const { buys: totalBuys, sells: totalSells } = dominantTokenData;
    const transactionLabel =
        totalBuys > totalSells
            ? `<b>${title}</b> BUY 🟢🟢🟢`
            : totalSells > totalBuys
              ? `<b>${title}</b> SELL 🔴🔴🔴`
              : `<b>${title}</b> SWAP 🟡🟡🟡`;

    message += `${transactionLabel} Detected for: $${dominantTokenData.symbol || 'Unknown'} 💉💉💉
<b>Token Information</b>
Socials: ${
        dominantTokenData.socials
            ? dominantTokenData.socials
                  .map(
                      (social) =>
                          `<a href="${social.url}">${social.type.charAt(0).toUpperCase() + social.type.slice(1)}</a>`
                  )
                  .join(' | ')
            : 'None'
    }
Market Cap: $${formatCompactNumber(dominantTokenData.marketCap || 0)}
5 min txns (buy / sell): ${dominantTokenData.fiveMinTxn?.buys || 0} / ${dominantTokenData.fiveMinTxn?.sells || 0}
Token Age: ${
        dominantTokenData.pairCreatedAt
            ? Math.floor((Date.now() - dominantTokenData.pairCreatedAt) / (1000 * 60))
            : 'Unknown'
    }m
--------------------------------------------------------------------\n`;

    // Sort wallets by rank and generate wallet summary
    const sortedByWalletRank = data.sort(
        (a, b) => (a.walletScoreData?.rank || 0) - (b.walletScoreData?.rank || 0)
    );
    sortedByWalletRank.forEach((wallet) => {
        const totalTransactionCount = wallet.summaries.reduce(
            (sum, summary) => sum + summary.buySummary.count + summary.sellSummary.count,
            0
        );
        message += `\n👤 <b>${wallet.walletName}</b>\n`;
        if (wallet.walletScoreData) {
            message += `<b>Rank: ${wallet.walletScoreData.rank}/${WALLET_ADDRESSES.length}</b>\n`;
            message += `Profit/day: $${formatCompactNumber(wallet.walletScoreData.profitPerDay)}\n`;
            message += `Token Swaps/day: ${wallet.walletScoreData.uniqueTokensPerDay.toFixed(2)}\n`;
            if (wallet.walletScoreData.avgHoldDurationSeconds) {
                message += `Avg Hold Duration: ${formatTimeFromSeconds(wallet.walletScoreData.avgHoldDurationSeconds)}\n`;
            }
        }
        message += `<i>Last ${totalTransactionCount} ${totalTransactionCount === 1 ? 'transaction' : 'transactions'}:</i>\n`;
        // Track displayed transactions to avoid duplicates
        wallet.summaries.forEach((summary) => {
            // Process buys first (🟢)
            const { buySummary, sellSummary } = summary;
            if (buySummary.count > 0) {
                message += `🟢 ${formatCompactNumber(Math.abs(buySummary.totalSpentAmount))} ${buySummary.spentTokenSymbol} → ${formatCompactNumber(Math.abs(buySummary.totalBoughtAmount))} <a href="https://dexscreener.com/solana/${summary.tokenCA}">${summary.tokenSymbol.toLowerCase()}</a> | avg_mc: ${formatCompactNumber(buySummary.avgMarketCap)}\n`;
            }
            // Process sells second (🔴) note we only process the dominant tokenCA for sells -- otherwise for alt to alt swaps we get redundant data since a buy of tokenA is also a sell of tokenB
            if (sellSummary.count > 0 && summary.tokenCA === dominantTokenCA) {
                message += `🔴 ${formatCompactNumber(Math.abs(sellSummary.totalSoldAmount))} <a href="https://dexscreener.com/solana/${summary.tokenCA}">${summary.tokenSymbol.toLowerCase()}</a> → ${formatCompactNumber(Math.abs(sellSummary.totalReceivedAmount))} ${sellSummary.receivedTokenSymbol.toLowerCase()} | avg_mc: ${formatCompactNumber(sellSummary.avgMarketCap)}\n`;
            }
        });
        message += `---\n`;
    });

    message += `\n<b>Quick Links:</b>\n`;
    message += `<b>📊 Charts:</b> <a href="https://dexscreener.com/solana/${dominantTokenCA}">Dexscreener</a> | <a href="https://photon-sol.tinyastro.io/en/lp/${dominantTokenCA}?handle=66478257f2babf7339037">Photon</a> | <a href="https://neo.bullx.io/terminal?chainId=1399811149&address=${dominantTokenCA}">BullX</a>\n`;
    message += `<b>🤖 Tg Bots:</b> <a href="https://t.me/achilles_trojanbot?start=r-justinrh-${dominantTokenCA}">Trojan</a>\n`;
    message += `<b>🔍 Explorer:</b> <a href="https://solscan.io/token/${dominantTokenCA}">View Token</a>\n`;
    message += `<b>📝 CA:</b> <code>${dominantTokenCA}</code>`;
    return message;
}

module.exports = {
    transactionAggByWalletToken,
    transactionAggByWalletTokenMessage,
};
