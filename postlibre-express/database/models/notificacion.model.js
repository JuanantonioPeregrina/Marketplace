const mongoose = require("mongoose");

const NotificacionSchema = new mongoose.Schema({
    destinatario: { type: String, required: true },
    anuncioId: { type: String, required: true },
    remitente: { type: String, required: true },
    contenido: { type: String, required: true },
    fecha: { type: Date, default: Date.now },
    leido: { type: Boolean, default: false }
});

const Notificacion = mongoose.model("Notificacion", NotificacionSchema);
module.exports = Notificacion;
