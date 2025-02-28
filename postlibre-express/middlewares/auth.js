// middlewares/auth.js
const jwt = require('jsonwebtoken');
const secretKey = "miClaveSecreta"; // Usa una clave más segura en producción

function authenticateToken(req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Acceso denegado" });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
