const { formatCompactNumber } = require('../utils/format');
const { formatTimeFromSeconds } = require('../utils/format');
const { WALLET_ADDRESSES } = require('../constants/walletAddresses');
const { isStableCoin, isStableCoinTransaction } = require('../utils/coinType');

function getTokenEntry(groupedData, walletAddress, tokenCA, tokenSymbol, blockTime, metadata) {
    if (!groupedData[walletAddress]) {
        groupedData[walletAddress] = {};
    }
    if (!groupedData[walletAddress][tokenCA]) {
        groupedData[walletAddress][tokenCA] = {
            altTokenCA: tokenCA,
            altTokenSymbol: tokenSymbol,
            altTokenMetadata: metadata,
            blockTime,
            buys: {
                totalAltAmount: 0,
                totalSpent: 0,
                weightedMarketCapSum: 0,
                weightedMarketCapAmount: 0,
                count: 0,
                transactions: [],
            },
            sells: {
                totalAltAmount: 0,
                totalReceived: 0,
                weightedMarketCapSum: 0,
                weightedMarketCapAmount: 0,
                count: 0,
                transactions: [],
            },
        };
    }
    const entry = groupedData[walletAddress][tokenCA];
    if (entry.blockTime < blockTime) {
        entry.blockTime = blockTime;
        entry.altTokenMetadata = metadata;
    }
    return entry;
}

// Helper to update entry for a transaction, with null check
function updateEntry(entry, type, altAmount, nonAltAmount, marketCap, tx) {
    if (!entry) {
        return; // Safely skip if entry is null (e.g., stablecoin)
    }
    const isBuy = type === 'buy';
    const target = isBuy ? entry.buys : entry.sells;
    target.totalAltAmount += altAmount;
    if (isBuy) {
        target.totalSpent += nonAltAmount;
    } else {
        target.totalReceived += nonAltAmount;
        target.weightedMarketCapSum += marketCap * nonAltAmount;
        target.weightedMarketCapAmount += nonAltAmount;
        target.count++;
        target.transactions.push(tx);
    }
}

