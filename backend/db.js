// 
// backend/db.js
const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectionLimit: 5
});

async function getConnection() {
  try {
    const conn = await pool.getConnection();
    return conn;
  } catch (error) {
    throw error;
  }
}

module.exports = { getConnection };
