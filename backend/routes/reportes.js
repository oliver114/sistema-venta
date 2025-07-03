const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');

const { verifyToken } = require('../middlewares/authMiddleware');







// Ruta para reporte de fecha específica
router.get('/fecha/:fecha', async (req, res) => {
  let conn;
  try {
    const { fecha } = req.params;
    conn = await getConnection();
    const query = `
      SELECT 
        v.id,
        v.fecha_venta,
        c.nombre AS cliente_nombre,
        GROUP_CONCAT(CONCAT(s.nombre, ' (', vs.cantidad, ')') SEPARATOR ', ') AS servicios,
        SUM(s.precio * vs.cantidad) AS total
      FROM ventas v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN venta_servicio vs ON v.id = vs.venta_id
      JOIN servicios s ON vs.servicio_id = s.id
      WHERE DATE(v.fecha_venta) = ?
      GROUP BY v.id, c.nombre, v.fecha_venta
      ORDER BY v.fecha_venta DESC
    `;
    const rows = await conn.query(query, [fecha]);
    res.json(rows);
  } catch (error) {
    console.error('Error al generar reporte de fecha específica:', error);
    res.status(500).json({ error: 'Error al generar reporte de fecha específica' });
  } finally {
    if (conn) conn.release();
  }
});

// Ruta para reporte de rango de fechas
 // ← si no está ya importado

router.get('/rango/:fechaInicio/:fechaFin', verifyToken, async (req, res) => {
  let conn;
  try {
    const { fechaInicio, fechaFin } = req.params;

    // Validaciones básicas
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Fechas de inicio y fin son requeridas' });
    }

    const isValidDate = (dateString) => {
      const date = new Date(dateString);
      return date instanceof Date && !isNaN(date);
    };

    if (!isValidDate(fechaInicio) || !isValidDate(fechaFin)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    conn = await getConnection();

    const query = `
      SELECT 
        v.id,
        DATE_FORMAT(v.fecha_venta, '%Y-%m-%d %H:%i:%s') AS fecha_venta,
        c.nombre AS cliente_nombre,
        GROUP_CONCAT(CONCAT(s.nombre, ' (', vs.cantidad, ')') SEPARATOR ', ') AS servicios,
        SUM(s.precio * vs.cantidad) AS total
      FROM ventas v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN venta_servicio vs ON v.id = vs.venta_id
      JOIN servicios s ON vs.servicio_id = s.id
      WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
      GROUP BY v.id, c.nombre, v.fecha_venta
      ORDER BY v.fecha_venta DESC
    `;

    const rows = await conn.query(query, [fechaInicio, fechaFin]);

    const processedRows = rows.map(row => ({
      ...row,
      id: Number(row.id),
      total: Number(row.total)
    }));

    res.json(processedRows);

  } catch (error) {
    console.error('Error al generar reporte de rango:', error);
    res.status(500).json({ error: 'Error al generar reporte de rango', details: error.message });
  } finally {
    if (conn) conn.release();
  }
});

// Ruta para estadísticas por servicios del día
router.get('/estadisticas/hoy', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const query = `
      SELECT 
        s.nombre AS servicio,
        SUM(vs.cantidad) AS cantidad_vendida,
        s.precio,
        SUM(s.precio * vs.cantidad) AS total_servicio
      FROM ventas v
      JOIN venta_servicio vs ON v.id = vs.venta_id
      JOIN servicios s ON vs.servicio_id = s.id
      WHERE DATE(v.fecha_venta) = CURDATE()
      GROUP BY s.id, s.nombre, s.precio
      ORDER BY cantidad_vendida DESC
    `;
    const rows = await conn.query(query);
    
    const totalGeneral = rows.reduce((sum, row) => sum + parseFloat(row.total_servicio), 0);
    
    res.json({
      servicios: rows,
      totalGeneral
    });
  } catch (error) {
    console.error('Error al generar estadísticas de hoy:', error);
    res.status(500).json({ error: 'Error al generar estadísticas de hoy' });
  } finally {
    if (conn) conn.release();
  }
});


