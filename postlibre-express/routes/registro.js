const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const pdf2pic = require("pdf2pic");
const User = require("../database/models/user.model");
const fs = require("fs");
const path = require("path");
const enviarCorreo = require("../utils/email");

const router = express.Router();

// Función para limpiar texto OCR y eliminar ruido
function limpiarTextoOCR(texto) {
    return texto
        .toUpperCase()
        .replace(/[^A-ZÁÉÍÓÚÑ0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .replace(/DOCUMENTO NACIONAL IDENTIDAD|NATIONAL IDENTITY CARD|SCANNED WITH|CAMSSCANNER|EMISIÓN VALIDEZ|NUM SOPORTE/g, "")
        .trim();
}

//Mejorar imagen antes del OCR
async function mejorarImagen(imagePath) {
    try {
        const extension = path.extname(imagePath);
        const processedPath = imagePath.replace(extension, `_procesado${extension}`);

        await sharp(imagePath)
            .grayscale()
            .sharpen()
            .threshold(120)
            .resize(1200, 800, { fit: "inside" })
            .toFile(processedPath);

        console.log(`Imagen preprocesada guardada en: ${processedPath}`);
        return processedPath;
    } catch (error) {
        console.error("Error mejorando la imagen:", error);
        throw error;
    }
}

// Convertir PDF a Imagen
async function convertirPDFaImagen(pdfPath) {
    const outputDir = path.dirname(pdfPath);
    const imagePath = path.join(outputDir, `${Date.now()}_pdf_to_image.png`);

    try {
        console.log(`Convirtiendo PDF a imagen: ${pdfPath} → ${imagePath}`);
        const converter = pdf2pic.fromPath(pdfPath, {
            density: 300,
            savePath: outputDir,
            format: "png",
            width: 1000
        });

        const [result] = await converter(1, { responseType: "image" });

        if (!result.path) throw new Error("No se pudo generar la imagen a partir del PDF.");

        fs.unlinkSync(pdfPath);
        console.log(`Archivo PDF eliminado: ${pdfPath}`);

        return result.path;
    } catch (error) {
        console.error("Error al convertir PDF a imagen:", error);
        throw error;
    }
}

// Extraer texto desde imagen con OCR mejorado
async function extraerTextoDesdeImagen(imagePath) {
    try {
        const processedPath = await mejorarImagen(imagePath);
        console.log(`📄 Ejecutando OCR en la imagen procesada: ${processedPath}`);

        const { data } = await Tesseract.recognize(processedPath, "spa+eng", {
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ0123456789 ",
            psm: 6,
            oem: 1
        });

        fs.unlinkSync(processedPath);
        return limpiarTextoOCR(data.text);
    } catch (error) {
        console.error("Error en OCR:", error);
        throw error;
    }
}

// Configuración de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "public/uploads/dni/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error("Formato de archivo no permitido. Usa JPG, PNG, WEBP o PDF."), false);
        }
        cb(null, true);
    }
});

// Mostrar formulario de registro
router.get("/", (req, res) => {
    res.render("registro", { title: "Registro - LibrePost", user: req.user || null });
});

//Procesar el registro
router.post("/", upload.single("dni_file"), async (req, res) => {
    try {
        const { username, password, email, nombre_real } = req.body;
        let dni_path = req.file ? req.file.path : null;
        if (!dni_path) return res.status(400).send("Debes adjuntar tu DNI.");

        console.log("📄 Extrayendo texto con OCR...");
        if (dni_path.endsWith(".pdf")) {
            console.log("📄 Archivo PDF detectado, convirtiendo a imagen...");
            dni_path = await convertirPDFaImagen(dni_path);
        }

        const text = await extraerTextoDesdeImagen(dni_path);
        console.log("🔍 Texto extraído del DNI:", text);

        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).send("El usuario ya existe");

        

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const newUser = new User({
            username,
            password,
            email,
            nombre_real,
            dni_path,
            codigoVerificacion: verificationCode,
            verificado: false
        });

        await newUser.save();
        console.log("Usuario registrado:", username);

        await enviarCorreo({
            to: newUser.email,
            subject: "Tu código de verificación - LibrePost",
            html: `
                <h2>¡Gracias por registrarte en LibrePost!</h2>
                <p>Tu código de verificación es:</p>
                <h1 style="color: #007bff;">${verificationCode}</h1>
                <p>Introduce este código en la página de verificación para activar tu cuenta.</p>
            `
        });

        res.redirect(`/verificar-email?email=${encodeURIComponent(newUser.email)}`);
    } catch (error) {
        console.error("Error en el registro:", error);
        res.status(500).send("Error en el registro.");
    }
});

module.exports = router;

