const express = require('express');
const Anuncio = require('../database/models/anuncio.model');
const Usuario = require('../database/models/user.model');
const Chat = require('../database/models/chat.model');
const mongoose = require("mongoose");


module.exports = (io) => {
    const router = express.Router();

    router.get("/", async (req, res) => {
        try {
            const usuario = req.session.user ? req.session.user.username : null;
            const anunciosDB = await Anuncio.find({});

            let anunciosConDatos = anunciosDB.map(anuncio => ({
                _id: anuncio._id.toString(),
                titulo: anuncio.titulo,
                descripcion: anuncio.descripcion,
                imagen: anuncio.imagen,
                precioInicial: anuncio.precioInicial,
                precioActual: anuncio.precioActual,
                autor: anuncio.autor,
                ubicacion: anuncio.ubicacion,
                inscritos: anuncio.inscritos || [],
                estadoSubasta: anuncio.estadoSubasta,
                fechaInicioSubasta: anuncio.fechaInicioSubasta,
                fechaExpiracion: anuncio.fechaExpiracion
            }));

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

    router.post("/iniciar-subasta/:id", async (req, res) => {
        try {
            const anuncio = await Anuncio.findById(req.params.id);

            if (!anuncio || anuncio.estadoSubasta !== "pendiente") {
                return res.status(400).json({ error: "La subasta no está en estado pendiente" });
            }

            anuncio.estadoSubasta = "activa";
            anuncio.fechaInicioSubasta = new Date();
            await anuncio.save();

            let precioActual = anuncio.precioInicial;
            let tiempoRestante = 60;

            const interval = setInterval(async () => {
                if (precioActual <= 100 || tiempoRestante <= 0) {
                    clearInterval(interval);
                    io.emit("subasta_finalizada", { anuncioId: req.params.id, precioFinal: precioActual });
                    return;
                }

                precioActual -= 50;
                tiempoRestante -= 10;

                await Anuncio.updateOne({ _id: req.params.id }, { precioActual });

                io.emit("actualizar_subasta", { anuncioId: req.params.id, precioActual, tiempoRestante });
            }, 10000);

            res.json({ mensaje: "Subasta iniciada con éxito", anuncio });

        } catch (error) {
            console.error("Error iniciando la subasta:", error);
            res.status(500).json({ error: "Error iniciando la subasta" });
        }
    });

    router.post("/pujar/:id", async (req, res) => {
        try {
            const { user } = req.session;
            if (!user) {
                return res.status(403).json({ error: "Debe estar autenticado para pujar." });
            }

            const anuncio = await Anuncio.findById(req.params.id);

            if (!anuncio || anuncio.estadoSubasta !== "activa") {
                return res.status(400).json({ error: "La subasta no está activa." });
            }

            anuncio.estadoSubasta = "finalizada";
            anuncio.ultimoPujador = user.username;
            await anuncio.save();

            io.emit("subasta_finalizada", { anuncioId: req.params.id, ganador: user.username, precioFinal: anuncio.precioActual });

            res.json({ mensaje: "Puja realizada con éxito", anuncio });

        } catch (error) {
            console.error("Error en la puja:", error);
            res.status(500).json({ error: "Error al procesar la puja." });
        }
    });

    return router;
};
