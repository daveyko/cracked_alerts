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
    // Step 1: Add new columns for received and spent tokens
    pgm.addColumns('transactions', {
        received_token_ca: { type: 'text', notNull: false },
        received_token_marketcap: { type: 'numeric', notNull: false },
        received_token_price: { type: 'numeric', notNull: false },
        received_token_quantity: { type: 'numeric', notNull: false },
        received_token_symbol: { type: 'text', notNull: false },
        spent_token_ca: { type: 'text', notNull: false },
        spent_token_marketcap: { type: 'numeric', notNull: false },
        spent_token_price: { type: 'numeric', notNull: false },
        spent_token_quantity: { type: 'numeric', notNull: false },
        spent_token_symbol: { type: 'text', notNull: false },
    });

    // Step 2: Migrate existing data based on transaction type
    // Step 2: Migrate existing data based on transaction type
    pgm.sql(`
        UPDATE transactions
        SET 
            received_token_ca = 
                CASE 
                    WHEN type = 'BUY' THEN alt_token_ca
                    ELSE NULL
                END,
            received_token_marketcap = 
                CASE 
                    WHEN type = 'BUY' THEN alt_token_marketcap
                    ELSE NULL
                END,
            received_token_price = 
                CASE 
                    WHEN type = 'BUY' THEN alt_token_price
                    ELSE NULL
                END,
            received_token_quantity = 
                CASE 
                    WHEN type = 'BUY' THEN alt_token_quantity
                    WHEN type = 'SELL' THEN stable_token_quantity
                    ELSE NULL
                END,
            received_token_symbol = 
                CASE 
                    WHEN type = 'BUY' THEN alt_token_symbol
                    WHEN type = 'SELL' THEN stable_token_symbol
                    ELSE NULL
                END,
            spent_token_ca = 
                CASE 
                    WHEN type = 'SELL' THEN alt_token_ca
                    ELSE NULL
                END,
            spent_token_marketcap = 
                CASE 
                    WHEN type = 'SELL' THEN alt_token_marketcap
                    ELSE NULL
                END,
            spent_token_price = 
                CASE 
                    WHEN type = 'SELL' THEN alt_token_price
                    ELSE NULL
                END,
            spent_token_quantity = 
                CASE 
                    WHEN type = 'BUY' THEN stable_token_quantity
                    WHEN type = 'SELL' THEN alt_token_quantity
                    ELSE NULL
                END,
            spent_token_symbol = 
                CASE 
                    WHEN type = 'BUY' THEN stable_token_symbol
                    WHEN type = 'SELL' THEN alt_token_symbol
                    ELSE NULL
                END;
    `);

    // Step 3: Remove old columns
    pgm.dropColumns('transactions', [
        'alt_token_ca',
        'alt_token_quantity',
        'alt_token_symbol',
        'alt_token_marketcap',
        'alt_token_price',
        'stable_token_symbol',
        'stable_token_quantity',
    ]);

    // Step 4: Update type constraint to allow SWAP (even though it's not used yet)
    pgm.dropConstraint('transactions', 'transactions_type_check');
    pgm.addConstraint(
        'transactions',
        'transactions_type_check',
        "CHECK (type IN ('BUY', 'SELL', 'SWAP'))"
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    // Step 1: Recreate old columns
    pgm.addColumns('transactions', {
        alt_token_ca: { type: 'text', notNull: true },
        alt_token_quantity: { type: 'numeric', notNull: true },
        alt_token_symbol: { type: 'text', notNull: true },
        alt_token_marketcap: { type: 'numeric', notNull: true },
        alt_token_price: { type: 'numeric', notNull: true },
        stable_token_symbol: { type: 'text', notNull: true },
        stable_token_quantity: { type: 'numeric', notNull: true },
    });

    // Step 2: Restore data using reversed mapping
    pgm.sql(`
            UPDATE transactions
            SET 
                alt_token_ca = 
                    CASE 
                        WHEN type = 'BUY' THEN received_token_ca
                        WHEN type = 'SELL' THEN spent_token_ca
                        ELSE NULL
                    END,
                alt_token_quantity = 
                    CASE 
                        WHEN type = 'BUY' THEN received_token_quantity
                        WHEN type = 'SELL' THEN spent_token_quantity
                        ELSE NULL
                    END,
                alt_token_symbol = 
                    CASE 
                        WHEN type = 'BUY' THEN received_token_symbol
                        WHEN type = 'SELL' THEN spent_token_symbol
                        ELSE NULL
                    END,
                alt_token_marketcap = 
                    CASE 
                        WHEN type = 'BUY' THEN received_token_marketcap
                        WHEN type = 'SELL' THEN spent_token_marketcap
                        ELSE NULL
                    END,
                alt_token_price = 
                    CASE 
                        WHEN type = 'BUY' THEN received_token_price
                        WHEN type = 'SELL' THEN spent_token_price
                        ELSE NULL
                    END,
                stable_token_symbol = 
                    CASE 
                        WHEN type = 'BUY' THEN spent_token_symbol
                        WHEN type = 'SELL' THEN received_token_symbol
                        ELSE NULL
                    END,
                stable_token_quantity = 
                    CASE 
                        WHEN type = 'BUY' THEN spent_token_quantity
                        WHEN type = 'SELL' THEN received_token_quantity
                        ELSE NULL
                    END;
        `);

    // Step 3: Drop new columns
    pgm.dropColumns('transactions', [
        'received_token_ca',
        'received_token_marketcap',
        'received_token_price',
        'received_token_quantity',
        'received_token_symbol',
        'spent_token_ca',
        'spent_token_marketcap',
        'spent_token_price',
        'spent_token_quantity',
        'spent_token_symbol',
    ]);

    // Step 4: Restore type constraint to original state
    pgm.dropConstraint('transactions', 'transactions_type_check');
    pgm.addConstraint('transactions', 'transactions_type_check', "CHECK (type IN ('BUY', 'SELL'))");
};
