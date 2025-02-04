async function detectTokenSwap(transaction, walletAddress, fetchTokenData) {
    const preTokenBalances = transaction.meta.preTokenBalances;
    const postTokenBalances = transaction.meta.postTokenBalances;
    const preBalances = transaction.meta.preBalances
    const postBalances = transaction.meta.postBalances
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    const preMap = new Map();
    const postMap = new Map();
    const changedTokens = new Set();

    function populateMap(map, balances) {
        for (const balance of balances) {
            const { mint, owner, uiTokenAmount } = balance;
            if (owner === walletAddress) {
                map.set(mint, uiTokenAmount.uiAmount);
                // Track all tokens that appear in either pre or post balances
                changedTokens.add(mint);
            }
        }
    }

    populateMap(preMap, preTokenBalances);
    populateMap(postMap, postTokenBalances);

    // Get token info for all changed tokens except USDC
    const tokenInfoMap = new Map();
    // Create an array of promises for all token fetches
    const tokenFetchPromises = [];

    for (const mint of changedTokens) {
        if (mint !== USDC_MINT && mint !== SOL_MINT) {
            const fetchPromise = (async () => {
                try {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const data = await fetchTokenData(mint)
                    if (data && data.pairs && data.pairs[0]) {
                        tokenInfoMap.set(mint, {
                            symbol: data.pairs[0].baseToken.symbol,
                            name: data.pairs[0].baseToken.name,
                            address: data.pairs[0].baseToken.address,
                            price: Number(data.pairs[0].priceUsd),
                            '5mtxn': data.pairs[0].txns['m5'],
                            '5mvol': data.pairs[0].volume['m5'],
                            marketcap: data.pairs[0].marketCap,
                            pairCreatedAt: data.pairs[0].pairCreatedAt,
                            socials: data.pairs[0].info?.socials || null,
                            website: data.pairs[0].info?.website || null,
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching token metadata for ${mint}:`, error);
                }
            })();
            tokenFetchPromises.push(fetchPromise);
        }
    }

    // Wait for all token fetches to complete
    await Promise.all(tokenFetchPromises);

    // Calculate SOL change from native balances
    const preSOL = preBalances[0] / 1e9;
    const postSOL = postBalances[0] / 1e9;
    const solChange = postSOL - preSOL;

    const result = {};

    // Add SOL changes if any
    if (Math.abs(solChange) > 0) {
        result.SOL = {
            amount: solChange,
            type: solChange > 0 ? 'Received' : 'Spent'
        };
    }

    // Process all token changes
    for (const mint of changedTokens) {
        const preAmount = preMap.get(mint) || 0;
        const postAmount = postMap.get(mint) || 0;
        const change = postAmount - preAmount;


        if (change !== 0) {
            const tokenInfo = tokenInfoMap.get(mint);
            // Only use tokenInfo.symbol if it exists and is not undefined
            const tokenKey = mint === USDC_MINT ? 'USDC' :
                (tokenInfo && tokenInfo.symbol);
            result[tokenKey] = {
                address: mint,
                amount: change,
                type: change > 0 ? 'Received' : 'Spent',
                info: tokenInfo // Will be undefined for USDC
            };
        }
    }
    return result;
}

function tokenSwapMessage(swapResult, signature, walletAddress) {
    const { USDC, SOL, ...otherTokens } = swapResult;
    const walletName = WALLET_NAMES[walletAddress] || walletAddress.slice(0, 4) + '...';

    let message = '';
    const spentTokens = [];
    const receivedTokens = [];

    // Sort USDC and SOL first if they exist, but ignore small SOL amounts when other tokens are present
    if (USDC) {
        if (USDC.type === 'Spent') spentTokens.push({ symbol: 'USDC', ...USDC });
        else receivedTokens.push({ symbol: 'USDC', ...USDC });
    }
    if (SOL && Math.abs(SOL.amount) > GAS_FEE_THRESHOLD) {
        if (SOL.type === 'Spent') spentTokens.push({ symbol: 'SOL', ...SOL });
        else receivedTokens.push({ symbol: 'SOL', ...SOL });
    }

    // Add other tokens
    for (const [mint, token] of Object.entries(otherTokens)) {
        const tokenData = {
            symbol: token.info?.symbol || mint.slice(0, 4) + '...',
            ...token
        };

        if (token.type === 'Spent') spentTokens.push(tokenData);
        else receivedTokens.push(tokenData);
    }

    // If we have no spent tokens yet (because we ignored SOL gas fee) but have other token movements
    if (spentTokens.length === 0 && Object.keys(otherTokens).length > 0) {
        for (const [mint, token] of Object.entries(otherTokens)) {
            if (token.type === 'Spent') {
                spentTokens.push({
                    symbol: token.info?.symbol || mint.slice(0, 4) + '...',
                    ...token
                });
                break;
            }
        }
    }

    // Format amounts
    if (spentTokens.length && receivedTokens.length) {
        const spentToken = spentTokens[0];
        const receivedToken = receivedTokens[0];

        // Determine which token to show in title (non-SOL/USDC token)
        const titleToken = [spentToken, receivedToken].find(token =>
            token.symbol !== 'SOL' && token.symbol !== 'USDC'
        ) || receivedToken; // Fallback to receivedToken if both are SOL/USDC
        message += `<b>Cracked Swap Detected for: $${titleToken.symbol}</b>
        
<b>Token Information</b>
Name: ${titleToken.info?.name || 'Unknown'}
Socials: ${!!titleToken.info?.socials ? titleToken.info?.socials?.map(social =>
            `<a href="${social.url}">${social.type.charAt(0).toUpperCase() + social.type.slice(1)}</a>`
        ).join(' | ') : 'None'}
CA: <code>${titleToken.info?.address || titleToken.address}</code>
Market Cap: $${formatCompactNumber(titleToken.info?.marketcap || 0)}
Price: $${(titleToken.info?.price)?.toLocaleString()}
5 min txns (buy / sell): ${titleToken.info?.['5mtxn']?.buys || 0} / ${titleToken.info?.['5mtxn']?.sells || 0}

Security Information
Token Age: ${titleToken.info?.pairCreatedAt ? Math.floor((Date.now() - titleToken.info.pairCreatedAt) / (1000 * 60)) : 'Unknown'}m

--------------------------------------------------------------------

`

        // Security Information
        // Dev: 74BX...1kMC
        // Dev Balance: 0.00 tokens

        // Total SOL Spent: 98.70 SOL

        message += `👤 <b>${walletName}</b>\n\n`;

        const spentAmount = Math.abs(spentToken.amount).toFixed(
            spentToken.symbol === 'SOL' ? 4 : 2
        );
        const receivedAmount = Math.abs(receivedToken.amount).toFixed(
            receivedToken.symbol === 'SOL' ? 4 : 2
        );


        const spentSymbol = spentToken.symbol === 'SOL' ? '◎' :
            spentToken.symbol === 'USDC' ? '💵' : '';
        const receivedSymbol = receivedToken.symbol === 'SOL' ? '◎' :
            receivedToken.symbol === 'USDC' ? '💵' : '';

        message += `Swapped ${spentSymbol}${spentAmount} ${spentToken.symbol} for ${receivedSymbol}${receivedAmount} ${receivedToken.symbol}`;

        // Add price info if available for non-SOL/USDC tokens
        if (receivedToken.info?.price) {
            const totalValue = (Math.abs(receivedToken.amount) * receivedToken.info.price).toFixed(2);
            message += `\nToken Price: $${receivedToken.info.price.toFixed(4)} (Total: $${totalValue})`;
        }

        // Quick Links:
        message += `\n<b>Quick Links:</b>\n`
        message += `\n<b>📊 Charts:</b> <a href="https://dexscreener.com/solana/${titleToken.info?.address || titleToken.address}">Dexscreener</a> | <a href="https://photon-sol.tinyastro.io/en/lp/${titleToken.info?.address || titleToken.address}?handle=66478257f2babf7339037">Photon</a>`
        message += `\n<b>🔍 Explorer:</b> <a href="https://solscan.io/tx/${signature}">View Transaction</a>`
    }

    return message;
}

module.exports = { 
    detectTokenSwap, 
    tokenSwapMessage
}
