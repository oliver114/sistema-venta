const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const clientesRoutes = require('./routes/clientes');
const serviciosRoutes = require('./routes/servicios');
const ventasRoutes = require('./routes/ventas');
const reportesRoutes = require('./routes/reportes');
const { router: authRoutes, verifyToken } = require('./routes/auth');
const cajaRoutes = require('./routes/caja');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Archivos estáticos
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/css', express.static(path.join(__dirname, '../frontend/public/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/public/js')));
app.use('/images', express.static(path.join(__dirname, '../frontend/public/images')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/public/assets')));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', verifyToken, clientesRoutes);
app.use('/api/servicios', verifyToken, serviciosRoutes);
app.use('/api/ventas', verifyToken, ventasRoutes);
app.use('/api/reportes', verifyToken, reportesRoutes);
app.use('/api/caja', verifyToken, cajaRoutes);
app.use('/api/admin', verifyToken, adminRoutes);
app.use('/api/reportes', require('./routes/reportes'));


// Middleware para verificar autenticación en rutas protegidas
const checkAuth = (req, res, next) => {
    // Si es la ruta de login, permitir acceso
    if (req.path === '/login') {
        return next();
    }
    
    // Para otras rutas, verificar si hay token
    const token = req.headers.authorization?.split(' ')[1] || 
                  req.query.token || 
                  req.cookies?.token;
    
    if (!token) {
        return res.redirect('/login');
    }
    
    try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = 'tu_clave_secreta_aqui'; // Debe ser la misma que en auth.js
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.redirect('/login');
    }
};

// Rutas HTML


// Ruta de login (sin protección)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});

// Ruta principal (página de inicio después del login)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Ruta alternativa para index.html (por si acaso)
app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Rutas protegidas
app.get('/caja', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/caja.html'));
});

app.get('/nueva-venta', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/venta.html'));
});

app.get('/nuevo-cliente', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/nuevo-cliente.html'));
});

app.get('/reportes', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/reportes.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/admin.html'));
});

// Ruta catch-all - debe ir al final
app.get('*', (req, res) => {
    res.redirect('/login');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});