const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const reseñaSchema = new mongoose.Schema({
    autor: { type: String, required: true },
    comentario: { type: String, required: true },
    puntuacion: { type: Number, required: true, min: 1, max: 5 },
    fecha: { type: Date, default: Date.now },
    anuncioId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Anuncio" } // ✅ Se asegura que anuncioId es obligatorio
});




const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    nombre_real: { type: String, required: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    imagen_perfil: { type: String, default: "/images/avatar.webp" },
    email: { type: String, unique: true, required: true },
    dni_path: { type: String, required: true },
    verificado: { type: Boolean, default: false },
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
