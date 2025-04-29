const express = require('express');
const router = express.Router();
const SoporteChat = require('../database/models/soporte.model');
const { soloAdmins } = require('../middlewares/auth');

function soloUsuarios(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/', soloUsuarios, async (req, res) => {
  const user = req.session.user;
  const username = user?.username || `Invitado-${req.sessionID.slice(0, 5)}`;

  if (user?.rol === 'admin') {
    const chats = await SoporteChat.find({
      participantes: { $in: ['admin'] },
      'mensajes.0': { $exists: true }
    });

    const usuariosUnicos = new Map();

    chats.forEach(c => {
      const otro = c.participantes.find(p => p && p !== 'admin' && p.toLowerCase() !== 'soporte');
      const last = c.mensajes.at(-1);

      if (otro && !usuariosUnicos.has(otro)) {
        usuariosUnicos.set(otro, {
          nombre: otro,
          ultimoMensaje: last?.contenido || '',
          fecha: last?.fecha?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''
        });
      }
    });

    const listaChats = Array.from(usuariosUnicos.values());
    const primerUsuario = listaChats[0]?.nombre;

    let conversacion = null;
    if (primerUsuario) {
      const chat = await SoporteChat.findOne({ participantes: { $all: ['admin', primerUsuario] } });
      conversacion = {
        nombre: primerUsuario,
        mensajes: chat?.mensajes || []
      };
    }

    return res.render('soporte', {
      user,
      chats: listaChats,
      conversacion,
      mensajesJSON: conversacion?.mensajes || [],
      usuarioNombre: user.username || '',
      conversacionActiva: conversacion?.nombre || '',
      title: 'Soporte'
    });
  }

  // Usuario normal
  let chat = await SoporteChat.findOne({ participantes: { $all: [username, 'admin'] } });

  if (!chat) {
    chat = new SoporteChat({ participantes: [username, 'admin'], mensajes: [] });
    await chat.save();
  }

  return res.render('soporte', {
    user,
    chats: [{
      nombre: 'soporte',
      ultimoMensaje: chat.mensajes.at(-1)?.contenido || '',
      fecha: chat.mensajes.at(-1)?.fecha?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''
    }],
    conversacion: {
      nombre: 'soporte',
      mensajes: chat.mensajes
    },
    mensajesJSON: chat.mensajes || [],
    usuarioNombre: user.username || username,
    conversacionActiva: 'soporte',
    title: 'Soporte'
  });
});

router.get('/:nombre', soloUsuarios, soloAdmins, async (req, res) => {
  const user = req.session.user;
  const username = req.params.nombre;

  const participantes = ['admin', username].sort(); // 🔑

  const chat = await SoporteChat.findOne({
    participantes,
    'mensajes.0': { $exists: true }
  });

  if (!chat) return res.redirect('/soporte');

  const todosLosChats = await SoporteChat.find({
    participantes: { $in: ['admin'] },
    'mensajes.0': { $exists: true }
  });

  const usuariosUnicos = new Map();

  todosLosChats.forEach(c => {
    const otro = c.participantes.find(p => p && p !== 'admin' && p.toLowerCase() !== 'soporte');
    const last = c.mensajes.at(-1);
    if (otro && !usuariosUnicos.has(otro)) {
      usuariosUnicos.set(otro, {
        nombre: otro,
        ultimoMensaje: last?.contenido || '',
        fecha: last?.fecha?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''
      });
    }
  });

  const listaChats = Array.from(usuariosUnicos.values());

  return res.render('soporte', {
    user,
    chats: listaChats,
    conversacion: {
      nombre: username,
      mensajes: chat.mensajes
    },
    mensajesJSON: chat.mensajes || [],
    usuarioNombre: user.username || '',
    conversacionActiva: username,
    title: 'Soporte'
  });
});



module.exports = router;
