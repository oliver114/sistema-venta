const express = require('express');
const bcrypt = require('bcryptjs');
const { getConnection } = require('../db');
const router = express.Router();


const { verifyToken, verifyAdmin } = require('./auth');




// Ruta para mostrar el formulario de registro (GET)
router.get('/registro', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/admin.html'));
});

// Ruta para procesar el registro de usuarios (POST)
router.post('/registro', async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    
    try {
        // Validar que todos los campos estén presentes
        if (!nombre || !email || !password || !rol) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'El formato del email no es válido'
            });
        }

        // Validar longitud de contraseña
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        const conn = await getConnection();
        
        try {
            // Verificar si el email ya existe
            const existingUser = await conn.query(
                'SELECT id FROM usuarios WHERE email = ?', 
                [email]
            );
            
            if (existingUser.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El email ya está registrado'
                });
            }

            // Encriptar la contraseña
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Insertar el nuevo usuario
            const result = await conn.query(
                'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
                [nombre, email, hashedPassword, rol]
            );

            res.json({
                success: true,
                message: 'Usuario registrado exitosamente',
                userId: Number(result.insertId)
            });


        } finally {
            conn.release();
        }

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Actualizar el estado activo/inactivo del usuario
router.put('/usuarios/:id/activo', async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    try {
        const conn = await getConnection();
        await conn.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
        res.json({ success: true, message: `Usuario ${activo ? 'habilitado' : 'deshabilitado'} correctamente` });
    } catch (error) {
        console.error('Error al actualizar estado del usuario:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar estado' });
    }
});


// Ruta para obtener todos los usuarios (opcional, para administración)
router.get('/usuarios', async (req, res) => {
    try {
        const conn = await getConnection();
        
        try {
            const usuarios = await conn.query(
                'SELECT id, nombre, email, rol, activo, fecha_creacion as created_at FROM usuarios ORDER BY created_at DESC'
            );

;
            
            res.json({
                success: true,
                usuarios: usuarios
            });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios'
        });
    }
});

// Obtener resumen de turnos y ventas por usuario
router.get('/resumen-turnos', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const conn = await getConnection();

        const resultados = await conn.query(`
            SELECT 
                t.id AS turno_id,
                u.nombre AS usuario,
                u.email,
                t.fecha_apertura,
                t.fecha_cierre,
                t.saldo_inicial,
                t.saldo_final,
                t.total_ventas,
                t.estado
            FROM turnos_caja t
            JOIN usuarios u ON u.id = t.usuario_id
            ORDER BY t.fecha_apertura DESC
        `);

        res.json({ success: true, turnos: resultados });
    } catch (error) {
        console.error('Error al obtener resumen de turnos:', error);
        res.status(500).json({ success: false, message: 'Error al obtener resumen de turnos' });
    }
});


function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html'; // o la ruta que uses para login
}


module.exports = router;