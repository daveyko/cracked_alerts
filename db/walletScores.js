const pool = require('./index');

async function computeWalletScores() {
    const { rows: positions } = await pool.query(`
        SELECT wallet_address, alt_token_ca, realized_profit_usd, unrealized_profit_usd, total_bought_quantity, total_sold_quantity
        FROM wallet_positions
    `);

    const walletScores = {};

    for (const row of positions) {
        const {
            wallet_address,
            alt_token_ca,
            realized_profit_usd,
            unrealized_profit_usd,
            total_bought_quantity,
            total_sold_quantity,
        } = row;

        if (!walletScores[wallet_address]) {
            const { rows } = await pool.query(
                'SELECT first_tracked FROM wallet_scores WHERE wallet_address = $1',
                [wallet_address]
            );
            const firstTracked = rows.length
                ? rows[0].first_tracked
                : Math.floor(Date.now() / 1000);
            const daysTracked = Math.max((Date.now() / 1000 - firstTracked) / 86400, 1);

            walletScores[wallet_address] = {
                total_realized_profit_usd: 0,
                total_unrealized_profit_usd: 0,
                unique_tokens_traded: new Set(),
                first_tracked: firstTracked,
                days_tracked: daysTracked,
            };
        }

        // Exclude tokens with negative holdings
        if (total_bought_quantity < total_sold_quantity) continue;

        walletScores[wallet_address].total_realized_profit_usd += realized_profit_usd;
        walletScores[wallet_address].total_unrealized_profit_usd += unrealized_profit_usd;
        walletScores[wallet_address].unique_tokens_traded.add(alt_token_ca);
    }

    for (const wallet_address in walletScores) {
        const wallet = walletScores[wallet_address];
        wallet.unique_tokens_traded = wallet.unique_tokens_traded.size;
        wallet.unique_tokens_traded_per_day = wallet.unique_tokens_traded / wallet.days_tracked;

        wallet.wallet_score =
            wallet.unique_tokens_traded_per_day > 0
                ? (wallet.total_realized_profit_usd + wallet.total_unrealized_profit_usd) /
                  wallet.unique_tokens_traded_per_day
                : 0;
    }

    return walletScores;
}

async function updateWalletScores() {
    const walletScores = await computeWalletScores();
    for (const [wallet_address, data] of Object.entries(walletScores)) {
        const {
            total_realized_profit_usd,
            total_unrealized_profit_usd,
            unique_tokens_traded,
            unique_tokens_traded_per_day,
            wallet_score,
            first_tracked,
        } = data;

        await pool.query(
            `INSERT INTO wallet_scores (wallet_address, total_realized_profit, total_unrealized_profit, total_profit, unique_tokens_traded, unique_tokens_traded_per_day, wallet_score, first_tracked, last_updated)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, EXTRACT(EPOCH FROM NOW()))
             ON CONFLICT (wallet_address) DO UPDATE 
             SET total_realized_profit = EXCLUDED.total_realized_profit,
                 total_unrealized_profit = EXCLUDED.total_unrealized_profit,
                 total_profit = EXCLUDED.total_realized_profit + EXCLUDED.total_unrealized_profit,
                 unique_tokens_traded = EXCLUDED.unique_tokens_traded,
                 unique_tokens_traded_per_day = EXCLUDED.unique_tokens_traded_per_day,
                 wallet_score = EXCLUDED.wallet_score,
                 last_updated = EXTRACT(EPOCH FROM NOW());`,
            [
                wallet_address,
                total_realized_profit_usd,
                total_unrealized_profit_usd,
                total_realized_profit_usd + total_unrealized_profit_usd,
                unique_tokens_traded,
                unique_tokens_traded_per_day,
                wallet_score,
                first_tracked,
            ]
        );
    }
}

async function getWalletScores(walletAddresses) {
    const { rows } = await pool.query(
        `SELECT wallet_address, unique_tokens_traded_per_day, total_profit, wallet_score 
         FROM wallet_scores 
         WHERE wallet_address = ANY($1)`,
        [walletAddresses]
    );
    return rows;
}

module.exports = {
    updateWalletScores,
    getWalletScores,
};
