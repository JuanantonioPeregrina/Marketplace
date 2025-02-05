/*const express = require("express");
const router = express.Router();
const Chat = require("../database/models/chat.model");
const io = require("../app").io; // Importamos socket.io

// Obtener mensajes del chat de un anuncio
router.get("/:anuncioId", async (req, res) => {
    const mensajes = await Chat.find({ anuncioId: req.params.anuncioId }).sort({ fecha: 1 });
    res.json(mensajes);
});

// Enviar un mensaje
router.post("/:anuncioId", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Debes iniciar sesión para enviar mensajes.");
    }

    const nuevoMensaje = new Chat({
        anuncioId: req.params.anuncioId,
        remitente: req.session.user.username,
        destinatario: req.body.destinatario,
        contenido: req.body.contenido
    });

    await nuevoMensaje.save();

    // Emitir mensaje en tiempo real
    io.emit(`mensaje-${req.params.anuncioId}`, nuevoMensaje);

    res.json({ message: "Mensaje enviado." });
});

module.exports = router;
*/
const express = require("express");
const router = express.Router();
const Chat = require("../database/models/chat.model");
const Anuncio = require("../database/models/anuncio.model");

// Ruta para iniciar una conversación
router.post("/iniciar", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Debes iniciar sesión" });
    }

    const { anuncioId, destinatario } = req.body;
    const remitente = req.session.user.username;

    try {
        const anuncio = await Anuncio.findById(anuncioId);
        if (!anuncio) {
            return res.status(404).json({ success: false, message: "Anuncio no encontrado" });
        }

        // Solo el autor del anuncio puede iniciar la conversación
        if (anuncio.autor !== remitente) {
            return res.status(403).json({ success: false, message: "No tienes permiso para iniciar esta conversación" });
        }

        // Verificar si ya existe una conversación entre estos dos usuarios
        let chat = await Chat.findOne({ anuncioId, remitente, destinatario });

        if (!chat) {
            chat = new Chat({ anuncioId, remitente, destinatario, contenido: [] });
            await chat.save();
        }

        res.json({ success: true, chatId: chat._id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error al iniciar la conversación." });
    }
});

// Ruta para cargar el chat

router.get("/", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const username = req.session.user.username;
    const { anuncioId, usuario } = req.query; // Obtener desde la URL

    try {
        // Buscar conversaciones en la base de datos
        const conversaciones = await Chat.find({
            $or: [{ remitente: username }, { destinatario: username }]
        });

        res.render("chat", { 
            title: "Chat - LibrePost",  
            conversaciones, // 🔹 Pasar conversaciones a la vista
            user: req.session.user,
            anuncioId, // ✅ Ahora pasamos el anuncioId
            usuarioDestino: usuario // ✅ Ahora pasamos el destinatario
        });

    } catch (error) {
        console.error("❌ Error al cargar conversaciones:", error);
        res.status(500).send("Error al cargar el chat.");
    }
});


// Ruta para obtener los mensajes de una conversación específica
router.get("/mensajes", async (req, res) => {
    const { anuncioId } = req.query;

    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Debes iniciar sesión" });
    }

    try {
        // Buscar la conversación por `anuncioId`
        const chat = await Chat.findOne({ anuncioId });

        if (!chat) {
            return res.json({ success: true, mensajes: [] }); // Si no hay mensajes, retornar vacío
        }

        res.json({ success: true, mensajes: chat.mensajes });
    } catch (error) {
        console.error("❌ Error recuperando mensajes:", error);
        res.status(500).json({ success: false, message: "Error al recuperar mensajes" });
    }
});


module.exports = router;
