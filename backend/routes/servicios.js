// backend/routes/servicios.js
const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');

// Obtener todos los servicios
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const rows = await conn.query('SELECT * FROM servicios ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error al obtener servicios' });
  } finally {
    if (conn) conn.release();
  }
});

// Obtener un servicio por ID
router.get('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const rows = await conn.query('SELECT * FROM servicios WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener servicio:', error);
    res.status(500).json({ error: 'Error al obtener servicio' });
  } finally {
    if (conn) conn.release();
  }
});

// Crear nuevo servicio
router.post('/', async (req, res) => {
  let conn;
  try {
    const { nombre, descripcion, precio } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del servicio es requerido' });
    }

    conn = await getConnection();
    const result = await conn.query(
      'INSERT INTO servicios (nombre, descripcion, precio) VALUES (?, ?, ?)',
      [nombre, descripcion || null, precio || 0]
    );

    const newService = await conn.query('SELECT * FROM servicios WHERE id = ?', [result.insertId]);
    res.status(201).json(newService[0]);
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ error: 'Error al crear servicio' });
  } finally {
    if (conn) conn.release();
  }
});

// Actualizar servicio
router.put('/:id', async (req, res) => {
  let conn;
  try {
    const { nombre, descripcion, precio } = req.body;
    const { id } = req.params;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del servicio es requerido' });
    }

    conn = await getConnection();
    const result = await conn.query(
      'UPDATE servicios SET nombre = ?, descripcion = ?, precio = ? WHERE id = ?',
      [nombre, descripcion || null, precio || 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const updatedService = await conn.query('SELECT * FROM servicios WHERE id = ?', [id]);
    res.json(updatedService[0]);
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  } finally {
    if (conn) conn.release();
  }
});

// Eliminar servicio
router.delete('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query('DELETE FROM servicios WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json({ message: 'Servicio eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
