// 
// backend/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool(process.env.DATABASE_URL);

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