const express = require('express');
const Anuncio = require('../database/models/anuncio.model');
const Chat = require('../database/models/chat.model'); // Importamos el modelo de Chat
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const usuario = req.session.user ? req.session.user.username : null; 
        const filtros = {};

        // Recoger filtros desde query params
        if (req.query.presupuesto) {
            if (req.query.presupuesto === "menos-100") filtros.precio = { $lt: 100 };
            else if (req.query.presupuesto === "100-500") filtros.precio = { $gte: 100, $lte: 500 };
            else if (req.query.presupuesto === "mas-500") filtros.precio = { $gt: 500 };
        }

        if (req.query.ubicacion) {
            filtros.ubicacion = { $regex: req.query.ubicacion, $options: "i" };
        }

        if (req.query.reputacion) {
            filtros.reputacion = parseInt(req.query.reputacion); // Convierte la reputación en número
        }

        const anunciosDB = await Anuncio.find(filtros);

        let anunciosConDatos = [];

        for (let anuncio of anunciosDB) {
            let chatIniciado = false;

            if (usuario && anuncio.inscritos.includes(usuario)) {
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
                ubicacion: anuncio.ubicacion, // 📌 Mostrar la ubicación
                inscritos: anuncio.inscritos || [],
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
