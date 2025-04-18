const express = require('express');
const router = express.Router();

// GET formulario
router.get('/', (req, res) => {
  res.render('feedback');
});

// POST feedback recibido
router.post('/', async (req, res) => {
  const { nombre, correo, valoracion, comentario } = req.body;
  console.log("📬 Nuevo feedback recibido:", { nombre, correo, valoracion, comentario });

  // Aquí podrías guardar en MongoDB o enviar un correo...
  res.send('<h2>¡Gracias por tu feedback! 😄</h2><a href="/">Volver al inicio</a>');
});

module.exports = router;
