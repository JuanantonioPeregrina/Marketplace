const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../database/models/user.model");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Configurar almacenamiento de `multer`
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads/dni/"); // Guardar en la carpeta 'public/uploads/dni/'
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Página de registro
router.get("/", (req, res) => {
    res.render("registro", { title: "Registro - LibrePost", user: req.session.user || null });
});

// Manejo del formulario de registro
router.post("/", upload.single("dni_file"), async (req, res) => {
    const { nombre_real, username, email, password } = req.body;

    // Validar que el archivo del DNI se ha subido correctamente
    if (!req.file) {
        return res.status(400).send("Debe adjuntar una copia del DNI.");
    }

    try {
        // Verifica si el usuario ya existe
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).send("El usuario ya existe");
        }

        // Verificar que el nombre coincide con el DNI (puedes mejorarlo usando OCR más adelante)
        if (nombre_real.toLowerCase() !== username.toLowerCase()) {
            return res.status(400).send("El nombre de usuario debe coincidir con el nombre del DNI.");
        }

        // Guardar usuario en la base de datos
        const newUser = new User({ 
            nombre_real,
            username, 
            email,
            password, 
            dni_path: `/uploads/dni/${req.file.filename}` // Guardar la ruta del archivo
        });

        await newUser.save();
        console.log("✅ Usuario registrado correctamente:", username);

        res.redirect("/login"); // Redirigir al login tras el registro

    } catch (error) {
        console.error("❌ Error en el registro:", error);
        res.status(500).send("Error en el registro.");
    }
});

module.exports = router;
