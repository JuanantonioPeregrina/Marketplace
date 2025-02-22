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
                pujas: anuncio.pujas.map(puja => ({
                    usuario: puja.usuario,
                    cantidad: puja.cantidad,
                    fecha: puja.fecha,
                    automatica: puja.automatica || false  // 🔹 Ahora `automatica` siempre está presente
                })),
                ofertasAutomaticas: anuncio.ofertasAutomaticas || []
            }));
            
            console.log("📢 Datos enviados al frontend:", JSON.stringify(anunciosConDatos, null, 2)); // Debugging
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
    
            // 🔹 Registrar la oferta automática en `ofertasAutomaticas`
            const nuevaOfertaAutomatica = {
                usuario: user.username,
                precioMaximo: parseInt(precioMaximo),
                fecha: new Date()
            };
            anuncio.ofertasAutomaticas.push(nuevaOfertaAutomatica);
    
            // 🔹 Registrar también en `pujas`
            anuncio.pujas.push({
                usuario: user.username,
                cantidad: precioMaximo,  // Se guarda como una puja real
                fecha: new Date(),
                automatica: true
            });
    
            await anuncio.save();
    
            console.log("📢 Oferta automática guardada en pujas:", JSON.stringify(anuncio.pujas, null, 2)); // 🔥 DEBUG
    
            // 🔹 Emitir evento para actualizar la interfaz
            io.emit("actualizar_pujas", {
                anuncioId: req.params.id,
                usuario: user.username,
                cantidad: precioMaximo,
                pujas: anuncio.pujas
            });
    
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
            let nuevoPujador = user.username;
            let pujaAutomaticaRealizada = false;
            let mejorOferta = null;
    
            // 🔎 Buscar la mejor oferta automática
            if (anuncio.ofertasAutomaticas.length > 0) {
                mejorOferta = anuncio.ofertasAutomaticas
                    .filter(oferta => oferta.precioMaximo > precioActual)
                    .sort((a, b) => b.precioMaximo - a.precioMaximo)[0];
            }
    
            if (mejorOferta) {
                // 🔥 Ejecutar puja automática
                precioActual = Math.min(mejorOferta.precioMaximo, precioActual + 100);
                nuevoPujador = mejorOferta.usuario;
                pujaAutomaticaRealizada = true;
    
                // 🔹 REGISTRAR LA PUJA AUTOMÁTICA EN `pujas`
                const nuevaPujaAutomatica = {
                    usuario: mejorOferta.usuario,
                    cantidad: precioActual,
                    fecha: new Date(),
                    automatica: true  // 🔥 Etiquetar como automática
                };
                anuncio.pujas.push(nuevaPujaAutomatica);
    
                // 🗑️ ELIMINAR LA OFERTA AUTOMÁTICA SI SE ALCANZA SU MÁXIMO
                if (precioActual >= mejorOferta.precioMaximo) {
                    anuncio.ofertasAutomaticas = anuncio.ofertasAutomaticas.filter(
                        oferta => oferta._id.toString() !== mejorOferta._id.toString()
                    );
                }
            }
    
            // 🔹 REGISTRAR LA PUJA MANUAL
            const nuevaPuja = {
                usuario: user.username,
                cantidad: precioActual,
                fecha: new Date(),
                automatica: pujaAutomaticaRealizada // ✅ Ahora se indica si fue automática o manual
            };
    
            anuncio.pujas.push(nuevaPuja);
            anuncio.precioActual = precioActual;
            anuncio.ultimoPujador = nuevoPujador;
            await anuncio.save();
    
            // 📢 Emitir evento para actualizar la interfaz
            io.emit("actualizar_pujas", {
                anuncioId: req.params.id,
                usuario: nuevoPujador,
                cantidad: precioActual,
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
