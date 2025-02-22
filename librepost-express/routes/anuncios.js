const express = require('express');
const Anuncio = require('../database/models/anuncio.model');
const Usuario = require('../database/models/user.model');
const Chat = require('../database/models/chat.model');
const mongoose = require("mongoose");

module.exports = (io) => {
    const router = express.Router();

    // ✅ Cargar los anuncios incluyendo las pujas y ofertas automáticas
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
                fechaExpiracion: anuncio.fechaExpiracion,
                pujas: anuncio.pujas || [],
                ofertasAutomaticas: anuncio.ofertasAutomaticas || [] // 🔹 Incluir las ofertas automáticas
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

    // ✅ Ruta para registrar oferta automática
    router.post("/oferta-automatica/:id", async (req, res) => {
        try {
            const { user } = req.session;
            if (!user) {
                return res.status(403).json({ error: "Debe estar autenticado para registrar una oferta automática." });
            }

            const { precioMaximo } = req.body;
            if (!precioMaximo || isNaN(precioMaximo) || precioMaximo <= 0) {
                return res.status(400).json({ error: "Debe ingresar un precio máximo válido." });
            }

            const anuncio = await Anuncio.findById(req.params.id);
            if (!anuncio || anuncio.estadoSubasta !== "activa") {
                return res.status(400).json({ error: "La subasta no está activa." });
            }

            // 🔹 Registrar la oferta automática en el array
            anuncio.ofertasAutomaticas.push({
                usuario: user.username,
                precioMaximo: parseInt(precioMaximo),
                fecha: new Date()
            });

            await anuncio.save();

            res.json({ mensaje: "Oferta automática registrada con éxito", anuncio });

        } catch (error) {
            console.error("Error en la oferta automática:", error);
            res.status(500).json({ error: "Error al registrar la oferta automática." });
        }
    });

    // ✅ Modificar la lógica de pujas para aplicar oferta automática
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

            let precioActual = anuncio.precioActual;
            let mejorOferta = null;

            // 🔹 Buscar la mejor oferta automática disponible
            if (anuncio.ofertasAutomaticas.length > 0) {
                mejorOferta = anuncio.ofertasAutomaticas
                    .filter(oferta => oferta.precioMaximo > precioActual) // Solo las que superan el precio actual
                    .sort((a, b) => b.precioMaximo - a.precioMaximo)[0]; // La mejor oferta automática
            }

            if (mejorOferta) {
                precioActual = Math.min(mejorOferta.precioMaximo, precioActual + 100); // Incremento de 100 hasta el límite
                anuncio.ultimoPujador = mejorOferta.usuario;
            } else {
                anuncio.ultimoPujador = user.username;
            }

            // 🔹 Guardar la puja en la base de datos
            const nuevaPuja = {
                usuario: anuncio.ultimoPujador,
                cantidad: precioActual,
                fecha: new Date()
            };

            anuncio.pujas.push(nuevaPuja);
            anuncio.precioActual = precioActual;
            await anuncio.save();

            // 🔹 Emitir evento para actualizar el frontend
            io.emit("actualizar_pujas", {
                anuncioId: req.params.id,
                usuario: anuncio.ultimoPujador,
                cantidad: anuncio.precioActual,
                pujas: anuncio.pujas
            });

            res.json({ mensaje: "Puja realizada con éxito", anuncio });

        } catch (error) {
            console.error("Error en la puja:", error);
            res.status(500).json({ error: "Error al procesar la puja." });
        }
    });

    return router;
};
