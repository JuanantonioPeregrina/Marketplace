const express = require('express');
const router = express.Router();
const SoporteChat = require('../database/models/soporte.model');

// Middleware para restringir acceso solo a usuarios autenticados
function soloUsuarios(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

router.get('/', soloUsuarios, async (req, res) => {
  const username = req.session.user?.username || `Invitado-${req.sessionID.slice(0, 5)}`;

  let chat = await SoporteChat.findOne({ participantes: { $in: [username] } });

  // Si no hay chat, lo creamos automáticamente
  if (!chat) {
    chat = new SoporteChat({
      participantes: [username, 'soporte'], 
      mensajes: []
    });
    await chat.save();
  }

  const chats = await SoporteChat.find({ participantes: username });

  const listaChats = chats.map(c => {
    const last = c.mensajes[c.mensajes.length - 1];
    const otro = c.participantes.find(p => p !== username);
    return {
      _id: c._id,
      nombre: otro,
      ultimoMensaje: last?.contenido || '',
      fecha: last?.fecha?.toLocaleDateString('es-ES') || ''
    };
  });

  res.render('soporte', {
    user: req.session.user,
    chats: listaChats,
    conversacion: {
      nombre: chat.participantes.find(p => p !== username),
      mensajes: chat.mensajes
    },
    title: 'Soporte'
  });
});


module.exports = router;
