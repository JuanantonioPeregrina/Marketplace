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

module.exports = router;
