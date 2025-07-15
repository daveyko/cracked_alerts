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
    pgm.createTable('simulated_trades', {
        id: { type: 'serial', primaryKey: true },
        original_wallet_address: { type: 'text', notNull: true },
        simulated_wallet_address: { type: 'text', notNull: true },
        token_ca: { type: 'text', notNull: true },
        entry_price_usd: { type: 'numeric', notNull: true },
        entry_timestamp: { type: 'bigint', notNull: true },
        exit_price_usd: { type: 'numeric' },
        exit_timestamp: { type: 'bigint' },
        quantity: { type: 'numeric', notNull: true },
        remaining_quantity: { type: 'numeric', notNull: true },
        original_quantity: { type: 'numeric', notNull: true },
        pnl_usd: { type: 'numeric' },
        strategy_type: { type: 'text', notNull: true },
        status: { type: 'text', notNull: true },
        created_at: { type: 'bigint', notNull: true },
        updated_at: { type: 'bigint', notNull: true },
    });

    pgm.createIndex('simulated_trades', 'simulated_wallet_address');
    pgm.createIndex('simulated_trades', 'status');
    pgm.createIndex('simulated_trades', 'strategy_type');
    pgm.createIndex('simulated_trades', ['original_wallet_address', 'token_ca']); // New index for faster lookups
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('simulated_trades');
};
