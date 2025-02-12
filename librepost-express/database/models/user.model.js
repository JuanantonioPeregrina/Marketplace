
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const reseñaSchema = new mongoose.Schema({
    autor: { type: String, required: true }, // Quién deja la reseña
    comentario: { type: String, required: true },
    puntuacion: { type: Number, required: true, min: 1, max: 5 }, // De 1 a 5 estrellas
    fecha: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    nombre_real: { type: String, required: true }, // Nombre real obligatorio
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    imagen_perfil: { type: String, default: "/images/avatar.webp" }, // Campo para la imagen de perfil
    email: { type: String, unique: true, required: true }, // campo para email
    dni_path: { type: String, required: true }, //  ruta del DNI
    verificado: { type: Boolean, default: false }, // Estado de verificación
    reseñas: { type: [reseñaSchema], default: [] }
});


// Middleware para hashear la contraseña antes de guardar
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
