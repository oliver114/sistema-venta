const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración del pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sistema_ventas',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Configuraciones adicionales para Railway
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000
});

// Función para probar la conexión
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL exitosa');
    console.log('🔗 Conectado a:', process.env.DB_HOST);
    console.log('🗄️  Base de datos:', process.env.DB_NAME);
    connection.release();
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    console.error('🔍 Verifica las variables de entorno en .env');
  }
}

// Ejecutar test de conexión
testConnection();

module.exports = pool;