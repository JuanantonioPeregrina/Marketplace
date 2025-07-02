const express = require('express');
const Usuario = require('../database/models/user.model');
const Anuncio = require('../database/models/anuncio.model');
const mongoose = require('mongoose');
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
        const anuncio = await Anuncio.findById(anuncioId); // Obtener anuncio completo

        if (!usuarioResenado || !anuncio) {
            return res.redirect(`/anuncios?error=Usuario o anuncio no encontrado.`);
        }

        // Comprobamos si ya existe una reseña previa
        const yaResenado = usuarioResenado.reseñas.some(
            r => r.autor === autor && r.anuncioId && r.anuncioId.toString() === anuncioId
        );

        if (yaResenado) {
            return res.redirect(`/anuncios?error=Ya has enviado una reseña a este usuario en este anuncio.`);
        }

        // Determinar el rol de esta reseña
        let rol = "proveedor";
        if (autor === anuncio.autor && usuarioResenado.username !== autor) {
            rol = "anunciante"; // El autor del anuncio reseña al proveedor (inscrito)
        }

        console.log("💬 Guardando reseña como:", rol);

        //Guardar la reseña con el campo `rol`
        usuarioResenado.reseñas.push({
            autor,
            puntuacion: parseInt(puntuacion),
            comentario,
            fecha: new Date(),
            anuncioId: new mongoose.Types.ObjectId(anuncioId),
            rol
        });

        await usuarioResenado.save();

        return res.redirect(`/anuncios?mensaje=Reseña enviada con éxito`);

    } catch (error) {
        console.error("Error al guardar la reseña:", error);
        return res.redirect(`/anuncios?error=Error al procesar la reseña`);
    }
});

module.exports = router;
