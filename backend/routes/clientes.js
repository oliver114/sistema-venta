// backend/routes/clientes.js
const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');

// Obtener todos los clientes
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const rows = await conn.query('SELECT id, nombre, email, telefono, direccion, dni FROM clientes ORDER BY fecha_registro DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  } finally {
    if (conn) conn.release();
  }
});

// Buscar cliente por DNI
router.get('/buscar/:dni', async (req, res) => {
  let conn;
  try {
    const { dni } = req.params;

    conn = await getConnection();
    const rows = await conn.query('SELECT * FROM clientes WHERE dni = ?', [dni]);

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    }

    res.json({ cliente: rows[0] });

  } catch (error) {
    console.error('Error al buscar cliente por DNI:', error);
    res.status(500).json({ error: 'Error al buscar cliente' });
  } finally {
    if (conn) conn.release();
  }
});

// Obtener un cliente por ID
router.get('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const rows = await conn.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  } finally {
    if (conn) conn.release();
  }
});

// Crear nuevo cliente
router.post('/', async (req, res) => {
  let conn;
  try {
    const { nombre, email, telefono, direccion, dni } = req.body;
    
    if (!nombre || !email || !dni) {
      return res.status(400).json({ error: 'Nombre, email y DNI son requeridos' });
    }

    conn = await getConnection();

    const existingEmail = await conn.query('SELECT id FROM clientes WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const existingDni = await conn.query('SELECT id FROM clientes WHERE dni = ?', [dni]);
    if (existingDni.length > 0) {
      return res.status(400).json({ error: 'El DNI ya está registrado' });
    }

    const result = await conn.query(
      'INSERT INTO clientes (nombre, email, telefono, direccion, dni) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, telefono || null, direccion || null, dni]
    );

    const newClient = await conn.query('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
    
    console.log('Cliente creado exitosamente:', newClient[0]);
    res.status(201).json(newClient[0]);
    
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente: ' + error.message });
  } finally {
    if (conn) conn.release();
  }
});

// Actualizar cliente
router.put('/:id', async (req, res) => {
  let conn;
  try {
    const { nombre, email, telefono, direccion, dni } = req.body;
    const { id } = req.params;

    if (!nombre || !email || !dni) {
      return res.status(400).json({ error: 'Nombre, email y DNI son requeridos' });
    }

    conn = await getConnection();

    const existingEmail = await conn.query(
      'SELECT id FROM clientes WHERE email = ? AND id != ?',
      [email, id]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const existingDni = await conn.query(
      'SELECT id FROM clientes WHERE dni = ? AND id != ?',
      [dni, id]
    );
    if (existingDni.length > 0) {
      return res.status(400).json({ error: 'El DNI ya está registrado' });
    }

    const result = await conn.query(
      'UPDATE clientes SET nombre = ?, email = ?, telefono = ?, direccion = ?, dni = ? WHERE id = ?',
      [nombre, email, telefono || null, direccion || null, dni, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const updatedClient = await conn.query('SELECT * FROM clientes WHERE id = ?', [id]);
    res.json(updatedClient[0]);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  } finally {
    if (conn) conn.release();
  }
});

// Eliminar cliente
router.delete('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
