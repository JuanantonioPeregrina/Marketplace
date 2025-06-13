const express = require("express");
const router = express.Router();
const Anuncio = require("../database/models/anuncio.model");
const Usuario = require("../database/models/user.model"); //Necesario para consultar reputación
router.post("/:id", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Debes iniciar sesión para inscribirte." });
    }

    const anuncioId = req.params.id;
    const usuario = req.session.user.username;

    try {
        const anuncio = await Anuncio.findById(anuncioId);

        if (!anuncio) {
            return res.status(404).json({ message: "Anuncio no encontrado." });
        }

        if (anuncio.inscritos.includes(usuario)) {
            return res.status(400).json({ message: "Ya estás inscrito en este anuncio." });
        }

         //Obtener reputación promedio del usuario
         const user = await Usuario.findOne({ username: usuario });
         let reputacion = 0;
         if (user.reseñas?.length > 0) {
             reputacion = user.reseñas.reduce((acc, r) => acc + (r.puntuacion || 0), 0) / user.reseñas.length;
         }
 
         //Validar rango de reputación
         if (reputacion < anuncio.minEstrellas || reputacion > anuncio.maxEstrellas) {
             return res.status(403).json({
                 message: `Este anuncio solo acepta usuarios con entre ${anuncio.minEstrellas} y ${anuncio.maxEstrellas} estrellas. Tu puntuación: ${reputacion.toFixed(1)}`
             });
         }

        // Si la ubicación es undefined, asignamos un valor por defecto
        if (!anuncio.ubicacion) {
            anuncio.ubicacion = "No especificada";
        }

        anuncio.inscritos.push(usuario);
        await anuncio.save(); // Ahora guardará sin error

        res.json({ message: "Inscripción exitosa", inscritos: anuncio.inscritos });
    } catch (error) {
        console.error("Error al inscribirse:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
});

module.exports = router;
