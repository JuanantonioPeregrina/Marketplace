const express = require("express");
const router = express.Router();
const Anuncio = require("../database/models/anuncio.model");

// Ruta para inscribirse en un anuncio
router.post("/:id", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Debes iniciar sesión para inscribirte.");
    }

    const anuncioId = req.params.id;
    const usuario = req.session.user.username;

    try {
        // Buscar el anuncio
        const anuncio = await Anuncio.findById(anuncioId);
        if (!anuncio) {
            return res.status(404).send("Anuncio no encontrado.");
        }

        // Verificar si el usuario ya está inscrito
        if (anuncio.inscritos.includes(usuario)) {
            return res.status(400).send("Ya estás inscrito en este anuncio.");
        }

        // Agregar el usuario a la lista de inscritos
        anuncio.inscritos.push(usuario);
        await anuncio.save();

        res.json({ message: "Inscripción exitosa", inscritos: anuncio.inscritos });
    } catch (error) {
        console.error("Error al inscribirse:", error);
        res.status(500).send("Error interno del servidor.");
    }
});

module.exports = router;
