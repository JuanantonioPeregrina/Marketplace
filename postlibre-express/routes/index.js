const express = require('express');
const router = express.Router();

// Ruta principal
router.get('/', (req, res) => {
  res.render('index', { user: req.session.user, title: 'LibrePost', message: 'Bienvenido a LibrePost', player: 'Invitado', notificaciones: 0 });
});

module.exports = router;
                     