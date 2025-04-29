const User = require("../database/models/user.model");
const jwt = require("jsonwebtoken");

// Middleware para validar API Keys o Tokens JWT
const authenticateToken = async (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    const token = req.headers["authorization"];

    try {
        if (apiKey) {
            // 🔍 Buscar usuario con esa API Key
            const user = await User.findOne({ "apiKeys.key": apiKey });

            if (!user) {
                console.log(`🔴 API Key NO válida: ${apiKey}`);
                return res.status(403).json({ error: "API Key inválida o no registrada." });
            }

            // 🔍 Buscar la API Key dentro del usuario
            const keyData = user.apiKeys.find((k) => k.key === apiKey);

            if (!keyData) {
                console.log(`🔴 API Key no pertenece al usuario.`);
                return res.status(403).json({ error: "API Key inválida." });
            }

            // 📌 Verificar si ha excedido el límite
            if (keyData.usage >= keyData.limit) {
                console.log(`🔴 Límite de uso alcanzado para API Key ${apiKey}`);
                return res.status(429).json({ error: "Límite de uso alcanzado. Considera actualizar tu plan." });
            }

            // 📌 Incrementar el uso y guardar en BD
            keyData.usage += 1;
            await user.save();

            // 🔐 Pasar usuario al request para su uso posterior
            req.user = { username: user.username };

            console.log(`✅ Acceso permitido a ${user.username} con API Key.`);
            return next();
        }

        if (token) {
            jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, user) => {
                if (err) {
                    console.log("🔴 Token JWT inválido.");
                    return res.status(403).json({ error: "Token inválido." });
                }
                req.user = user;
                next();
            });
            return;
        }

        console.log("🔴 Acceso denegado. No se proporcionó API Key ni Token JWT.");
        return res.status(403).json({ error: "Autenticación requerida (API Key o Token JWT)." });

    } catch (error) {
        console.error("❌ Error en autenticación:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

module.exports = { authenticateToken };
