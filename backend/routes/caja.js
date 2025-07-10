// backend/routes/caja.js
const express = require('express');
const { getConnection } = require('../db');
const { verifyToken, verifyAdmin } = require('./auth');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_aqui';

// ✅ Verificar si hay caja abierta
router.get('/estado', verifyToken, async (req, res) => {
    let conn;
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Token inválido (sin ID de usuario)' });
        }

        conn = await getConnection();

        const turnos = await conn.query(`
            SELECT tc.*, u.nombre as nombre_usuario 
            FROM turnos_caja tc 
            JOIN usuarios u ON tc.usuario_id = u.id 
            WHERE tc.usuario_id = ? AND tc.estado = 'abierto'
            ORDER BY tc.fecha_apertura DESC 
            LIMIT 1
        `, [req.user.id]);

        if (turnos.length === 0) {
            return res.json({ cajaAbierta: false, turno: null });
        }

        const turno = turnos[0];

        const ventas = await conn.query(`
            SELECT COALESCE(SUM(s.precio * vs.cantidad), 0) AS total
            FROM ventas v
            JOIN venta_servicio vs ON v.id = vs.venta_id
            JOIN servicios s ON vs.servicio_id = s.id
            WHERE v.turno_id = ?
        `, [turno.id]);

        const totalVentas = ventas[0].total;

        const turnoSerializado = {
            ...turno,
            id: Number(turno.id),
            usuario_id: Number(turno.usuario_id),
            saldo_inicial: Number(turno.saldo_inicial),
            total_ventas: Number(totalVentas),
            saldo_final: turno.saldo_final !== null ? Number(turno.saldo_final) : null
        };

        res.json({ cajaAbierta: true, turno: turnoSerializado });

    } catch (error) {
        console.error('Error al verificar estado de caja:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) await conn.release();
    }
});

// ✅ Abrir caja
router.post('/abrir', verifyToken, async (req, res) => {
    let conn;
    try {
        const { saldo_inicial, observaciones } = req.body;
        const usuario_id = req.user.id;

        conn = await getConnection();

        await conn.query(`
            UPDATE turnos_caja
            SET estado = 'cerrado'
            WHERE usuario_id = ? AND estado = 'abierto'
        `, [usuario_id]);

        const result = await conn.query(`
            INSERT INTO turnos_caja (usuario_id, saldo_inicial, observaciones, estado, fecha_apertura)
            VALUES (?, ?, ?, 'abierto', NOW())
        `, [usuario_id, saldo_inicial, observaciones]);

        const turno_id = Number(result.insertId);

        const tokenPayload = {
            id: Number(req.user.id),
            nombre: req.user.nombre,
            rol: req.user.rol,
            turno_id
        };

        const newToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

        res.json({
            mensaje: 'Caja abierta exitosamente',
            turno_id,
            token: newToken
        });

    } catch (error) {
        console.error('Error al abrir caja:', error);
        res.status(500).json({ error: 'Error al abrir caja' });
    } finally {
        if (conn) await conn.release();
    }
});

// ✅ Cerrar caja
router.post('/cerrar', verifyToken, async (req, res) => {
    let conn;
    try {
        const { saldo_final, observaciones } = req.body;
        const usuario_id = req.user.id;

        conn = await getConnection();

        const turnos = await conn.query(
            'SELECT * FROM turnos_caja WHERE usuario_id = ? AND estado = "abierto"',
            [usuario_id]
        );

        if (turnos.length === 0) {
            return res.status(400).json({ error: 'No tienes una caja abierta' });
        }

        const turno = turnos[0];

        const ventas = await conn.query(`
            SELECT COALESCE(SUM(s.precio * vs.cantidad), 0) as total_ventas
            FROM ventas v
            JOIN venta_servicio vs ON v.id = vs.venta_id
            JOIN servicios s ON vs.servicio_id = s.id
            WHERE v.turno_id = ?
        `, [turno.id]);

        const totalVentas = ventas[0].total_ventas || 0;

        await conn.query(`
            UPDATE turnos_caja 
            SET estado = 'cerrado', 
                fecha_cierre = NOW(), 
                saldo_final = ?, 
                total_ventas = ?,
                observaciones = CONCAT(COALESCE(observaciones, ''), ' | Cierre: ', ?)
            WHERE id = ?
        `, [saldo_final, totalVentas, observaciones || '', turno.id]);

        const newToken = jwt.sign(
            { id: usuario_id, nombre: req.user.nombre, rol: req.user.rol },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Caja cerrada exitosamente',
            total_ventas: totalVentas,
            saldo_inicial: turno.saldo_inicial,
            saldo_final,
            token: newToken
        });

    } catch (error) {
        console.error('Error al cerrar caja:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) await conn.release();
    }
});

// ✅ Obtener turno activo
router.get('/turno-activo', verifyToken, async (req, res) => {
    let conn;
    try {
        conn = await getConnection();

        const turnos = await conn.query(`
            SELECT tc.*, u.nombre as nombre_usuario
            FROM turnos_caja tc 
            JOIN usuarios u ON tc.usuario_id = u.id 
            WHERE tc.usuario_id = ? AND tc.estado = 'abierto'
            ORDER BY tc.fecha_apertura DESC 
            LIMIT 1
        `, [req.user.id]);

        if (turnos.length === 0) {
            return res.status(404).json({ error: 'No hay turno activo' });
        }

        res.json(turnos[0]);

    } catch (error) {
        console.error('Error al obtener turno activo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) await conn.release();
    }
});

// ✅ Historial de turnos (admin)
router.get('/historial', verifyToken, verifyAdmin, async (req, res) => {
    let conn;
    try {
        conn = await getConnection();

        const turnos = await conn.query(`
            SELECT tc.*, u.nombre as nombre_usuario
            FROM turnos_caja tc 
            JOIN usuarios u ON tc.usuario_id = u.id 
            ORDER BY tc.fecha_apertura DESC
        `);

        res.json(turnos);

    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) await conn.release();
    }
});

// ✅ Agregar movimiento (ingreso / egreso)
router.post('/movimiento', verifyToken, async (req, res) => {
    let conn;
    try {
        const { tipo, monto, descripcion } = req.body;

        conn = await getConnection();

        const turnos = await conn.query(
            'SELECT id FROM turnos_caja WHERE usuario_id = ? AND estado = "abierto"',
            [req.user.id]
        );

        if (turnos.length === 0) {
            return res.status(400).json({ error: 'No hay caja abierta' });
        }

        await conn.query(
            'INSERT INTO movimientos_caja (turno_id, tipo, monto, descripcion) VALUES (?, ?, ?, ?)',
            [turnos[0].id, tipo, monto, descripcion]
        );

        res.json({ message: 'Movimiento registrado exitosamente' });

    } catch (error) {
        console.error('Error al registrar movimiento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) await conn.release();
    }
});

module.exports = router;
