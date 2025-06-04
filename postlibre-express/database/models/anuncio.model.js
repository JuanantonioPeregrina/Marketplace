const mongoose = require("../index");

const AnuncioSchema = new mongoose.Schema({
  autor: { type: String, required: true },
  titulo: { type: String, required: true },
  descripcion: { type: String, required: true },
  precioInicial: { type: Number, required: true },
  precioActual: { type: Number, required: true },
  ubicacion: { type: String, required: true },
  imagen: { type: String, required: true },
  categoria: { type: String, required: true },
  // Nuevo campo para distinguir tipo de subasta: holandesa (descendente) o inglesa (ascendente)
  auctionType: {
    type: String,
    enum: ['holandesa', 'inglesa'],
    required: true,
    default: 'holandesa'
  },
  fechaPublicacion: { type: Date, default: Date.now },
  inscritos: [{ type: String, required: true }],
  confirmacion: {
    autor: { type: Boolean, default: false },
    inscrito: { type: Boolean, default: false }
  }, 
  fechaInicioSubasta: { type: Date, required:true },
  fechaExpiracion: { type: Date, required: false },

  // Parámetros para subasta holandesa

  // Parámetros para subasta inglesa
  inglesaIncremento: {
    type: Number,
    required: function() { return this.auctionType === 'inglesa'; }
  },
  inglesaIntervalo: {
    type: Number,
    required: function() { return this.auctionType === 'inglesa'; }
  },
  inglesaDuracion: {
    type: Number,
    required: function() { return this.auctionType === 'inglesa'; }
  },
  // Usamos el mismo campo “precioReserva” para la inglesa
    precioReserva: {
    type: Number,
    required: function() { return this.auctionType === 'inglesa'; }
  },

  estadoSubasta: {
    type: String,
    enum: ["pendiente", "activa", "finalizada"],
    default: "pendiente"
  },
  estado: {
    type: String,
    enum: ["en_subasta", "esperando_inicio", "en_produccion", "finalizado"],
    default: "esperando_inicio"
  },

  ofertasAutomaticas: [
    {
      usuario: String,
      precioMaximo: Number,
      incrementoPaso:{ //nuevo campo solo relevante para inglesa
        type: Number,
        required: function () {
          return this.auctionType === 'inglesa';
        }
      },
        fecha: Date
    }
  ],
  pujas: [
    {
      usuario: String,
      cantidad: Number,
      fecha: { type: Date, default: Date.now },
      automatica: { type: Boolean, default: false }
    }
  ],
  inscritoGanador: { type: String } // (puede ser null por defecto)

});

module.exports = mongoose.model("Anuncio", AnuncioSchema);
