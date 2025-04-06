// routes/mis-anuncios.js
const express = require("express");
const router = express.Router();
const Anuncio = require("../database/models/anuncio.model");

router.get("/", async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    try {
        const usuario = await Usuario.findOne({ username: req.session.user.username })
            .populate("favoritos");

        const publicados = await Anuncio.find({ autor: req.session.user.username });
        const favoritos = usuario.favoritos;

        res.render("mis-anuncios", {
            title: "Mis Anuncios",
            publicados,
            favoritos,
            user: req.session.user
        });

    } catch (err) {
        console.error("Error en /mis-anuncios:", err);
        res.status(500).send("Error interno");
    }
});


module.exports = router;
