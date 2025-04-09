const express = require('express');
const router = express.Router();
const SoporteChat = require('../database/models/soporte.model');

// Ruta: Lista de chats
router.get('/', async (req, res) => {
  const username = req.session.user?.username || `Invitado-${req.sessionID.slice(0, 5)}`;

  const chats = await SoporteChat.find({ participantes: username });

  const listaChats = chats.map(chat => {
    const last = chat.mensajes[chat.mensajes.length - 1];
    const otro = chat.participantes.find(p => p !== username);
    return {
      _id: chat._id,
      nombre: otro,
      ultimoMensaje: last?.contenido || '',
      fecha: last?.fecha?.toLocaleDateString('es-ES') || ''
    };
  });

  
  res.render('soporte', {
    user: req.session.user,
    chats: listaChats,
    conversacion: null,
    title: 'Soporte'
  });
});

// Ruta: Ver conversación específica
router.get('/:id', async (req, res) => {
  const username = req.session.user?.username || `Invitado-${req.sessionID.slice(0, 5)}`;
  const chat = await SoporteChat.findById(req.params.id);

  const otro = chat.participantes.find(p => p !== username);

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
      nombre: otro,
      mensajes: chat.mensajes
    },
    title: 'Soporte'
  });
});

// Ruta: Enviar mensaje
router.post('/:id', async (req, res) => {
  const username = req.session.user?.username || `Invitado-${req.sessionID.slice(0, 5)}`;
  const contenido = req.body.contenido;

  await SoporteChat.findByIdAndUpdate(req.params.id, {
    $push: {
      mensajes: { remitente: username, contenido, fecha: new Date() }
    }
  });

  res.redirect('/soporte/' + req.params.id);
});

module.exports = router;
