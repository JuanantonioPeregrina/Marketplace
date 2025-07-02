const express = require('express');
const Usuario = require('../database/models/user.model'); 
const mongoose = require('mongoose'); // Asegurar que ObjectId sea manejado correctamente
const router = express.Router();

router.post('/:usuario/:anuncioId', async (req, res) => {
    if (!req.session.user) {
        return res.redirect(`/anuncios?error=Debes iniciar sesión para dejar una reseña.`);
    }

    let { usuario, anuncioId } = req.params;
    const { puntuacion, comentario } = req.body;
    const autor = req.session.user.username;

    try {
        if (!anuncioId || !mongoose.Types.ObjectId.isValid(anuncioId)) {
            return res.redirect(`/anuncios?error=El ID del anuncio es inválido.`);
        }

        const usuarioResenado = await Usuario.findOne({ username: usuario });

        if (!usuarioResenado) {
            return res.redirect(`/anuncios?error=El usuario que intentas reseñar no existe.`);
        }

        // ✅ Convertimos anuncioId a ObjectId para evitar errores
        anuncioId = new mongoose.Types.ObjectId(anuncioId);

        // ✅ Verificamos si el usuario ya ha recibido una reseña en este anuncio por el mismo autor
        const yaResenado = usuarioResenado.reseñas.some(
            r => r.autor === autor && r.anuncioId && r.anuncioId.toString() === anuncioId.toString()
        );

        if (yaResenado) {
            return res.redirect(`/anuncios?error=Ya has enviado una reseña a este usuario en este anuncio.`);
        }

        // 🔹 Si no ha sido reseñado en este anuncio, guardamos la reseña
        usuarioResenado.reseñas.push({
            autor,
            puntuacion: parseInt(puntuacion),
            comentario,
            fecha: new Date(),
            anuncioId: anuncioId // Guardamos correctamente el ID del anuncio
        });

        await usuarioResenado.save();

        return res.redirect(`/anuncios?mensaje=Reseña enviada con éxito`);

    } catch (error) {
        console.error("Error al guardar la reseña:", error);
        return res.redirect(`/anuncios?error=Error al procesar la reseña`);
    }
});

module.exports = router;
