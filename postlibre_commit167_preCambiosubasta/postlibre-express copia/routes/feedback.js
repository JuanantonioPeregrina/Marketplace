const express = require('express');
const router = express.Router();
const Feedback = require('../database/models/feedback'); //importa el modelo

router.get('/', (req, res) => {
  res.render('feedback');
});

router.post('/', async (req, res) => {
  const { nombre, correo, valoracion, comentario } = req.body;

  try {
    const nuevoFeedback = new Feedback({ nombre, correo, valoracion, comentario });
    await nuevoFeedback.save();
    console.log("Feedback guardado en la base de datos");

    res.send('<h2>¡Gracias por tu feedback! 😄</h2><a href="/">Volver al inicio</a>');
  } catch (error) {
    console.error("Error al guardar feedback:", error);
    res.status(500).send('Ocurrió un error al guardar tu feedback.');
  }
});

module.exports = router;