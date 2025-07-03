const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');

// Obtener todas las ventas
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const query = `
      SELECT 
        v.id,
        v.fecha_venta,
        c.id AS cliente_id,                            -- ✅ agregado
        c.nombre AS cliente_nombre,
        c.email AS cliente_email,
        GROUP_CONCAT(CONCAT(s.nombre, ' (', vs.cantidad, ')') SEPARATOR ', ') AS servicios,
        SUM(s.precio * vs.cantidad) AS total
      FROM ventas v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN venta_servicio vs ON v.id = vs.venta_id
      JOIN servicios s ON vs.servicio_id = s.id
      GROUP BY v.id, v.fecha_venta, c.id, c.nombre, c.email
      ORDER BY v.fecha_venta DESC
    `;
    const rows = await conn.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  } finally {
    if (conn) conn.release();
  }
});

// Obtener una venta por ID con detalles
router.get('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const ventaQuery = `
      SELECT v.*, c.nombre as cliente_nombre, c.email as cliente_email, c.telefono, c.direccion
      FROM ventas v
      JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = ?
    `;
    const venta = await conn.query(ventaQuery, [req.params.id]);

    if (venta.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const serviciosQuery = `
      SELECT s.*, vs.cantidad, (s.precio * vs.cantidad) as subtotal
      FROM venta_servicio vs
      JOIN servicios s ON vs.servicio_id = s.id
      WHERE vs.venta_id = ?
    `;
    const servicios = await conn.query(serviciosQuery, [req.params.id]);

    const resultado = {
      ...venta[0],
      servicios: servicios,
      // total: servicios.reduce((sum, s) => sum + s.subtotal, 0)
      total: servicios.reduce((sum, s) => sum + Number(s.subtotal), 0)

    };

    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({ error: 'Error al obtener venta' });
  } finally {
    if (conn) conn.release();
  }
});

// Crear venta
router.post('/', async (req, res) => {
  let conn;
  try {
    const { cliente_id, servicios } = req.body;
    if (!cliente_id || !servicios || servicios.length === 0) {
      return res.status(400).json({ error: 'Cliente y servicios son requeridos' });
    }

    conn = await getConnection();
    await conn.beginTransaction();

    // 🔐 Obtener el turno activo del usuario
    const [tokenPart] = (req.headers.authorization || '').split(' ').slice(1);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(tokenPart, 'tu_clave_secreta_aqui'); // Asegúrate de usar la misma clave que en auth.js

    const turnos = await conn.query(
      'SELECT id FROM turnos_caja WHERE usuario_id = ? AND estado = "abierto"',
      [decoded.id]
    );

    const turno_id = turnos.length > 0 ? turnos[0].id : null;

    const ventaResult = await conn.query(
      'INSERT INTO ventas (cliente_id, turno_id) VALUES (?, ?)',
      [cliente_id, turno_id]
    );

    const ventaId = ventaResult.insertId;

    for (const servicio of servicios) {
      const { servicio_id, cantidad } = servicio;
      await conn.query(
        'INSERT INTO venta_servicio (venta_id, servicio_id, cantidad) VALUES (?, ?, ?)',
        [ventaId, servicio_id, cantidad]
      );
    }

    await conn.commit();

    const resumenVenta = await conn.query(`
      SELECT 
        v.id,
        v.fecha_venta,
        c.nombre as cliente_nombre,
        c.email as cliente_email,
        GROUP_CONCAT(CONCAT(s.nombre, ' (', vs.cantidad, ')') SEPARATOR ', ') as servicios,
        SUM(s.precio * vs.cantidad) as total
      FROM ventas v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN venta_servicio vs ON v.id = vs.venta_id
      JOIN servicios s ON vs.servicio_id = s.id
      WHERE v.id = ?
      GROUP BY v.id, v.fecha_venta, c.nombre, c.email
    `, [ventaId]);

    res.status(201).json(resumenVenta[0]);
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error al crear venta:', error);
    res.status(500).json({ error: 'Error al crear venta' });
  } finally {
    if (conn) conn.release();
  }
});


// Eliminar venta
router.delete('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.beginTransaction();

    await conn.query('DELETE FROM venta_servicio WHERE venta_id = ?', [req.params.id]);
    const result = await conn.query('DELETE FROM ventas WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) throw new Error('Venta no encontrada');

    await conn.commit();
    res.json({ message: 'Venta eliminada exitosamente' });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error al eliminar venta:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar venta' });
  } finally {
    if (conn) conn.release();
  }
});

// Editar venta existente
// Editar venta existente
router.put('/:id', async (req, res) => {
  let conn;
  try {
    const ventaId = req.params.id;
    const {
      cliente_nombre,
      cliente_email,
      cliente_telefono,
      cliente_direccion,
      servicios // Ejemplo: "Servicio A, Servicio B"
    } = req.body;

    conn = await getConnection();
    await conn.beginTransaction();

    // 1. Obtener el cliente_id asociado a esta venta
    const [venta] = await conn.query('SELECT cliente_id FROM ventas WHERE id = ?', [ventaId]);
    if (!venta || !venta.cliente_id) {
      throw new Error('Venta no encontrada o sin cliente asociado');
    }

    const clienteId = venta.cliente_id;

    // 2. Actualizar datos del cliente
    await conn.query(`
      UPDATE clientes
      SET nombre = ?, email = ?, telefono = ?, direccion = ?
      WHERE id = ?
    `, [cliente_nombre, cliente_email, cliente_telefono, cliente_direccion, clienteId]);

    // 3. Eliminar servicios anteriores
    await conn.query('DELETE FROM venta_servicio WHERE venta_id = ?', [ventaId]);

    // 4. Agregar nuevos servicios
    const serviciosList = servicios.split(',').map(s => s.trim());
    for (const nombre of serviciosList) {
      const [servicio] = await conn.query('SELECT id FROM servicios WHERE nombre = ?', [nombre]);
      if (!servicio || !servicio.id) {
        throw new Error(`Servicio '${nombre}' no encontrado`);
      }

      await conn.query(
        'INSERT INTO venta_servicio (venta_id, servicio_id, cantidad) VALUES (?, ?, ?)',
        [ventaId, servicio.id, 1]
      );
    }

    await conn.commit();
    res.json({ message: ' Venta actualizada correctamente' });

  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error al actualizar venta:', error);
    res.status(500).json({ error: ' Error al actualizar la venta' });
  } finally {
    if (conn) conn.release();
  }
});


// Resumen de estadísticas
router.get('/resumen/estadisticas', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    const [ventas] = await conn.query('SELECT COUNT(*) as total_ventas FROM ventas');
    const [clientes] = await conn.query('SELECT COUNT(*) as total_clientes FROM clientes');
    const [ingresos] = await conn.query(`
      SELECT SUM(s.precio * vs.cantidad) as ingresos_totales
      FROM venta_servicio vs
      JOIN servicios s ON vs.servicio_id = s.id
    `);
    const serviciosTop = await conn.query(`
      SELECT s.nombre, SUM(vs.cantidad) as total_vendido
      FROM venta_servicio vs
      JOIN servicios s ON vs.servicio_id = s.id
      GROUP BY s.id
      ORDER BY total_vendido DESC
      LIMIT 5
    `);

    res.json({
      total_ventas: Number(ventas.total_ventas),
      total_clientes: Number(clientes.total_clientes),
      ingresos_totales: Number(ingresos.ingresos_totales || 0),
      servicios_mas_vendidos: serviciosTop
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  } finally {
    if (conn) conn.release();
  }
});

// Middleware para obtener turno activo
const obtenerTurnoActivo = async (req, res, next) => {
    if (req.headers.authorization) {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = 'tu_clave_secreta_aqui'; // La misma que en auth.js
        
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            
            const [turnos] = await db.execute(
                'SELECT id FROM turnos_caja WHERE usuario_id = ? AND estado = "abierto"',
                [decoded.id]
            );
            
            if (turnos.length > 0) {
                req.turno_id = turnos[0].id;
            }
        } catch (error) {
            // No hacer nada, continuar sin turno
        }
    }
    next();
};

module.exports = router;
