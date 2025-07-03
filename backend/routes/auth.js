const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../db');
const router = express.Router();

const JWT_SECRET = 'tu_clave_secreta_aqui'; // Cambia esto por una clave segura

// Login
router.post('/login', async (req, res) => {
    let conn;
    try {
        const { email, password } = req.body;

        console.log('=== DEBUG LOGIN ===');
        console.log('Email recibido:', email);
        console.log('Password recibido:', password);

        conn = await getConnection();
        console.log('Conexión a BD exitosa');

        // Buscar usuario por email
        const users = await conn.query(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = users[0];

        if (!user.activo) {
            return res.status(403).json({ error: 'Usuario deshabilitado. Contacta al administrador.' });
        }

        console.log('Usuario encontrado:', {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
            hashPassword: user.password
        });

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('Resultado comparación:', isValidPassword);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        console.log('Login exitoso para:', user.email);

        // Crear token JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                rol: user.rol
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) await conn.release();
    }
});

// Middleware para verificar token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// Middleware para verificar rol de administrador
const verifyAdmin = (req, res, next) => {
    if (req.user.rol !== 'administrador') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
};

// Verificar token (para mantener sesión activa)
router.get('/verify', verifyToken, (req, res) => {
    res.json({
        message: 'Token válido',
        user: req.user
    });
});

// Logout
router.post('/logout', verifyToken, (req, res) => {
    res.json({ message: 'Logout exitoso' });
});

module.exports = { router, verifyToken, verifyAdmin };
