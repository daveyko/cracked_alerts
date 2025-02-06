const { Pool, types } = require('pg');

types.setTypeParser(1700, (val) => Number(val)); // 1700 = NUMERIC
types.setTypeParser(20, (val) => Number(val)); // 20 = BIGINT

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

module.exports = pool;
