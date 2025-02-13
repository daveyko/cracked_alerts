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
    // Add new column
    pgm.addColumn('wallet_scores', {
        profit_per_day: { type: 'numeric', notNull: false, default: 0 }, // New field
    });
    pgm.addColumn('wallet_scores', {
        rank: { type: 'numeric', notNull: false }, // New field
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    // Reverse changes if needed
    pgm.dropColumn('wallet_scores', 'profit_per_day');
    pgm.dropColumn('wallet_scores', 'rank');
};
