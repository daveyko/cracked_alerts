const { formatCompactNumber } = require('./format')

async function formatAggMessage(data, title) {
    const { altTokenSymbol, altTokenCA } = data[0].summaries[0]

    console.log(data[0].summaries[0])
    let message = '';
    let tokenMetaData;
    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + altTokenCA, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            },
        });

        const data = await response.json();

        if (data && data.pairs && data.pairs[0]) {
            tokenMetaData = {
                name: data.pairs[0].baseToken.name,
                price: Number(data.pairs[0].priceUsd),
                '5mtxn': data.pairs[0].txns['m5'],
                '5mvol': data.pairs[0].volume['m5'],
                marketcap: data.pairs[0].marketCap,
                pairCreatedAt: data.pairs[0].pairCreatedAt,
                socials: data.pairs[0].info?.socials || null,
                website: data.pairs[0].info?.website || null,
            };
        }
    } catch (error) {
        // console.error(`Error fetching token metadata for ${altTokenCA}:`, error);
    }

    message += `<b>💉💉💉 Cracked Swap Detected for: $${altTokenSymbol} 💉💉💉</b>
<b>${title}:</b>
        
<b>Token Information</b>
Name: ${tokenMetaData?.name || 'Unknown'}
Socials: ${!!tokenMetaData?.socials ? tokenMetaData?.socials?.map(social =>
        `<a href="${social.url}">${social.type.charAt(0).toUpperCase() + social.type.slice(1)}</a>`
    ).join(' | ') : 'None'}
CA: <code>${altTokenCA}</code>
Market Cap: $${formatCompactNumber(tokenMetaData?.marketcap || 0)}
Price: $${(tokenMetaData?.price)?.toLocaleString()}
5 min txns (buy / sell): ${tokenMetaData?.['5mtxn']?.buys || 0} / ${tokenMetaData?.['5mtxn']?.sells || 0}
    
Security Information
Token Age: ${tokenMetaData?.pairCreatedAt ? Math.floor((Date.now() - tokenMetaData.pairCreatedAt) / (1000 * 60)) : 'Unknown'}m
    
    --------------------------------------------------------------------
    
    `
    data.forEach(wallet => {
        const totalTransactionCount = wallet.summaries.reduce((tokenSum, summary) => tokenSum + summary.buySummary.count + summary.sellSummary.count, 0)
        message += `\n👤 <b>${wallet.walletName}</b>\n`;
        message += `<i>Last ${totalTransactionCount} ${totalTransactionCount === 1 ? "transaction" : "transactions"}:</i>\n`;
        wallet.summaries.forEach(summary => {
            if (summary.buySummary.count > 0) {
                message += `🟢 ${Math.abs(summary.buySummary.totalNonAltAmount).toFixed(2)} ${summary.buySummary.totalNonAltSymbol} → ${formatCompactNumber(Math.abs(summary.buySummary.totalAltAmount))} <a href="https://dexscreener.com/solana/${summary.altTokenCA}">${summary.altTokenSymbol.toLowerCase()}</a> | Avg MC: ${formatCompactNumber(summary.buySummary.avgMarketCap)}\n`;
            }
            if (summary.sellSummary.count > 0) {
                message += `🔴 ${formatCompactNumber(Math.abs(summary.sellSummary.totalAltAmount))} <a href="https://dexscreener.com/solana/${summary.altTokenCA}">${summary.altTokenSymbol.toLowerCase()}</a> → ${Math.abs(summary.sellSummary.totalNonAltAmount).toFixed(2)} $${summary.sellSummary.totalNonAltSymbol.toLowerCase()} | Avg MC: ${formatCompactNumber(summary.sellSummary.avgMarketCap)}\n`;
            }
            message += `---\n`
        });
    });

    message += `\n<b>Quick Links:</b>\n`
    message += `\n<b>📊 Charts:</b> <a href="https://dexscreener.com/solana/${altTokenCA}">Dexscreener</a> | <a href="https://photon-sol.tinyastro.io/en/lp/${altTokenCA}?handle=66478257f2babf7339037">Photon</a> || BullX https://neo.bullx.io/terminal?chainId=1399811149&address=${altTokenCA}`
    message += `\n<b>🤖 Tg Bots:</b> <a href=https://t.me/achilles_trojanbot?start=r-justinrh-${altTokenCA}>Trojan</a>`
    message += `\n<b>🔍 Explorer:</b> <a href="https://solscan.io/tx/${signature}">View Transaction</a>`

    return message;
}

module.exports = {
    formatAggMessage
}