const mongoose = require("../index");

const MensajeSchema = new mongoose.Schema({
    remitente: String,
    contenido: String,
    fecha: { type: Date, default: Date.now }
});

const SoporteChatSchema = new mongoose.Schema({
    participantes: [String], // IDs únicos 
});

module.exports = mongoose.model("SoporteChat", SoporteChatSchema);
