const express = require('express');
const Usuario = require('../database/models/user.model'); // Modelo de usuario
const router = express.Router();

// Ruta para enviar una reseña a un usuario
router.post('/:usuario', async (req, res) => { // 👈 Cambié la URL de ":usuario/resenas" a ":usuario"
    if (!req.session.user) {
        return res.status(401).send("Debes iniciar sesión para dejar una reseña.");
    }

    const { usuario } = req.params; // Usuario que recibirá la reseña
    const { puntuacion, comentario } = req.body;
    const autor = req.session.user.username; // Usuario que deja la reseña

    try {
        const usuarioReseñado = await Usuario.findOne({ username: usuario });

        if (!usuarioReseñado) {
            return res.status(404).send("El usuario que intentas reseñar no existe.");
        }

        // Crear la reseña
        const nuevaResena = { // 👈 Cambié a "resena" sin tilde
            autor,
            puntuacion: parseInt(puntuacion),
            comentario,
            fecha: new Date(),
        };

        // Guardar en la BBDD dentro del usuario reseñado
        usuarioReseñado.reseñas.push(nuevaResena);
        await usuarioReseñado.save();

        res.redirect(`/anuncios?mensaje=Reseña enviada con éxito`);
    } catch (error) {
        console.error("Error al guardar la reseña:", error);
        res.status(500).send("Error al procesar la reseña.");
    }
});

module.exports = router;
