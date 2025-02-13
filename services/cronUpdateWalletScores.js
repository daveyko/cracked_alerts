const { getRecentTransactions } = require('../db/transactions');
const { updateUnrealizedProfit, updateWalletPositions } = require('../db/walletPositions');
const { updateWalletScores } = require('../db/walletScores');
const { fetchDexTokenDataMulti } = require('../clients/dexscreener');

async function refreshWalletScores() {
    console.log('Running cumulative wallet position and score update...');
    try {
        // Step 1: Fetch transactions from last 60 minutes
        const transactions = await getRecentTransactions();
        // Step 2: Aggregate transactions
        // Step 3: Update wallet positions
        await updateWalletPositions(transactions);
        // Step 4: Update unrealized profit with real-time prices
        await updateUnrealizedProfit(fetchDexTokenDataMulti);
        // Step 5: Compute and update cumulative wallet scores
        await updateWalletScores();
        console.log('Cumulative wallet position and score update completed!');
    } catch (error) {
        console.error('Error in wallet update:', error);
    }
}

function updateWalletScoresCron() {
    setInterval(
        () => {
            refreshWalletScores();
        },
        200 * 1 * 1000
    );
}

module.exports = {
    updateWalletScoresCron,
};
