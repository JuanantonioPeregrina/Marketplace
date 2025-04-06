// routes/mis-anuncios.js
const express = require("express");
const router = express.Router();
const Anuncio = require("../database/models/anuncio.model");

router.get("/", async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    const username = req.session.user.username;

    try {
        const publicados = await Anuncio.find({ autor: username }).sort({ createdAt: -1 });
        const participando = await Anuncio.find({ inscritos: username }).sort({ createdAt: -1 });

        res.render("mis-anuncios", {
            title: "Mis Anuncios",
            publicados,
            participando,
            user: req.session.user
        });
    } catch (error) {
        console.error("Error cargando mis anuncios:", error);
        res.status(500).send("Error interno del servidor.");
    }
});

module.exports = router;
