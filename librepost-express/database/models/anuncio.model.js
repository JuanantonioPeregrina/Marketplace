const mongoose = require("../index");

const AnuncioSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    descripcion: { type: String, required: true },
    precio: { type: Number, required: true },
    imagen: { type: String, required: true },
    categoria: { type: String, required: true },
    fechaPublicacion: { type: Date, default: Date.now }
});

const Anuncio = mongoose.model("Anuncio", AnuncioSchema);
module.exports = Anuncio;
