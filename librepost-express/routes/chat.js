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

router.get("/", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    const username = req.session.user.username;

    // Buscar todas las conversaciones en las que participa el usuario
    const conversacionesRaw = await Chat.find({
        $or: [{ remitente: username }, { destinatario: username }]
    });

    // Agrupar por anuncioId y el otro usuario
    const conversaciones = [];
    conversacionesRaw.forEach(chat => {
        const contacto = chat.remitente === username ? chat.destinatario : chat.remitente;
        if (!conversaciones.some(c => c.anuncioId === chat.anuncioId && c.contacto === contacto)) {
            conversaciones.push({
                anuncioId: chat.anuncioId,
                contacto,
                anuncioTitulo: "Título del Anuncio"
            });
        }
    });

    res.render("chat", { conversaciones });
});

module.exports = router;
