async function fetchDexTokenData(mint) { 
    const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + mint, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json"
        },
    });
    return response.json()
}

module.exports = { 
    fetchDexTokenData
}