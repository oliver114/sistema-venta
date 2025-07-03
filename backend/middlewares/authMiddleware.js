const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'miclavesecreta';

function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];

  if (!bearerHeader) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' });
  }

  // ✅ Extraer solo el token después de "Bearer "
  const token = bearerHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.usuario = decoded; // ✅ Aquí está el usuario
    next();
  } catch (error) {
    console.error('Token inválido:', error);
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
}



module.exports = { verifyToken };
