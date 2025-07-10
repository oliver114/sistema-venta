const mariadb = require('mariadb');
require('dotenv').config();

console.log('=== DEBUG DB CONFIG ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('=======================');

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'User_system',
  password: process.env.DB_PASSWORD || '44763562',
  database: process.env.DB_NAME || 'BDventas',
  port: process.env.DB_PORT || 3307,
  connectionLimit: 5,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000
});

// Exporta directamente la función
module.exports = { getConnection: pool.getConnection.bind(pool) };2