const pool = require('./index');

const EXACT_TAIL_WALLET = 'simulated_exact_tail_wallet';
const FIXED_POSITION_SIZE_USD = 1000;

async function createSimulatedTrade(originalTransaction) {
    const {
        wallet_address,
        received_token_ca,
        received_token_price,
        received_token_quantity,
        type,
        timestamp,
    } = originalTransaction;

    if (type === 'BUY') {
        // Original wallet: 10,000 tokens at $1 = $10,000 position
        // We want: $1,000 position
        // So we buy: 1,000 tokens at $1 = $1,000 position
        const quantity = FIXED_POSITION_SIZE_USD / received_token_price;

        await pool.query(
            `INSERT INTO simulated_trades (
                original_wallet_address,
                simulated_wallet_address,
                token_ca,
                entry_price_usd,
                entry_timestamp,
                quantity,
                remaining_quantity,
                original_quantity,
                strategy_type,
                status,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $10)`,
            [
                wallet_address,
                EXACT_TAIL_WALLET,
                received_token_ca,
                received_token_price,
                timestamp,
                quantity, // 1,000 tokens
                received_token_quantity, // 10,000 tokens (original)
                'exact_tail',
                'open',
                Math.floor(Date.now() / 1000),
            ]
        );
    } else if (type === 'SELL') {
        const { rows: openPositions } = await pool.query(
            `SELECT * FROM simulated_trades 
             WHERE original_wallet_address = $1 
             AND token_ca = $2 
             AND status = 'open'
             AND entry_timestamp < $3
             ORDER BY entry_timestamp ASC`,
            [wallet_address, received_token_ca, timestamp]
        );

        if (openPositions.length === 0) {
            return;
        }

        for (const position of openPositions) {
            // If original wallet sells 5,000 tokens (50% of 10,000)
            // We sell 500 tokens (50% of 1,000)
            const sellProportion =
                originalTransaction.spent_token_quantity / position.original_quantity;
            const sellQuantity = position.remaining_quantity * sellProportion;

            if (sellQuantity > 0) {
                const pnl = (received_token_price - position.entry_price_usd) * sellQuantity;

                await pool.query(
                    `UPDATE simulated_trades 
                     SET remaining_quantity = remaining_quantity - $1,
                         status = CASE 
                             WHEN remaining_quantity - $1 <= 0 THEN 'closed'
                             ELSE 'open'
                         END,
                         exit_price_usd = CASE 
                             WHEN remaining_quantity - $1 <= 0 THEN $2
                             ELSE NULL
                         END,
                         exit_timestamp = CASE 
                             WHEN remaining_quantity - $1 <= 0 THEN $3
                             ELSE NULL
                         END,
                         pnl_usd = CASE 
                             WHEN remaining_quantity - $1 <= 0 THEN $4
                             ELSE NULL
                         END,
                         updated_at = $5
                     WHERE id = $6`,
                    [
                        sellQuantity,
                        received_token_price,
                        timestamp,
                        pnl,
                        Math.floor(Date.now() / 1000),
                        position.id,
                    ]
                );
            }
        }
    }
}

async function getSimulatedTradeStats(days = 1) {
    const startTimestamp = Math.floor(Date.now() / 1000) - days * 86400;

    const { rows } = await pool.query(
        `SELECT 
            COUNT(*) as total_trades,
            SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_trades,
            SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_trades,
            SUM(pnl_usd) as total_pnl,
            AVG(pnl_usd) as avg_pnl,
            SUM(CASE WHEN pnl_usd > 0 THEN 1 ELSE 0 END)::float / 
            NULLIF(SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END), 0) as win_rate,
            SUM(CASE 
                WHEN status = 'open' THEN 
                    (exit_price_usd - entry_price_usd) * remaining_quantity 
                ELSE pnl_usd 
            END) as total_unrealized_pnl,
            AVG(CASE 
                WHEN status = 'open' THEN 
                    (exit_price_usd - entry_price_usd) * remaining_quantity 
                ELSE pnl_usd 
            END) as avg_unrealized_pnl
         FROM simulated_trades
         WHERE created_at >= $1`,
        [startTimestamp]
    );

    return rows[0];
}

module.exports = {
    createSimulatedTrade,
    updateSimulatedTrades,
    getSimulatedTradeStats,
};
