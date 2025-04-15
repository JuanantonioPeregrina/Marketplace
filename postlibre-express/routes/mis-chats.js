const express = require("express");
const router = express.Router();
const Chat = require("../database/models/chat.model");
const Anuncio = require("../database/models/anuncio.model");

function soloUsuarios(req, res, next) {
    if (!req.session.user) return res.redirect("/login");
    next();
}

router.get("/", soloUsuarios, async (req, res) => {
    const usuario = req.session.user.username;

    try {
        // Buscar todos los chats donde el usuario es remitente o destinatario
        const chats = await Chat.find({
            $or: [
                { remitente: usuario },
                { destinatario: usuario }
            ]
        }).lean();

        // Opcional: traer títulos de anuncios
        const anuncioIds = chats.map(c => c.anuncioId);
        const anuncios = await Anuncio.find({ _id: { $in: anuncioIds } }).lean();

        // Mapeamos para mostrar info útil
        const listaChats = chats.map(chat => {
            const otro = chat.remitente === usuario ? chat.destinatario : chat.remitente;
            const anuncio = anuncios.find(a => a._id.toString() === chat.anuncioId);
            const ultimo = chat.mensajes.at(-1);

            return {
                id: chat._id,
                anuncioId: chat.anuncioId,
                titulo: anuncio?.titulo || "(Anuncio eliminado)",
                con: otro,
                ultimoMensaje: ultimo?.contenido || '',
                fecha: ultimo?.fecha?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''
            };
        });

        res.render("mis-chats", {
            title: "Mis Chats",
            user: req.session.user,
            chats: listaChats
        });

    } catch (error) {
        console.error("❌ Error cargando chats del usuario:", error);
        res.status(500).send("Error al cargar los chats.");
    }
});

module.exports = router;
