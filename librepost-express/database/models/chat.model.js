const mongoose = require("../index");

const ChatSchema = new mongoose.Schema({
    anuncioId: { type: String, required: true },
    remitente: { type: String, required: true },
    destinatario: { type: String, required: true },
    contenido: { type: String, required: true },
    fecha: { type: Date, default: Date.now }
});

const Chat = mongoose.model("Chat", ChatSchema);
module.exports = Chat;