// Ruta para estadísticas por servicios de fecha específica
router.get('/estadisticas/fecha/:fecha', async (req, res) => {
  let conn;
  try {
    const { fecha } = req.params;
    conn = await getConnection();
    const query = `
      SELECT 
        s.nombre AS servicio,
        SUM(vs.cantidad) AS cantidad_vendida,
        s.precio,
        SUM(s.precio * vs.cantidad) AS total_servicio
      FROM ventas v
      JOIN venta_servicio vs ON v.id = vs.venta_id
      JOIN servicios s ON vs.servicio_id = s.id
      WHERE DATE(v.fecha_venta) = ?
      GROUP BY s.id, s.nombre, s.precio
      ORDER BY cantidad_vendida DESC
    `;
    const rows = await conn.query(query, [fecha]);
    
    // Calcular total general
    const totalGeneral = rows.reduce((sum, row) => sum + parseFloat(row.total_servicio), 0);
    
    res.json({
      servicios: rows,
      totalGeneral: totalGeneral
    });
  } catch (error) {
    console.error('Error al generar estadísticas de fecha:', error);
    res.status(500).json({ error: 'Error al generar estadísticas de fecha' });
  } finally {
    if (conn) conn.release();
  }
});

// Ruta para estadísticas por servicios de rango de fechas
router.get('/hoy/usuario', verifyToken, async (req, res) => {
  let conn;
  try {
    const turnoId = req.usuario.turno_id; // obtenlo desde el token

    if (!turnoId) {
      return res.status(400).json({ mensaje: 'No se encontró turno activo para este usuario' });
    }

    conn = await getConnection();

    // Ventas del día del turno actual
    const ventasQuery = `
      SELECT 
        v.id, 
        v.fecha_venta, 
        c.nombre AS cliente_nombre,
        GROUP_CONCAT(s.nombre SEPARATOR ', ') AS servicios,
        SUM(s.precio * vs.cantidad) AS total
      FROM ventas v
      INNER JOIN clientes c ON v.cliente_id = c.id
      INNER JOIN venta_servicio vs ON v.id = vs.venta_id
      INNER JOIN servicios s ON vs.servicio_id = s.id
      WHERE DATE(v.fecha_venta) = CURDATE() AND v.turno_id = ?
      GROUP BY v.id, v.fecha_venta, c.nombre
      ORDER BY v.fecha_venta DESC
    `;

    const ventas = await conn.query(ventasQuery, [turnoId]);

    // Resumen de ventas
    const resumenQuery = `
      SELECT 
        SUM(s.precio * vs.cantidad) AS monto_total_ventas,
        COUNT(DISTINCT v.id) AS total_ventas,
        COUNT(vs.id) AS total_servicios_vendidos
      FROM ventas v
      JOIN venta_servicio vs ON v.id = vs.venta_id
      JOIN servicios s ON vs.servicio_id = s.id
      WHERE DATE(v.fecha_venta) = CURDATE() AND v.turno_id = ?
    `;
    const [resumen] = await conn.query(resumenQuery, [turnoId]);

    res.json({
      ventas,
      resumen
    });

  } catch (error) {
    console.error('Error en /hoy/usuario:', error);
    res.status(500).json({ mensaje: 'Error interno' });
  } finally {
    if (conn) conn.release();
  }
});

// Reporte de todas las ventas del día sin usar turno
router.get('/ventas/hoy', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const query = `
      SELECT 
        v.id,
        v.fecha_venta,
        c.nombre AS cliente_nombre,
        GROUP_CONCAT(CONCAT(s.nombre, ' (', vs.cantidad, ')') SEPARATOR ', ') AS servicios,
        SUM(s.precio * vs.cantidad) AS total
      FROM ventas v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN venta_servicio vs ON v.id = vs.venta_id
      JOIN servicios s ON vs.servicio_id = s.id
      WHERE DATE(v.fecha_venta) = CURDATE()
      GROUP BY v.id, c.nombre, v.fecha_venta
      ORDER BY v.fecha_venta DESC
    `;
    const rows = await conn.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener ventas del día:', error);
    res.status(500).json({ error: 'Error al obtener ventas del día' });
  } finally {
    if (conn) conn.release();
  }
});







module.exports = router;