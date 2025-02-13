const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const pdf2pic = require("pdf2pic");
const User = require("../database/models/user.model");
const fs = require("fs");
const path = require("path");

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
        const extension = path.extname(imagePath);
        const processedPath = imagePath.replace(extension, `_procesado${extension}`);

        await sharp(imagePath)
            .grayscale()
            .sharpen()
            .threshold(120) // Ajustado para mejorar OCR sin perder texto
            .resize(1200, 800, { fit: "inside" }) // Mantiene proporciones adecuadas para OCR
            .toFile(processedPath);

        console.log(`📄 Imagen preprocesada guardada en: ${processedPath}`);
        return processedPath;
    } catch (error) {
        console.error("❌ Error mejorando la imagen:", error);
        throw error;
    }
}

// 📌 Convertir PDF a Imagen (Extrae la primera página del PDF)
async function convertirPDFaImagen(pdfPath) {
    const outputDir = path.dirname(pdfPath);
    const imagePath = path.join(outputDir, `${Date.now()}_pdf_to_image.png`);

    try {
        console.log(`📄 Convirtiendo PDF a imagen: ${pdfPath} → ${imagePath}`);
        const converter = pdf2pic.fromPath(pdfPath, {
            density: 300,
            savePath: outputDir,
            format: "png",
            width: 1000
        });

        const [result] = await converter(1, { responseType: "image" }); // Solo tomamos la primera página

        if (!result.path) {
            throw new Error("No se pudo generar la imagen a partir del PDF.");
        }

        fs.unlinkSync(pdfPath); // Eliminamos el PDF original después de la conversión
        console.log(`🗑 Archivo PDF eliminado: ${pdfPath}`);

        return result.path; // Devolver la ruta de la imagen generada
    } catch (error) {
        console.error("❌ Error al convertir PDF a imagen:", error);
        throw error;
    }
}

// 📌 Extraer texto desde imagen con OCR mejorado
async function extraerTextoDesdeImagen(imagePath) {
    try {
        const processedPath = await mejorarImagen(imagePath);
        console.log(`📄 Ejecutando OCR en la imagen procesada: ${processedPath}`);

        const { data } = await Tesseract.recognize(processedPath, "spa+eng", {
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ0123456789 ",
            psm: 6,
            oem: 1
        });

        fs.unlinkSync(processedPath); // Eliminamos la imagen procesada después del OCR
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
const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error("Formato de archivo no permitido. Usa JPG, PNG, WEBP o PDF."), false);
        }
        cb(null, true);
    }
});

// 📌 Ruta para mostrar el formulario de registro (NO SE MODIFICA)
router.get("/", (req, res) => {
    res.render("registro", { title: "Registro - LibrePost", user: req.user || null });
});

// 📌 Ruta para procesar el registro (NO SE MODIFICA, SOLO SE AÑADE OCR)
router.post("/", upload.single("dni_file"), async (req, res) => {
    try {
        const { username, password, email, nombre_real } = req.body;
        let dni_path = req.file ? req.file.path : null;

        if (!dni_path) {
            return res.status(400).send("Debes adjuntar tu DNI.");
        }

        console.log("📄 Extrayendo texto con OCR...");

        // Si es PDF, convertir a imagen
        if (dni_path.endsWith(".pdf")) {
            console.log("📄 Archivo PDF detectado, convirtiendo a imagen...");
            dni_path = await convertirPDFaImagen(dni_path);
        }

        // Realizar OCR en la imagen
        const text = await extraerTextoDesdeImagen(dni_path);
        console.log("🔍 Texto extraído del DNI:", text);

        // 📌 Validar si el usuario ya existe
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).send("El usuario ya existe");
        }

        // 📌 Hashear contraseña antes de guardar
        const hashedPassword = await bcrypt.hash(password, 10);

        // 📌 Guardar usuario en la base de datos
        const newUser = new User({ username, password, email, nombre_real, dni_path });

        await newUser.save();
        console.log("✅ Usuario registrado:", username);
        res.redirect("/login");
    } catch (error) {
        console.error("❌ Error en el registro:", error);
        res.status(500).send("Error en el registro.");
    }
});

module.exports = router;
