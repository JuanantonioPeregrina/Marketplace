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
    fechaPublicacion: { type: Date, default: Date.now },
    inscritos: [{ type: String, required: true }],
    fechaExpiracion: { type: Date, required: true },
    fechaInicioSubasta: { type: Date, required: false },
    estadoSubasta: { type: String, enum: ["pendiente", "activa", "finalizada"], default: "pendiente" },
    
    // 🔹 Nueva propiedad para ofertas automáticas
    ofertasAutomaticas: [
        {
            usuario: String,
            precioMaximo: Number,
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
    ]
    });


const Anuncio = mongoose.model("Anuncio", AnuncioSchema);
module.exports = Anuncio;
