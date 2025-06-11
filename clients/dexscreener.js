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
    const BATCH_SIZE = 3; // Process 3 tokens at a time (safe for 2 vCPUs)
    const DELAY_BETWEEN_BATCHES = 1500; // 1.5 second delay between batches
    const results = [];

    // Process mints in batches
    for (let i = 0; i < mints.length; i += BATCH_SIZE) {
        const batch = mints.slice(i, i + BATCH_SIZE);

        // Process current batch
        const batchPromises = batch.map((mint) =>
            fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then((response) => response.json())
                .catch((error) => ({
                    error: `Failed to fetch ${mint}: ${error.message}`,
                    mint,
                }))
        );

        // Wait for current batch to complete
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches if there are more batches to process
        if (i + BATCH_SIZE < mints.length) {
            await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
    }

    return results;
}

module.exports = {
    fetchDexTokenData,
    fetchDexTokenDataMulti,
};
