const express = require('express');
const Anuncio = require('../database/models/anuncio.model');
const Chat = require('../database/models/chat.model'); // Importamos el modelo de Chat
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const anunciosDB = await Anuncio.find({});
        const usuario = req.session.user ? req.session.user.username : null; // Usuario autenticado

        let anunciosConDatos = [];

        for (let anuncio of anunciosDB) {
            let chatIniciado = false;

            if (usuario && anuncio.inscritos.includes(usuario)) {
                // Verificamos si existe un chat entre el anunciante y el usuario autenticado
                chatIniciado = await Chat.exists({
                    anuncioId: anuncio._id,
                    $or: [
                        { remitente: anuncio.autor, destinatario: usuario },
                        { remitente: usuario, destinatario: anuncio.autor }
                    ]
                });
            }

            anunciosConDatos.push({
                _id: anuncio._id.toString(),
                titulo: anuncio.titulo,
                descripcion: anuncio.descripcion,
                imagen: anuncio.imagen,
                precio: anuncio.precio,
                autor: anuncio.autor,
                inscritos: anuncio.inscritos || [],
                chatIniciado, // Variable que indicará si el chat ya existe
            });
        }

        res.render("anuncios", { 
            title: "Anuncios - LibrePost", 
            user: req.session.user, 
            anuncios: anunciosConDatos
        });

    } catch (error) {
        console.error("Error cargando anuncios:", error);
        res.status(500).send("Error al cargar los anuncios.");
    }
});

module.exports = router;
