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
// app.use(express.static(path.join(__dirname, '../frontend/public')));
// app.use('/css', express.static(path.join(__dirname, '../frontend/public/css')));
// app.use('/js', express.static(path.join(__dirname, '../frontend/public/js')));
// app.use('/images', express.static(path.join(__dirname, '../frontend/public/images')));
// app.use('/assets', express.static(path.join(__dirname, '../frontend/public/assets')));

// En tu index.js, cambia esta sección:
// Archivos estáticos - ajustado para estructura backend/frontend
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
app.use('/api/reportes', verifyToken, reportesRoutes); // ✅ Esta es la buena
app.use('/api/caja', verifyToken, cajaRoutes);
app.use('/api/admin', verifyToken, adminRoutes);

// ⚠️ Elimino esta línea duplicada:
// app.use('/api/reportes', require('./routes/reportes'));

// Middleware para verificar autenticación (no se aplica globalmente por ahora)
const checkAuth = (req, res, next) => {
    if (req.path === '/login') return next();

    const token = req.headers.authorization?.split(' ')[1] ||
                  req.query.token ||
                  req.cookies?.token;

    if (!token) return res.redirect('/login');

    try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_aqui'; // ✅ usa env
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.redirect('/login');
    }
};

// Rutas HTML públicas y protegidas
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

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

// Ruta catch-all
app.get('*', (req, res) => {
    res.redirect('/login');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
