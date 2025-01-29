

module.exports = async function detectTokenSwap(preTokenBalances, postTokenBalances, walletAddress, preBalances, postBalances) {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const preMap = new Map();
    const postMap = new Map();
    let otherTokenMint = null;

    function populateMap(map, balances) {
        for (const balance of balances) {
            const { mint, owner, uiTokenAmount } = balance;
            if (owner === walletAddress) {
                map.set(mint, uiTokenAmount.uiAmount);
                // Identify non-USDC token
                if (mint !== USDC_MINT) {
                    otherTokenMint = mint;
                }
            }
        }
    }

    populateMap(preMap, preTokenBalances);
    populateMap(postMap, postTokenBalances);

    let tokenInfo = null;
    // If we found a non-USDC token, fetch its metadata
    if (otherTokenMint) {
        try {
            // Add a small delay before making the API call
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
                        "id": otherTokenMint,
                    }
                }),
            });
            const data = await response.json();

            // Add null checks before accessing properties
            if (data && data.result) {
                if (data.result.content && data.result.content.links) {
                }
                if (data.result.token_info && data.result.token_info.price_info) {
                }
            } else {
                console.log('No token data found:', data);
            }

            if (data && data.result && data.result.token_info) {
                tokenInfo = {
                    symbol: data.result.token_info.symbol,
                    price: data.result.token_info.price_info?.price_per_token || 0,
                    decimals: data.result.token_info.decimals
                };
            }
        } catch (error) {
            console.error('Error fetching token metadata:', error);
        }
    }

    // Get USDC changes
    const preUSDC = preMap.get(USDC_MINT) || 0;
    const postUSDC = postMap.get(USDC_MINT) || 0;
    const usdcChange = postUSDC - preUSDC;

    // Calculate SOL change from native balances
    const preSOL = preBalances[0] / 1e9; // Convert lamports to SOL
    const postSOL = postBalances[0] / 1e9;
    const solChange = postSOL - preSOL;

    // Calculate other token changes
    const preToken = preMap.get(otherTokenMint) || 0;
    const postToken = postMap.get(otherTokenMint) || 0;
    const tokenChange = postToken - preToken;

    const result = {};

    if (Math.abs(usdcChange) > 0) {
        result.USDC = {
            amount: usdcChange,
            type: usdcChange > 0 ? 'Received' : 'Spent'
        };
    }

    if (Math.abs(solChange) > 0) {
        result.SOL = {
            amount: solChange,
            type: solChange > 0 ? 'Received' : 'Spent'
        };
    }

    if (tokenChange !== 0) {
        result.TOKEN = {
            amount: tokenChange,
            type: tokenChange > 0 ? 'Received' : 'Spent',
            info: tokenInfo
        };
    }

    return result;
}
