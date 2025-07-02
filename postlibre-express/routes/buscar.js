const express = require("express");
const router = express.Router();
const Anuncio = require("../database/models/anuncio.model");
const Usuario = require("../database/models/user.model");

router.get("/buscar", async (req, res) => {
    const q = req.query.q?.trim().toLowerCase();
    if (!q) return res.json([]);

    try {
        const regex = new RegExp(q, "i");

        const [anuncios, usuarios] = await Promise.all([
            Anuncio.find({ titulo: regex }).limit(5),
            Usuario.find({ username: regex }).limit(5)
        ]);

        const resultados = [
            ...anuncios.map(a => ({
                tipo: "anuncio",
                titulo: a.titulo,
                contenido: `Publicado por ${a.autor}`,
                url: `/anuncios/${a._id}`
            })),
            ...usuarios.map(u => ({
                tipo: "usuario",
                titulo: u.username,
                contenido: `Perfil de usuario`,
                url: `/perfil-publico/${u.username}`
            }))
        ];

        res.json(resultados);
    } catch (err) {
        console.error("Error en búsqueda:", err);
        res.status(500).json({ error: "Error interno" });
    }
});

module.exports = router;
