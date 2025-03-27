const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const PLAN_LIMITS = {
    Free: 1000,
    Basic: 10000,
    Pro: 100000,
    Enterprise: Infinity
};

const apiKeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    plan: { type: String, enum: ["Free", "Basic", "Pro", "Enterprise"], default: "Free" },
    usage: { type: Number, default: 0 },
    limit: { type: Number, default: PLAN_LIMITS.Free }, // Se asigna el límite de peticiones por defecto
    createdAt: { type: Date, default: Date.now }
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
    reseñas: { type: Array, default: [] },
    recibirSugerencias: { type: Boolean, default: false },
    apiKeys: { type: [apiKeySchema], default: [] } // Múltiples API Keys permitidas
});

// 🔹 Middleware para hashear la contraseña y generar API Key al crear usuario
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        // Hashear contraseña
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);

        // Agregar API Key por defecto solo si no tiene ninguna
        if (this.apiKeys.length === 0) {
            this.apiKeys.push({
                key: uuidv4(),
                plan: "Free",
                limit: PLAN_LIMITS.Free,
                usage: 0
            });
        }

        next();
    } catch (err) {
        next(err);
    }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
