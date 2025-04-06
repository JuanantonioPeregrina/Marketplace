const express = require('express');
const router = express.Router();
const Usuario = require("../database/models/user.model");
const Anuncio = require("../database/models/anuncio.model");

router.post("/agregar", async (req, res) => {
    const { anuncioId } = req.body;
    if (!req.session.user) return res.status(401).send("No autenticado");

    try {
        const usuario = await Usuario.findOne({ username: req.session.user.username });

        if (!usuario.favoritos.includes(anuncioId)) {
            usuario.favoritos.push(anuncioId);
            await usuario.save();
        }

        res.redirect("/anuncios");
    } catch (err) {
        console.error("Error agregando a favoritos:", err);
        res.status(500).send("Error interno");
    }
});

module.exports = router;
