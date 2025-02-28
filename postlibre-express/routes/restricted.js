const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {
  res.render('restricted', { user: req.session.user || { username: "Invitado" }, title: "LibrePost", imagen_perfil: req.session.user ? req.session.user.imagen_perfil : "/images/avatar.webp" }); //user: req.session.user es el usuario que se logueó
});

module.exports = router;
