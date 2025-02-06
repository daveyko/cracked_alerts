async function fetchDexTokenData(mint) {
    const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + mint, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response.json();
}

async function fetchDexTokenDataMulti(mints) {
    const requests = mints.map(
        (mint) =>
            fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then((response) => response.json()) // Convert each response to JSON
                .catch((error) => ({ error: `Failed to fetch ${mint}: ${error.message}` })) // Handle errors gracefully
    );
    return Promise.all(requests);
}

module.exports = {
    fetchDexTokenData,
    fetchDexTokenDataMulti,
};
