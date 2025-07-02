const express = require("express");
const router = express.Router();
const Anuncio = require("../database/models/anuncio.model");
const { soloAdmins } = require("../middlewares/auth"); // Importar middleware compartido

// GET: Ver todos los anuncios
router.get("/", soloAdmins, async (req, res) => {
    try {
        const anuncios = await Anuncio.find().sort({ fechaPublicacion: -1 });
        res.render("gestion-anuncios", { 
            title: "Gestión de Anuncios", 
            anuncios, 
            user: req.session.user 
        });
    } catch (err) {
        console.error("Error al cargar anuncios:", err);
        res.status(500).send("Error al cargar anuncios");
    }
});

// POST: Eliminar anuncio
router.post("/eliminar/:id", soloAdmins, async (req, res) => {
    try {
        await Anuncio.findByIdAndDelete(req.params.id);
        res.redirect("/gestion-anuncios");
    } catch (err) {
        console.error("Error al eliminar anuncio:", err);
        res.status(500).send("Error al eliminar anuncio");
    }
});

module.exports = router;
