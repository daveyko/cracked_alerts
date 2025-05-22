const pool = require('./index');

async function computeWalletScores() {
    const { rows: positions } = await pool.query(`
        SELECT wallet_address, alt_token_ca, realized_profit_usd, unrealized_profit_usd, total_bought_quantity, total_sold_quantity, hold_duration_seconds
        FROM wallet_positions WHERE (total_bought_cost_usd >= 200 OR total_sold_value_usd >= 200)
    `);

    const walletScores = {};

    for (const row of positions) {
        const {
            wallet_address,
            alt_token_ca,
            realized_profit_usd,
            unrealized_profit_usd,
            hold_duration_seconds,
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
                profit_per_day: 0,
                unique_tokens_traded_per_day: 0,
                wallet_score: 0,
                avg_hold_duration_seconds: 0, // New field to track avg hold duration
                hold_entries: 0, // Tracks the number of tokens contributing to avg_hold_duration_seconds
                rank: 0,
            };
        }

        walletScores[wallet_address].total_realized_profit_usd += realized_profit_usd;
        walletScores[wallet_address].total_unrealized_profit_usd += unrealized_profit_usd;
        walletScores[wallet_address].unique_tokens_traded.add(alt_token_ca);

        // Only count valid hold durations (ignore null values)
        if (hold_duration_seconds !== null && hold_duration_seconds >= 0) {
            walletScores[wallet_address].avg_hold_duration_seconds += hold_duration_seconds;
            walletScores[wallet_address].hold_entries += 1;
        }
    }

    for (const wallet_address in walletScores) {
        const wallet = walletScores[wallet_address];
        wallet.unique_tokens_traded = wallet.unique_tokens_traded.size;
        wallet.unique_tokens_traded_per_day = wallet.unique_tokens_traded / wallet.days_tracked;

        // Compute profit per day
        wallet.profit_per_day =
            (wallet.total_realized_profit_usd + wallet.total_unrealized_profit_usd) /
            wallet.days_tracked;

        // Compute avg hold duration (if at least one entry exists)
        wallet.avg_hold_duration_seconds =
            wallet.hold_entries > 0
                ? Math.round(wallet.avg_hold_duration_seconds / wallet.hold_entries)
                : 0;

        // Compute wallet score
        wallet.wallet_score =
            wallet.unique_tokens_traded_per_day > 0
                ? wallet.profit_per_day / wallet.unique_tokens_traded_per_day
                : 0;
    }

    // Convert object to array for sorting
    const walletArray = Object.entries(walletScores).map(([wallet_address, data]) => ({
        wallet_address,
        ...data,
    }));

    // **Sort wallets in descending order based on wallet_score**
    walletArray.sort((a, b) => {
        // If `profit_per_day` is negative, sort by closest to zero
        if (a.profit_per_day < 0 && b.profit_per_day < 0) {
            return Math.abs(a.profit_per_day) - Math.abs(b.profit_per_day); // Sort highest negative last
        }
        return b.wallet_score - a.wallet_score; // Default sorting by highest wallet_score
    });

    // **Assign rankings after sorting**
    let rank = 1;
    for (const wallet of walletArray) {
        walletScores[wallet.wallet_address].rank = rank;
        rank++;
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
            profit_per_day,
            wallet_score,
            first_tracked,
            avg_hold_duration_seconds, // New field
            rank,
        } = data;

        await pool.query(
            `INSERT INTO wallet_scores (wallet_address, total_realized_profit, total_unrealized_profit, total_profit, unique_tokens_traded, unique_tokens_traded_per_day, profit_per_day, avg_hold_duration_seconds, wallet_score, rank, first_tracked, last_updated)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, EXTRACT(EPOCH FROM NOW()))
             ON CONFLICT (wallet_address) DO UPDATE 
             SET total_realized_profit = EXCLUDED.total_realized_profit,
                 total_unrealized_profit = EXCLUDED.total_unrealized_profit,
                 total_profit = EXCLUDED.total_realized_profit + EXCLUDED.total_unrealized_profit,
                 unique_tokens_traded = EXCLUDED.unique_tokens_traded,
                 unique_tokens_traded_per_day = EXCLUDED.unique_tokens_traded_per_day,
                 profit_per_day = EXCLUDED.profit_per_day,
                 avg_hold_duration_seconds = EXCLUDED.avg_hold_duration_seconds, 
                 wallet_score = EXCLUDED.wallet_score,
                 rank = EXCLUDED.rank,
                 last_updated = EXTRACT(EPOCH FROM NOW());`,
            [
                wallet_address,
                total_realized_profit_usd,
                total_unrealized_profit_usd,
                total_realized_profit_usd + total_unrealized_profit_usd,
                unique_tokens_traded,
                unique_tokens_traded_per_day,
                profit_per_day,
                avg_hold_duration_seconds, // Include avg hold duration in DB
                wallet_score,
                rank,
                first_tracked,
            ]
        );
    }
}

async function getWalletScores(walletAddresses, timeWindowDays = null) {
    if (!timeWindowDays) {
        const { rows } = await pool.query(
            `SELECT wallet_address, unique_tokens_traded_per_day, profit_per_day, 
                    rank, avg_hold_duration_seconds 
             FROM wallet_scores 
             WHERE wallet_address = ANY($1)`,
            [walletAddresses]
        );
        return rows;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timeWindowSeconds = timeWindowDays * 86400;

    const { rows } = await pool.query(
        `WITH windowed_metrics AS (
            SELECT 
                wallet_address,
                COUNT(DISTINCT alt_token_ca) as unique_tokens_traded,
                SUM(COALESCE(realized_profit_usd, 0) + COALESCE(unrealized_profit_usd, 0)) as total_profit,
                AVG(NULLIF(hold_duration_seconds, 0)) as avg_hold_duration_seconds
            FROM wallet_positions 
            WHERE wallet_address = ANY($1)
            AND (
                first_sell_timestamp >= $2 OR 
                first_buy_timestamp >= $2
            )
            GROUP BY wallet_address
        ),
        windowed_ranks AS (
            SELECT 
                wallet_address,
                ROW_NUMBER() OVER (
                    ORDER BY 
                        CASE 
                            WHEN total_profit < 0 THEN ABS(total_profit / NULLIF($3, 0))
                            ELSE total_profit / NULLIF($3, 0)
                        END DESC
                ) as rank
            FROM windowed_metrics
        )
        SELECT 
            w.wallet_address,
            COALESCE(m.unique_tokens_traded, 0) / NULLIF($3, 0) as unique_tokens_traded_per_day,
            COALESCE(m.total_profit, 0) / NULLIF($3, 0) as profit_per_day,
            COALESCE(r.rank, 0) as rank,
            COALESCE(m.avg_hold_duration_seconds, 0) as avg_hold_duration_seconds
        FROM wallet_scores w
        LEFT JOIN windowed_metrics m ON w.wallet_address = m.wallet_address
        LEFT JOIN windowed_ranks r ON w.wallet_address = r.wallet_address
        WHERE w.wallet_address = ANY($1)`,
        [walletAddresses, currentTimestamp - timeWindowSeconds, timeWindowDays]
    );

    return rows;
}

module.exports = {
    updateWalletScores,
    getWalletScores,
};
