const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Ép timezone chắc chắn cho mọi connection mới
pool.on('connect', async (client) => {
    try {
        await client.query(`SET timezone TO '${process.env.TZ || 'Asia/Ho_Chi_Minh'}';`);
    } catch (err) {
        console.error('❌ Failed to set timezone on connection:', err.message);
    }
});

module.exports = pool;
