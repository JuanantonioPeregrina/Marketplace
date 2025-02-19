const express = require('express');
const Anuncio = require('../database/models/anuncio.model');
const Usuario = require('../database/models/user.model'); 
const Chat = require('../database/models/chat.model'); 
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const usuario = req.session.user ? req.session.user.username : null; 
        const anunciosDB = await Anuncio.find({});

        let anunciosConDatos = [];

        for (let anuncio of anunciosDB) {
            let chatIniciado = false;
            let inscritosConResenaPorAnuncio = {}; 

            if (usuario && anuncio.inscritos.includes(usuario)) {
                chatIniciado = await Chat.exists({
                    anuncioId: anuncio._id,
                    $or: [
                        { remitente: anuncio.autor, destinatario: usuario },
                        { remitente: usuario, destinatario: anuncio.autor }
                    ]
                });
            }

            for (let inscrito of anuncio.inscritos) {
                const usuarioResenado = await Usuario.findOne({ username: inscrito });

                inscritosConResenaPorAnuncio[inscrito] = usuarioResenado 
    ? usuarioResenado.reseñas.some(r => r.autor === usuario && r.anuncioId && r.anuncioId.toString() === anuncio._id.toString()) 
    : false;

            }

            anunciosConDatos.push({
                _id: anuncio._id.toString(),
                titulo: anuncio.titulo,
                descripcion: anuncio.descripcion,
                imagen: anuncio.imagen,
                precio: anuncio.precio,
                autor: anuncio.autor,
                ubicacion: anuncio.ubicacion,
                inscritos: anuncio.inscritos || [],
                inscritosConResenaPorAnuncio, 
                chatIniciado,
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
