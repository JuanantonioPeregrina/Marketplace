const express = require('express');
const Anuncio = require('../database/models/anuncio.model');
const Usuario = require('../database/models/user.model');
const Chat = require('../database/models/chat.model');
const mongoose = require("mongoose");
const path = require('path'); // 

module.exports = (io) => {
    const router = express.Router();

   
    router.get("/", async (req, res) => {
        try {
            const usuario = req.session.user ? req.session.user.username : null;
            let apiKey = "";
        
            if (usuario) {
                const userData = await Usuario.findOne({ username: usuario });
                if (userData && userData.apiKeys.length > 0) {
                    apiKey = userData.apiKeys[0].key; 
                }
            }
        
            console.log("📢 API Key enviada al frontend:", apiKey || "No disponible");
    
            // 📌 PAGINACIÓN: Límite de anuncios por página (20 por defecto)
            const page = parseInt(req.query.page) || 1;  // Página actual
            const limit = 20;  // 🔹 Solo mostramos 20 anuncios por página
            const skip = (page - 1) * limit;  // 🔹 Saltamos los registros anteriores
    
            // 📌 FILTROS: Obtenemos los parámetros de búsqueda
            let filtro = {};
            if (req.query.presupuesto) {
                if (req.query.presupuesto === "menos-100") filtro.precioActual = { $lt: 100 };
                else if (req.query.presupuesto === "100-500") filtro.precioActual = { $gte: 100, $lte: 500 };
                else if (req.query.presupuesto === "mas-500") filtro.precioActual = { $gt: 500 };
            }
            if (req.query.ubicacion) {
                filtro.ubicacion = new RegExp(req.query.ubicacion, "i");
            }
    
            // 📌 EJECUTAR CONSULTA PAGINADA CON FILTROS
            const anunciosFiltrados = await Anuncio.find(filtro)
            .sort({ fechaPublicacion: -1 })
            .skip(skip)
            .limit(limit);
        
        let anunciosConDatos = await Promise.all(anunciosFiltrados.map(async (anuncio) => {
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
        
            return {
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
                chatIniciado,
                pujas: anuncio.pujas || [],
                ofertasAutomaticas: anuncio.ofertasAutomaticas || []
            };
        }));
        
    
            // 📌 Contar TOTAL de anuncios para calcular páginas
            const total = await Anuncio.countDocuments(filtro);
    
            res.render("anuncios", {
                title: "Anuncios - LibrePost",
                user: req.session.user,
                apiKey,
                anuncios: anunciosConDatos,
                page,
                totalPages: Math.ceil(total / limit)
            });
            
    
        } catch (error) {
            console.error("❌ Error cargando anuncios:", error);
            res.status(500).send("Error al cargar los anuncios.");
        }
    });
    
    
    
    
    // ✅ Ruta para registrar oferta automática antes del inicio de la subasta
router.post("/oferta-automatica/:id", async (req, res) => {
    try {
        console.log("📥 Datos recibidos en oferta automática:", req.body); // 🔥 Depuración

        const { user } = req.session;
        if (!user) {
            return res.status(403).json({ error: "Debe estar autenticado para registrar una oferta automática." });
        }

        const precioMaximo = parseInt(req.body.precioMaximo); // 📌 Asegurar que llega correctamente

        if (isNaN(precioMaximo) || precioMaximo < 0) {
            return res.status(400).json({ error: "Debe ingresar un precio máximo válido entre 0 y el precio actual." });
        }

        const anuncio = await Anuncio.findById(req.params.id);
        if (!anuncio) {
            return res.status(400).json({ error: "El anuncio no existe." });
        }

        // ✅ Verificar si la subasta aún no ha comenzado o está en curso
        if (anuncio.estadoSubasta !== "activa") {
            console.log("🔹 Guardando oferta automática para la futura subasta.");
            anuncio.ofertasAutomaticas.push({
                usuario: user.username,
                precioMaximo,
                fecha: new Date()
            });
        } else {
            console.log("🔥 Ejecutando puja automática inmediata.");
            anuncio.pujas.push({
                usuario: user.username,
                cantidad: precioMaximo,
                fecha: new Date(),
                automatica: true
            });
        }

        await anuncio.save();

        // Emitir evento de actualización solo si la subasta ya está activa
        if (anuncio.estadoSubasta === "activa") {
            io.emit("actualizar_pujas", {
                anuncioId: req.params.id,
                pujas: anuncio.pujas
            });
        }

        res.json({ mensaje: "Oferta automática registrada correctamente", anuncio });

    } catch (error) {
        console.error("❌ Error al programar oferta automática:", error);
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
    
    router.get("/:id", async (req, res) => {
        try {
            const anuncio = await Anuncio.findById(req.params.id);
            if (!anuncio) {
                return res.status(404).render("error", { mensaje: "Anuncio no encontrado" });
            }
    
            res.render("detalleAnuncio", { anuncio, user: req.session.user });
        } catch (error) {
            console.error("Error al obtener el anuncio:", error);
            res.status(500).render("error", { mensaje: "Error al cargar el anuncio" });
        }
    });
    



    return router;
};
