module.exports = async function detectTokenSwap(preTokenBalances, postTokenBalances, walletAddress, preBalances, postBalances) {
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
    for (const mint of changedTokens) {
        if (mint !== USDC_MINT && mint !== SOL_MINT) {
            try {
                await new Promise(resolve => setTimeout(resolve, 500));


                await new Promise(resolve => setTimeout(resolve, 500));
                const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + mint, {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/json"
                    },
                });


                const data = await response.json();

                console.log('socials', data.pairs[0].info.socials)
                console.log('website', data.pairs[0].info.website)

                if (data) {
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

                // Get dev account and filter for the token and show how much % supply they have
            } catch (error) {
                console.error(`Error fetching token metadata for ${mint}:`, error);
            }
        }
    }

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
                (tokenInfo && tokenInfo.symbol ? tokenInfo.symbol : `Token-${mint.slice(0, 8)}`);
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
