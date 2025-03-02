const User = require('../database/models/user.model');

const jwt = require("jsonwebtoken");

// Middleware para validar tanto API Keys como Tokens JWT
const authenticateToken = async (req, res, next) => {
    const token = req.headers["authorization"];
    const apiKey = req.headers["x-api-key"];

    try {
        if (apiKey) {
            // Validar API Key en la base de datos
            const user = await User.findOne({ "apiKeys.key": apiKey });

            if (!user) {
                return res.status(403).json({ error: "API Key inválida." });
            }

            // Encontrar la API Key específica
            const keyData = user.apiKeys.find((k) => k.key === apiKey);

            // Verificar si ha excedido el límite
            if (keyData.usage >= keyData.limit) {
                return res.status(429).json({ error: "Límite de uso alcanzado. Considera actualizar tu plan." });
            }

            // Incrementar el uso y guardar
            keyData.usage += 1;
            await user.save();

            req.user = { username: user.username }; // Pasar usuario al request
            return next();
        }

        if (token) {
            // Verificar el token JWT
            jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, user) => {
                if (err) return res.status(403).json({ error: "Token inválido." });
                req.user = user;
                next();
            });
            return;
        }

        return res.status(403).json({ error: "Autenticación requerida (Token o API Key)." });

    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

module.exports = { authenticateToken };
