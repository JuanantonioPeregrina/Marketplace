const mongoose = require("../index");

const ChatSchema = new mongoose.Schema({
    anuncioId: { type: String, required: true },
    remitente: { type: String, required: true }, // Autor del anuncio
    destinatario: { type: String, required: true }, // Usuario inscrito
    mensajes: [{ 
        remitente: String,
        contenido: String,
        fecha: { type: Date, default: Date.now },
        leido: { type: Boolean, default: false }
    }]
});

const Chat = mongoose.model("Chat", ChatSchema);
module.exports = Chat;
