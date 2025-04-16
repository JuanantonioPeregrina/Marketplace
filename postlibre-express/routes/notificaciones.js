const express = require("express");
const router = express.Router();
const Chat = require("../database/models/chat.model");

router.get("/contador", async (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, notificaciones: 0 });
    }

    const username = req.session.user.username;

    try {
        const sinLeer = await Chat.aggregate([
            {
                $match: {
                    $or: [
                        { remitente: username },
                        { destinatario: username }
                    ]
                }
            },
            { $unwind: "$mensajes" },
            {
                $match: {
                    "mensajes.leido": false,
                    "mensajes.remitente": { $ne: username }
                }
            },
            {
                $count: "noLeidos"
            }
        ]);

        const totalNoLeidos = sinLeer[0]?.noLeidos || 0;

        return res.json({ success: true, notificaciones: totalNoLeidos });
    } catch (error) {
        console.error(" Error contando notificaciones:", error);
        return res.json({ success: false, notificaciones: 0 });
    }
});
router.get("/listado", async (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, mensajes: [] });
    }

    const username = req.session.user.username;

    try {
        const chats = await Chat.find({
            $or: [{ remitente: username }, { destinatario: username }]
        });

        const mensajesNoLeidos = [];

        for (const chat of chats) {
            chat.mensajes.forEach(m => {
                if (!m.leido && m.remitente !== username) {
                    mensajesNoLeidos.push({
                        remitente: m.remitente,
                        fecha: m.fecha,
                        anuncioId: chat.anuncioId
                    });
                }
            });
        }

        res.json({ success: true, mensajes: mensajesNoLeidos });

    } catch (error) {
        console.error(" Error obteniendo notificaciones:", error);
        return res.json({ success: false, mensajes: [] });
    }
});

router.post("/marcar-todas", async (req, res) => {
    if (!req.session.user) {
      return res.json({ success: false });
    }
  
    const username = req.session.user.username;
  
    try {
      await Chat.updateMany(
        {
          mensajes: {
            $elemMatch: {
              leido: false,
              remitente: { $ne: username }
            }
          },
          $or: [
            { remitente: username },
            { destinatario: username }
          ]
        },
        {
          $set: { "mensajes.$[elem].leido": true }
        },
        {
          arrayFilters: [{ "elem.remitente": { $ne: username } }],
          multi: true
        }
      );
  
      return res.json({ success: true });
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
      return res.json({ success: false });
    }
  });
  

module.exports = router;
