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
    pgm.addColumns('wallet_positions', {
        first_buy_timestamp: { type: 'bigint', default: null },
        first_sell_timestamp: { type: 'bigint', default: null },
        hold_duration_seconds: { type: 'bigint', default: null },
    });
    pgm.addColumns('wallet_scores', {
        avg_hold_duration_seconds: { type: 'bigint', default: null },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropColumns('wallet_positions', [
        'first_buy_timestamp',
        'first_sell_timestamp',
        'hold_duration_seconds',
    ]);
    pgm.dropColumns('wallet_scores', ['avg_hold_duration_seconds']);
};
