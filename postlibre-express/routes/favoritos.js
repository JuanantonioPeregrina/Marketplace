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

        // Convertimos el ObjectId a string para comparar correctamente
        const index = user.favoritos.findIndex(fav => fav.toString() === anuncioId);

        if (index !== -1) {
            // Ya está en favoritos → quitar
            user.favoritos.splice(index, 1);
        } else {
            // No está en favoritos → añadir
            user.favoritos.push(anuncioId);
        }

        await user.save();

        // Redirige de vuelta a la página anterior
        res.redirect("back");
    } catch (err) {
        console.error("Error al hacer toggle de favorito:", err);
        res.status(500).send("Error interno del servidor");
    }
});


module.exports = router;

