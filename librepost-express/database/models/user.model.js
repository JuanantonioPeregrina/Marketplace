
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    nombre_real: { type: String, required: true }, // Nombre real obligatorio
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    imagen_perfil: { type: String, default: "/images/avatar.webp" }, // Campo para la imagen de perfil
    email: { type: String, unique: true, required: true }, // campo para email
    dni_path: { type: String, required: true }, //  ruta del DNI
    verificado: { type: Boolean, default: false } // Estado de verificación
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
