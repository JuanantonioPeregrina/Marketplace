const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const Jimp = require("jimp");
const sharp = require("sharp");
const User = require("../database/models/user.model");
const fs = require("fs");

const router = express.Router();

// 📌 Función para limpiar texto OCR y eliminar ruido
function limpiarTextoOCR(texto) {
    return texto
        .toUpperCase()
        .replace(/[^A-ZÁÉÍÓÚÑ0-9 ]/g, "") // Solo letras y números
        .replace(/\s+/g, " ") // Eliminar espacios extra
        .replace(/DOCUMENTO NACIONAL IDENTIDAD|NATIONAL IDENTITY CARD|SCANNED WITH|CAMSSCANNER|EMISIÓN VALIDEZ|NUM SOPORTE/g, "")
        .trim();
}

// 📌 Mejorar imagen antes del OCR
async function mejorarImagen(imagePath) {
    try {
        const processedPath = imagePath.replace(".jpg", "_procesado.jpg");

        await sharp(imagePath)
            .grayscale()
            .sharpen()
            .threshold(128)
            .resize(1000, 650) // Ajustar tamaño para mejorar OCR
            .toFile(processedPath);

        console.log(`📄 Imagen preprocesada guardada en: ${processedPath}`);
        return processedPath;
    } catch (error) {
        console.error("❌ Error mejorando la imagen:", error);
        throw error;
    }
}

// 📌 Extraer texto desde imagen con OCR mejorado
async function extraerTextoDesdeImagen(imagePath) {
    try {
        const processedPath = await mejorarImagen(imagePath);
        console.log(`📄 Ejecutando OCR en la imagen procesada: ${processedPath}`);

        const { data } = await Tesseract.recognize(processedPath, "spa", {
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ 0123456789",
            psm: 6,
            oem: 1
        });

        fs.unlinkSync(processedPath); // Eliminar imagen procesada después del OCR
        return limpiarTextoOCR(data.text);
    } catch (error) {
        console.error("❌ Error en OCR:", error);
        throw error;
    }
}

// 📌 Configuración de multer para almacenamiento del DNI
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads/dni/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// 📌 Ruta para mostrar el formulario de registro
router.get("/", (req, res) => {
    res.render("registro", { title: "Registro - LibrePost", user: req.user || null });
});

// 📌 Ruta para procesar el registro con verificación del DNI
router.post("/", upload.single("dni_file"), async (req, res) => {
    const { nombre_real, username, email, password } = req.body;
    let dni_path = req.file ? req.file.path : null;

    if (!dni_path) {
        return res.status(400).send("Debes adjuntar tu DNI.");
    }

    try {
        console.log("📄 Extrayendo texto con OCR...");
        let text = await extraerTextoDesdeImagen(dni_path);
        console.log("🔍 Texto extraído del DNI:", text);

        const nombreNormalizado = limpiarTextoOCR(nombre_real);
        let wordsInOCR = text.split(" ");
        let wordsInName = nombreNormalizado.split(" ");
        let matches = wordsInName.filter(word => wordsInOCR.includes(word)).length;
        let similarity = matches / wordsInName.length;
        console.log(`🔎 Similaridad calculada: ${similarity}`);

        if (similarity < 0.3) {
            fs.unlinkSync(dni_path);
            return res.status(400).send("El nombre en el DNI no coincide con el ingresado.");
        }

        // 🔒 Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 📌 Guardar usuario en la base de datos
        const newUser = new User({
            nombre_real,
            username,
            email,
            password: hashedPassword,
            dni_path,
            verificado: true
        });

        await newUser.save();
        console.log("✅ Usuario registrado y verificado:", username);
        res.redirect("/login");
    } catch (error) {
        console.error("❌ Error en el registro:", error);
        res.status(500).send("Error en el registro.");
    }
});

module.exports = router;
