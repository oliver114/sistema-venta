// backend/db.js
const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: 'localhost',
  user: 'User_system',
  password: '44763562',
  database: 'BDventas',
  port: 3307,
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
