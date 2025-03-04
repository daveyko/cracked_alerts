async function detectTokenSwap(transaction, walletAddress, fetchTokenData) {
    const preTokenBalances = transaction.meta.preTokenBalances;
    const postTokenBalances = transaction.meta.postTokenBalances;
    const preBalances = transaction.meta.preBalances;
    const postBalances = transaction.meta.postBalances;
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

    // Calculate SOL change from native balances
    const preSOL = preBalances[0] / 1e9;
    const postSOL = postBalances[0] / 1e9;
    const solChange = postSOL - preSOL;

    const result = {};

    populateMap(preMap, preTokenBalances);
    populateMap(postMap, postTokenBalances);

    // Add SOL changes if any -- fo SOL specifically we only calculate from pre/postBalances instead of preToken/postTokenBalances
    if (Math.abs(solChange) > 0) {
        preMap.set(SOL_MINT, preSOL);
        postMap.set(SOL_MINT, postSOL);
        changedTokens.add(SOL_MINT);
    }

    // Get token info for all changed tokens except USDC
    const tokenInfoMap = new Map();
    // Create an array of promises for all token fetches
    const tokenFetchPromises = [];

    for (const mint of changedTokens) {
        const fetchPromise = (async () => {
            try {
                await new Promise((resolve) => setTimeout(resolve, 500));
                const data = await fetchTokenData(mint);
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

    // Wait for all token fetches to complete
    await Promise.all(tokenFetchPromises);

    // Process all token changes
    for (const mint of changedTokens) {
        const preAmount = preMap.get(mint) || 0;
        const postAmount = postMap.get(mint) || 0;
        const change = postAmount - preAmount;

        if (change !== 0) {
            const tokenInfo = tokenInfoMap.get(mint);
            // Only use tokenInfo.symbol if it exists and is not undefined
            let tokenKey = tokenInfo && tokenInfo.symbol;
            if (!tokenKey && mint === USDC_MINT) {
                tokenKey = 'USDC';
            } else if (!tokenKey && mint === SOL_MINT) {
                tokenKey = 'SOL';
            }
            result[tokenKey] = {
                address: mint,
                amount: change,
                type: change > 0 ? 'Received' : 'Spent',
                info: tokenInfo,
            };
        }
    }
    return result;
}

module.exports = {
    detectTokenSwap,
};
