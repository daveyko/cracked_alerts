const pool = require('./index');

async function getRecentTransactions() {
    const query = `
        SELECT * FROM transactions
        WHERE timestamp >= EXTRACT(EPOCH FROM NOW()) - 3600
    `;
    const { rows } = await pool.query(query);
    return rows;
}

// {
//     altTokenCA,
//     altTokenName,
//     altTokenSymbol: titleToken.symbol,
//     altTokenPrice,
//     altTokenAmount,
//     altTokenMetadata: {
//         fiveMinTxn: titleToken.info?.["5mtxn"],
//         fiveMinVol: titleToken.info?.["5mvol"],
//         marketCap: titleToken.info?.marketcap,
//         pairCreatedAt: titleToken.info?.pairCreatedAt,
//         price: titleToken.info?.price || 0,
//         socials: titleToken.info?.socials || null,
//         website: titleToken.info?.website || null,
//     },
//     blockTime: rawTransaction.blockTime ??  Date().now(),
//     stableTokenAmount,
//     stableTokenSymbol,
//     transactionType,
//     walletAddress,
//     walletName,
// }

async function insertTransactions(transactions) {
    if (transactions.length === 0) return;

    const query = `
    INSERT INTO transactions (
        wallet_address, alt_token_ca, alt_token_quantity, alt_token_symbol, 
        alt_token_marketcap, alt_token_price, type, stable_token_symbol, 
        stable_token_quantity, timestamp
    ) VALUES ${transactions
        .map(
            (_, i) =>
                `($${i * 10 + 1}, $${i * 10 + 2}, $${i * 10 + 3}, $${i * 10 + 4}, 
        $${i * 10 + 5}, $${i * 10 + 6}, $${i * 10 + 7}, $${i * 10 + 8}, 
        $${i * 10 + 9}, $${i * 10 + 10})`
        )
        .join(',')}
    RETURNING id;
`;

    const values = transactions.flatMap((transaction) => [
        transaction.walletAddress, // wallet_address
        transaction.altTokenCA, // alt_token_ca
        transaction.altTokenAmount, // alt_token_quantity
        transaction.altTokenSymbol, // alt_token_symbol
        transaction.altTokenMetadata.marketCap || 0, // alt_token_marketcap
        transaction.altTokenPrice, // alt_token_price
        transaction.transactionType, // type ('BUY' or 'SELL')
        transaction.stableTokenSymbol, // stable_token_symbol
        transaction.stableTokenAmount, // stable_token_quantity
        transaction.blockTime || Math.floor(Date.now() / 1000), // timestamp in Unix seconds
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
