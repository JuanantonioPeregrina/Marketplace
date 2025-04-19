const express = require('express');
const router = express.Router();
const Usuario = require('../database/models/user.model');

router.get('/:username', async (req, res) => {
    try {
      const usuario = await Usuario.findOne({ username: req.params.username });
  
      if (!usuario) return res.status(404).send('Usuario no encontrado');
  
      const reseñasComoInscrito = usuario.reseñas.filter(r => r.rol === 'proveedor');
      const reseñasComoAnunciante = usuario.reseñas.filter(r => r.rol === 'anunciante');
  
      res.render('perfil-publico', {
        title: `Perfil de ${usuario.username}`,
        usuario,
        reseñasComoInscrito,
        reseñasComoAnunciante,
        user: req.session.user || null  // 🔥 AÑADIDO: evita el error
      });
    } catch (error) {
      console.error("❌ Error al cargar perfil público:", error);
      res.status(500).send("Error al cargar perfil público");
    }
  });
  

module.exports = router;
