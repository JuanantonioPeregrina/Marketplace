
const express = require("express");
const router = express.Router();
const Chat = require("../database/models/chat.model");
const Anuncio = require("../database/models/anuncio.model");

router.post("/iniciar", async (req, res) => {
    const { anuncioId, destinatario } = req.body;
    const remitente = req.session.user.username; // Usuario autenticado

    try {
        let chatExistente = await Chat.findOne({
            anuncioId,
            remitente,
            destinatario,
        });

        if (!chatExistente) {
            console.log("🆕 Creando nuevo chat...");
            chatExistente = new Chat({ anuncioId, remitente, destinatario, mensajes: [] });
            await chatExistente.save();
        }

        res.redirect(`/chat?anuncioId=${anuncioId}&usuario=${destinatario}`);
    } catch (error) {
        console.error("❌ Error iniciando chat:", error);
        res.status(500).send("Error al iniciar chat");
    }
});


// Ruta para cargar el chat
router.get("/", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const username = req.session.user.username;
    let { anuncioId, usuario } = req.query;

    try {
        const anuncio = await Anuncio.findById(anuncioId);

        if (!anuncio) {
            return res.status(404).send("Anuncio no encontrado");
        }

        let usuarioDestino = usuario;

        if (username === anuncio.autor && !anuncio.inscritos.includes(usuario)) {
            usuarioDestino = anuncio.inscritos.length > 0 ? anuncio.inscritos[0] : null;
        }

        if (!usuarioDestino) {
            return res.status(400).send("No hay destinatario válido para este chat.");
        }

        // Buscar todas las conversaciones
        const conversaciones = await Chat.find({
            $or: [{ remitente: username }, { destinatario: username }]
        }).lean();

        //Marcar como leídos los mensajes del otro usuario
        await Chat.updateMany(
            {
              anuncioId,
              mensajes: {
                $elemMatch: {
                  leido: false,
                  remitente: { $ne: username }
                }
              }
            },
            {
              $set: { "mensajes.$[elem].leido": true }
            },
            {
              arrayFilters: [{ "elem.remitente": { $ne: username } }],
              multi: true
            }
          );
          

        //Calcular mensajes no leídos
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
          
        // Renderizar con la variable incluida
        res.render("chat", {
            title: "Chat - LibrePost",
            user: req.session.user,
            anuncioId,
            usuarioDestino,
            conversaciones,
            notificaciones: totalNoLeidos // aquí pasa la variable al EJS
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
        console.error("Error recuperando mensajes:", error);
        res.status(500).json({ success: false, message: "Error al recuperar mensajes" });
    }
});


module.exports = router;
