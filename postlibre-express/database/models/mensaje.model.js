const mongoose = require("../index");

const MensajeSchema = new mongoose.Schema({
    anuncioId: { type: mongoose.Schema.Types.ObjectId, ref: "Anuncio", required: true },
    remitente: { type: String, required: true }, // Usuario que envía el mensaje
    destinatario: { type: String, required: true }, // Usuario que recibe el mensaje
    contenido: { type: String, required: true },
    fecha: { type: Date, default: Date.now }
});

const Mensaje = mongoose.model("Mensaje", MensajeSchema);
module.exports = Mensaje;
