const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  nombre: String,
  correo: String,
  valoracion: Number,
  comentario: String,
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('feedback', feedbackSchema);
