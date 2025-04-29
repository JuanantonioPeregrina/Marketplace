const mongoose = require("../index");

const MensajeSchema = new mongoose.Schema({
    remitente: String,
    contenido: String,
    fecha: { type: Date, default: Date.now }
});

const SoporteChatSchema = new mongoose.Schema({
    participantes: [String], // IDs únicos (p. ej. socket.id o user.email si luego quieres)
    mensajes: [MensajeSchema]
});

module.exports = mongoose.model("SoporteChat", SoporteChatSchema);
