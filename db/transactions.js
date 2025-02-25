const pool = require('./index');

async function getRecentTransactions() {
    const query = `
        SELECT * FROM transactions
        WHERE timestamp >= EXTRACT(EPOCH FROM NOW()) - 3600
    `;
    const { rows } = await pool.query(query);
    return rows;
}

async function insertTransactions(transactions) {
    if (transactions.length === 0) return;

    const query = `
    INSERT INTO transactions (
        wallet_address, type, timestamp,
        received_token_ca, received_token_quantity, received_token_symbol,
        received_token_marketcap, received_token_price,
        spent_token_ca, spent_token_quantity, spent_token_symbol,
        spent_token_marketcap, spent_token_price
    ) VALUES ${transactions
        .map(
            (_, i) =>
                `($${i * 13 + 1}, $${i * 13 + 2}, $${i * 13 + 3}, 
                  $${i * 13 + 4}, $${i * 13 + 5}, $${i * 13 + 6}, 
                  $${i * 13 + 7}, $${i * 13 + 8}, 
                  $${i * 13 + 9}, $${i * 13 + 10}, $${i * 13 + 11}, 
                  $${i * 13 + 12}, $${i * 13 + 13})`
        )
        .join(',')}
    RETURNING id;
`;

    const values = transactions.flatMap((transaction) => [
        transaction.walletAddress, // wallet_address
        transaction.transactionType, // type ('BUY', 'SELL', or 'SWAP')
        transaction.blockTime || Math.floor(Date.now() / 1000), // timestamp in Unix seconds

        transaction.receivedTokenCA, // received_token_ca
        transaction.receivedTokenAmount, // received_token_quantity
        transaction.receivedTokenSymbol, // received_token_symbol
        transaction.receivedTokenMetadata?.marketCap || 0, // received_token_marketcap
        transaction.receivedTokenPrice, // received_token_price

        transaction.spentTokenCA, // spent_token_ca
        transaction.spentTokenAmount, // spent_token_quantity
        transaction.spentTokenSymbol, // spent_token_symbol
        transaction.spentTokenMetadata?.marketCap || 0, // spent_token_marketcap
        transaction.spentTokenPrice, // spent_token_price
    ]);

    try {
        await pool.query(query, values);
    } catch (error) {
        console.error('Error inserting transactions:', error);
    }
}

module.exports = {
    insertTransactions,
    getRecentTransactions,
};
