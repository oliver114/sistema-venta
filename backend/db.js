// 
// backend/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 5,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

async function getConnection() {
  try {
    const conn = await pool.getConnection();
    return conn;
  } catch (error) {
    console.error('Error conectando a la base de datos:', error);
    throw error;
  }
}

module.exports = { getConnection };