module.exports = async function detectTokenSwap(preTokenBalances, postTokenBalances, walletAddress, preBalances, postBalances) {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
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
        if (mint !== USDC_MINT) {
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                const response = await fetch('https://mainnet.helius-rpc.com/?api-key=' + process.env.HELIUS_API_KEY, {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "jsonrpc": "2.0",
                        "id": "test",
                        "method": "getAsset",
                        "params": {
                            "id": mint,
                        }
                    }),
                });
                const data = await response.json();

                if (data && data.result && data.result.token_info) {
                    tokenInfoMap.set(mint, {
                        symbol: data.result.token_info.symbol,
                        price: data.result.token_info.price_info?.price_per_token || 0,
                        decimals: data.result.token_info.decimals
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
            const tokenKey = mint === USDC_MINT ? 'USDC' : mint;
            result[tokenKey] = {
                address: mint,
                amount: change,
                type: change > 0 ? 'Received' : 'Spent',
                info: tokenInfoMap.get(mint) // Will be undefined for USDC
            };
        }
    }

    return result;
}
