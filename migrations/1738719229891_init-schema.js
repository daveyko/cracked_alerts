/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.createTable('transactions', {
        id: 'id',
        wallet_address: { type: 'text', notNull: true },
        alt_token_ca: { type: 'text', notNull: true },
        alt_token_quantity: { type: 'numeric', notNull: true },
        alt_token_symbol: { type: 'text', notNull: true },
        alt_token_marketcap: { type: 'numeric', notNull: true },
        alt_token_price: { type: 'numeric', notNull: true },
        type: { type: 'text', notNull: true, check: "type IN ('BUY', 'SELL')" },
        stable_token_symbol: { type: 'text', notNull: true },
        stable_token_quantity: { type: 'numeric', notNull: true },
        timestamp: {
            type: 'bigint',
            notNull: true,
            default: pgm.func('EXTRACT(EPOCH FROM NOW())'),
        },
    });

    pgm.createTable(
        'wallet_positions',
        {
            wallet_address: { type: 'text', notNull: true },
            alt_token_ca: { type: 'text', notNull: true },
            total_bought_quantity: { type: 'numeric', default: 0 },
            total_bought_cost_usd: { type: 'numeric', default: 0 },
            total_sold_quantity: { type: 'numeric', default: 0 },
            total_sold_value_usd: { type: 'numeric', default: 0 },
            avg_buy_price_usd: { type: 'numeric', default: 0 },
            avg_sell_price_usd: { type: 'numeric', default: 0 },
            realized_profit_usd: { type: 'numeric', default: 0 },
            unrealized_profit_usd: { type: 'numeric', default: 0 },
            last_updated: {
                type: 'bigint',
                notNull: true,
                default: pgm.func('EXTRACT(EPOCH FROM NOW())'),
            },
        },
        {
            primaryKey: ['wallet_id', 'alt_token_ca'],
        }
    );

    pgm.createTable('wallet_scores', {
        wallet_address: { type: 'text', primaryKey: true },
        total_realized_profit: { type: 'numeric', default: 0 },
        total_unrealized_profit: { type: 'numeric', default: 0 },
        total_profit: { type: 'numeric', default: 0 },
        unique_tokens_traded: { type: 'numeric', default: 0 },
        unique_tokens_traded_per_day: { type: 'numeric', default: 0 },
        wallet_score: { type: 'numeric', default: 0 },
        first_tracked: {
            type: 'bigint',
            notNull: true,
            default: pgm.func('EXTRACT(EPOCH FROM NOW())'),
        },
        last_updated: {
            type: 'bigint',
            notNull: true,
            default: pgm.func('EXTRACT(EPOCH FROM NOW())'),
        },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('transactions');
    pgm.dropTable('wallet_positions');
    pgm.dropTable('wallet_scores');
};
