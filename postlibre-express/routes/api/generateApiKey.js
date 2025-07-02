const express = require("express");
const router = express.Router();
const User = require('../../database/models/user.model');
const { v4: uuidv4 } = require("uuid");

// Límites de peticiones según el plan
const PLAN_LIMITS = {
    Free: 1000,
    Basic: 10000,
    Pro: 100000,
    Enterprise: Infinity
};

// Generar API Key para un usuario autenticado
router.post("/generate-api-key", async (req, res) => {
    const { userId, plan } = req.body;

    if (!["Free", "Basic", "Pro", "Enterprise"].includes(plan)) {
        return res.status(400).json({ error: "Plan no válido." });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }

        // Generar API Key única
        const newApiKey = {
            key: uuidv4(),
            plan,
            limit: PLAN_LIMITS[plan],
            usage: 0
        };

        // Agregar la API Key al usuario
        user.apiKeys.push(newApiKey);
        await user.save();

        res.json({ success: true, apiKey: newApiKey.key });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al generar la API Key." });
    }
});

module.exports = router;
