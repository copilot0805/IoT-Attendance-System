const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    options: `-c timezone=${process.env.TZ || 'Asia/Ho_Chi_Minh'}`,
});

module.exports = pool;