async function transactionAggByWalletToken(transactions, getWalletScores) {
    const groupedData = {};
    const walletNames = {};
    const walletScores = {};
    const tokenCounts = {};

    // Fetch wallet scores once
    const scores = await getWalletScores(transactions.map((t) => t.walletAddress));
    scores.forEach((r) => {
        walletScores[r.wallet_address] = {
            profitPerDay: r.profit_per_day,
            uniqueTokensPerDay: r.unique_tokens_traded_per_day,
            rank: r.rank,
            avgHoldDurationSeconds: r.avg_hold_duration_seconds,
        };
    });

    // Single pass: Aggregate counts and process transactions
    transactions.forEach((tx) => {
        if (isStableCoinTransaction(tx)) {
            return;
        }

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

        // Initialize token counts
        [receivedTokenCA, spentTokenCA].forEach((ca) => {
            tokenCounts[ca] = tokenCounts[ca] || { buys: 0, sells: 0, swapBuys: 0, swapSells: 0 };
        });

        // Update counts
        if (transactionType === 'BUY') {
            tokenCounts[receivedTokenCA].buys++;
        } else if (transactionType === 'SELL') {
            tokenCounts[spentTokenCA].sells++;
        } else if (transactionType === 'SWAP') {
            tokenCounts[receivedTokenCA].swapBuys++;
            tokenCounts[spentTokenCA].swapSells++;
        }

        // Get token entries
        const receivedEntry = !isStableCoin(receivedTokenCA, receivedTokenSymbol)
            ? getTokenEntry(
                  groupedData,
                  walletAddress,
                  receivedTokenCA,
                  receivedTokenSymbol,
                  blockTime,
                  receivedTokenMetadata
              )
            : null;
        const spentEntry = !isStableCoin(spentTokenCA, spentTokenSymbol)
            ? getTokenEntry(
                  groupedData,
                  walletAddress,
                  spentTokenCA,
                  spentTokenSymbol,
                  blockTime,
                  spentTokenMetadata
              )
            : null;

        const receivedMarketCap = receivedTokenMetadata?.marketCap || 0;
        const spentMarketCap = spentTokenMetadata?.marketCap || 0;

        // Process transaction
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

    // Transform to output format
    return Object.entries(groupedData).map(([walletAddress, tokens]) => ({
        walletAddress,
        walletName: walletNames[walletAddress],
        walletScoreData: walletScores[walletAddress],
        summaries: Object.entries(tokens).map(([altTokenCA, data]) => ({
            altTokenCA,
            altTokenSymbol: data.altTokenSymbol,
            altTokenMetadata: data.altTokenMetadata,
            buySummary: {
                totalAltAmount: data.buys.totalAltAmount,
                totalNonAltAmount: data.buys.totalSpent,
                avgMarketCap: data.buys.weightedMarketCapAmount
                    ? data.buys.weightedMarketCapSum / data.buys.weightedMarketCapAmount
                    : 0,
                count: data.buys.count,
                transactions: data.buys.transactions,
            },
            sellSummary: {
                totalAltAmount: data.sells.totalAltAmount,
                totalNonAltAmount: data.sells.totalReceived,
                avgMarketCap: data.sells.weightedMarketCapAmount
                    ? data.sells.weightedMarketCapSum / data.sells.weightedMarketCapAmount
                    : 0,
                count: data.sells.count,
                transactions: data.sells.transactions,
            },
        })),
    }));
}

function transactionAggByWalletTokenMessage(data, title) {
    let message = '';
    const groupedTokens = {};

    // Aggregate token data with SWAP context
    data.forEach((wallet) => {
        wallet.summaries.forEach((summary) => {
            const tokenCA = summary.altTokenCA;
            if (!groupedTokens[tokenCA]) {
                groupedTokens[tokenCA] = {
                    ...summary.altTokenMetadata,
                    symbol: summary.altTokenSymbol,
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

    // Filter and generate token summary
    Object.entries(groupedTokens).forEach(([tokenCA, tokenMetaData]) => {
        const totalBuys = tokenMetaData.buys;
        const totalSells = tokenMetaData.sells;
        const swapBuys = tokenMetaData.swapBuys;
        const swapSells = tokenMetaData.swapSells;

        // Skip tokens that are only involved as the opposite side of a dominant SWAP pattern
        const isSwapOnlyBuy = totalBuys === swapBuys && totalSells === 0;
        const isSwapOnlySell = totalSells === swapSells && totalBuys === 0;
        const isDominant =
            (swapBuys > 1 && totalBuys > totalSells) || (swapSells > 1 && totalSells > totalBuys);
        if (!isDominant && (isSwapOnlyBuy || isSwapOnlySell)) return;

        const transactionLabel =
            totalBuys > totalSells
                ? `<b>${title}</b> BUY 🟢🟢🟢`
                : totalSells > totalBuys
                  ? `<b>${title}</b> SELL 🔴🔴🔴`
                  : `<b>${title}</b> SWAP 🟡🟡🟡`;

        message += `${transactionLabel} Detected for: $${tokenMetaData.symbol || 'Unknown'} 💉💉💉
<b>Token Information</b>
Socials: ${
            tokenMetaData.socials
                ? tokenMetaData.socials
                      .map(
                          (social) =>
                              `<a href="${social.url}">${social.type.charAt(0).toUpperCase() + social.type.slice(1)}</a>`
                      )
                      .join(' | ')
                : 'None'
        }
Market Cap: $${formatCompactNumber(tokenMetaData.marketCap || 0)}
5 min txns (buy / sell): ${tokenMetaData.fiveMinTxn?.buys || 0} / ${tokenMetaData.fiveMinTxn?.sells || 0}
Token Age: ${
            tokenMetaData.pairCreatedAt
                ? Math.floor((Date.now() - tokenMetaData.pairCreatedAt) / (1000 * 60))
                : 'Unknown'
        }m
--------------------------------------------------------------------\n`;
    });

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
        const displayedTxns = new Set();
        wallet.summaries.forEach((summary) => {
            // Process buys first (🟢)
            summary.buySummary.transactions.forEach((txn) => {
                const txnKey = `${txn.spentTokenCA}-${txn.receivedTokenCA}-${txn.blockTime}`;
                if (!displayedTxns.has(txnKey)) {
                    const emoji = txn.transactionType === 'BUY' ? '🟢' : '🟡'; // 🟡 for SWAP categorized as BUY
                    message += `${emoji} ${formatCompactNumber(txn.spentTokenAmount)} ${txn.spentTokenSymbol} → ${formatCompactNumber(txn.receivedTokenAmount)} ${txn.receivedTokenSymbol}\n`;
                    displayedTxns.add(txnKey);
                }
            });
            // Process sells second (🔴), only if not already displayed
            summary.sellSummary.transactions.forEach((txn) => {
                const txnKey = `${txn.spentTokenCA}-${txn.receivedTokenCA}-${txn.blockTime}`;
                if (!displayedTxns.has(txnKey)) {
                    const emoji = txn.transactionType === 'SELL' ? '🔴' : '🟡'; // 🟡 for SWAP categorized as SELL
                    message += `${emoji} ${formatCompactNumber(txn.spentTokenAmount)} ${txn.spentTokenSymbol} → ${formatCompactNumber(txn.receivedTokenAmount)} ${txn.receivedTokenSymbol}\n`;
                    displayedTxns.add(txnKey);
                }
            });
        });
        message += `---\n`;
    });

    const altTokenCA = Object.keys(groupedTokens)[0] || '';
    message += `\n<b>Quick Links:</b>\n`;
    message += `<b>📊 Charts:</b> <a href="https://dexscreener.com/solana/${altTokenCA}">Dexscreener</a> | <a href="https://photon-sol.tinyastro.io/en/lp/${altTokenCA}?handle=66478257f2babf7339037">Photon</a> | <a href="https://neo.bullx.io/terminal?chainId=1399811149&address=${altTokenCA}">BullX</a>\n`;
    message += `<b>🤖 Tg Bots:</b> <a href="https://t.me/achilles_trojanbot?start=r-justinrh-${altTokenCA}">Trojan</a>\n`;
    message += `<b>🔍 Explorer:</b> <a href="https://solscan.io/token/${altTokenCA}">View Token</a>\n`;
    message += `<b>📝 CA:</b> <code>${altTokenCA}</code>`;
    return message;
}

module.exports = {
    transactionAggByWalletToken,
    transactionAggByWalletTokenMessage,
};
