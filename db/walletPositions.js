const pool = require('./index');

function aggregateTransactions(transactions) {
    const aggregated = {};

    for (const tx of transactions) {
        const { wallet_address, alt_token_ca, type, alt_token_quantity, alt_token_price } = tx;
        const key = `${wallet_address}-${alt_token_ca}`;

        if (!aggregated[key]) {
            aggregated[key] = {
                wallet_address,
                alt_token_ca,
                total_bought_quantity: 0,
                total_bought_cost_usd: 0,
                total_sold_quantity: 0,
                total_sold_value_usd: 0,
            };
        }

        if (type === 'BUY') {
            aggregated[key].total_bought_quantity += alt_token_quantity;
            aggregated[key].total_bought_cost_usd += alt_token_quantity * alt_token_price;
        } else if (type === 'SELL') {
            aggregated[key].total_sold_quantity += alt_token_quantity;
            aggregated[key].total_sold_value_usd += alt_token_quantity * alt_token_price;
        }
    }
    return aggregated;
}

async function updateWalletPositions(transactions) {
    const aggregatedData = aggregateTransactions(transactions);
    for (const data of Object.values(aggregatedData)) {
        const {
            wallet_address,
            alt_token_ca,
            total_bought_quantity,
            total_bought_cost_usd,
            total_sold_quantity,
            total_sold_value_usd,
        } = data;

        const { rows } = await pool.query(
            'SELECT * FROM wallet_positions WHERE wallet_address = $1 AND alt_token_ca = $2',
            [wallet_address, alt_token_ca]
        );

        if (rows.length > 0) {
            const current = rows[0];

            // Compute new total quantities and costs
            let new_total_bought_quantity = current.total_bought_quantity + total_bought_quantity;
            let new_total_bought_cost_usd = current.total_bought_cost_usd + total_bought_cost_usd;
            let new_total_sold_quantity = current.total_sold_quantity + total_sold_quantity;
            let new_total_sold_value_usd = current.total_sold_value_usd + total_sold_value_usd;

            // Handle case: Sell without a tracked buy
            let avg_buy_price_usd =
                new_total_bought_quantity > 0
                    ? new_total_bought_cost_usd / new_total_bought_quantity
                    : total_sold_quantity > 0
                      ? total_sold_value_usd / total_sold_quantity
                      : 0; // Assume cost basis from sell price

            // Handle case: Selling more than tracked buys
            if (new_total_sold_quantity > new_total_bought_quantity) {
                const excess_sold = new_total_sold_quantity - new_total_bought_quantity;
                console.warn(
                    `Warning: Wallet ${wallet_address} sold ${excess_sold} more tokens than tracked buys.`
                );
                new_total_sold_quantity = new_total_bought_quantity; // Limit sells to buys
            }

            // Compute profit only if valid buy data exists
            let realized_profit_usd =
                new_total_sold_quantity > 0
                    ? new_total_sold_value_usd - new_total_sold_quantity * avg_buy_price_usd
                    : 0;

            await pool.query(
                `UPDATE wallet_positions 
                 SET total_bought_quantity = $1,
                     total_bought_cost_usd = $2,
                     total_sold_quantity = $3,
                     total_sold_value_usd = $4,
                     avg_buy_price_usd = $5,
                     avg_sell_price_usd = $6,
                     realized_profit_usd = $7,
                     last_updated = EXTRACT(EPOCH FROM NOW())
                 WHERE wallet_address = $8 AND alt_token_ca = $9`,
                [
                    new_total_bought_quantity,
                    new_total_bought_cost_usd,
                    new_total_sold_quantity,
                    new_total_sold_value_usd,
                    avg_buy_price_usd,
                    new_total_sold_quantity > 0
                        ? new_total_sold_value_usd / new_total_sold_quantity
                        : 0, // Avg sell price
                    realized_profit_usd,
                    wallet_address,
                    alt_token_ca,
                ]
            );
        } else {
            // First-time entry, but check for untracked sells
            const assumed_avg_buy =
                total_sold_quantity > 0 ? total_sold_value_usd / total_sold_quantity : 0;

            await pool.query(
                `INSERT INTO wallet_positions (wallet_address, alt_token_ca, total_bought_quantity, total_bought_cost_usd, total_sold_quantity, total_sold_value_usd, avg_buy_price_usd, avg_sell_price_usd, realized_profit_usd, last_updated)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, EXTRACT(EPOCH FROM NOW()))`,
                [
                    wallet_address,
                    alt_token_ca,
                    total_bought_quantity,
                    total_bought_cost_usd,
                    total_sold_quantity,
                    total_sold_value_usd,
                    total_bought_quantity > 0
                        ? total_bought_cost_usd / total_bought_quantity
                        : assumed_avg_buy, // Handle missing buys
                    total_sold_quantity > 0 ? total_sold_value_usd / total_sold_quantity : 0, // Avg sell price
                ]
            );
        }
    }
}

async function updateUnrealizedProfit(fetchTokenDataMulti) {
    const { rows: positions } = await pool.query(`
        SELECT wallet_address, alt_token_ca, total_bought_quantity, total_sold_quantity, avg_buy_price_usd
        FROM wallet_positions WHERE total_bought_quantity > total_sold_quantity
    `);

    if (positions.length === 0) return;

    const tokenList = [...new Set(positions.map((row) => row.alt_token_ca))];
    const tokenDataList = await fetchTokenDataMulti(tokenList); // Get real-time prices
    const priceMap = {};

    tokenDataList.forEach((tokenData) => {
        if (tokenData && tokenData.pairs && tokenData.pairs[0]) {
            const baseToken = tokenData.pairs[0].baseToken;
            priceMap[baseToken.address] = Number(baseToken.priceUsd);
        }
    });

    for (const {
        wallet_address,
        alt_token_ca,
        total_bought_quantity,
        total_sold_quantity,
        avg_buy_price_usd,
    } of positions) {
        let remaining_quantity = total_bought_quantity - total_sold_quantity;

        // 🚨 Fix: If we have negative holdings, set unrealized profit to 0
        if (remaining_quantity <= 0) {
            await pool.query(
                `UPDATE wallet_positions
                 SET unrealized_profit_usd = 0, last_updated = EXTRACT(EPOCH FROM NOW())
                 WHERE wallet_address = $1 AND alt_token_ca = $2`,
                [wallet_address, alt_token_ca]
            );
            continue;
        }

        const currentPrice = priceMap[alt_token_ca] || avg_buy_price_usd; // Default to avg_buy_price if missing

        // 🚨 Fix: If `avg_buy_price_usd` is 0 (missing buy data), assume the current price as cost basis
        const assumed_avg_buy_price_usd = avg_buy_price_usd > 0 ? avg_buy_price_usd : currentPrice;

        const unrealized_profit_usd =
            remaining_quantity * (currentPrice - assumed_avg_buy_price_usd);

        await pool.query(
            `UPDATE wallet_positions
             SET unrealized_profit_usd = $1, last_updated = EXTRACT(EPOCH FROM NOW())
             WHERE wallet_address = $2 AND alt_token_ca = $3`,
            [unrealized_profit_usd, wallet_address, alt_token_ca]
        );
    }
}

module.exports = {
    updateWalletPositions,
    updateUnrealizedProfit,
};
