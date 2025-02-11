const mongoose = require("../index");

const AnuncioSchema = new mongoose.Schema({
    autor: { type: String, required: true }, // Nombre del usuario que lo publicó
    titulo: { type: String, required: true },
    descripcion: { type: String, required: true },
    precio: { type: Number, required: true },
    ubicacion: { type: String, required: true },
    imagen: { type: String, required: true },
    categoria: { type: String, required: true },
    fechaPublicacion: { type: Date, default: Date.now },
    inscritos: [{ type: String, required: true }],// Lista de usuarios inscritos
    fechaExpiracion: { type: Date, required: true } // Se calculará al crear el anuncio
});

const Anuncio = mongoose.model("Anuncio", AnuncioSchema);
module.exports = Anuncio;
