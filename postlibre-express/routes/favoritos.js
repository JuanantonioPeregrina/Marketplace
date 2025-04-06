const express = require("express");
const router = express.Router();
const Usuario = require("../database/models/user.model");
const Anuncio = require("../database/models/anuncio.model");

// Ruta para marcar un anuncio como favorito
router.post("/:id", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("No autorizado");
    }

    try {
        const user = await Usuario.findOne({ username: req.session.user.username });

        if (!user) return res.status(404).send("Usuario no encontrado");

        const anuncioId = req.params.id;

        if (!user.favoritos.includes(anuncioId)) {
            user.favoritos.push(anuncioId);
            await user.save();
        }

        res.redirect("/anuncios"); // o res.redirect("back") para volver a la página anterior
    } catch (err) {
        console.error("Error al guardar favorito:", err);
        res.status(500).send("Error interno del servidor");
    }
});

module.exports = router;

