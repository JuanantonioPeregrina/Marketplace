const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const User = require("../database/models/user.model");
const fs = require("fs");
const pdf2json = require("pdf2json");
const { exec } = require("child_process");
const stringSimilarity = require("string-similarity"); // Para comparación flexible

const router = express.Router();

// 📌 Función para limpiar texto OCR y eliminar ruido
function limpiarTextoOCR(texto) {
    return texto
        .toUpperCase() // Convertir a mayúsculas
        .replace(/[^A-ZÁÉÍÓÚÑ ]/g, "") // Eliminar caracteres especiales
        .replace(/\s+/g, " ") // Reemplazar múltiples espacios
        .replace(/DOCUMENTO NACIONAL IDENTIDAD|NATIONAL IDENTITY CARD|SCANNED WITH|CAMSSCANNER|EMISIÓN VALIDEZ|NUM SOPORTE/g, "") // Eliminar palabras innecesarias
        .trim(); // Eliminar espacios al inicio y al final
}

// 📌 Función para extraer texto desde PDF sin OCR
async function extraerTextoDesdePDF(pdfPath) {
    return new Promise((resolve, reject) => {
        const pdfParser = new pdf2json();

        pdfParser.on("pdfParser_dataReady", pdfData => {
            if (!pdfData || !pdfData.formImage || !pdfData.formImage.Pages) {
                console.error("❌ Error: El PDF no contiene datos procesables.");
                return reject("El PDF no pudo ser procesado correctamente.");
            }

            const text = pdfData.formImage.Pages.map(page =>
                page.Texts.map(t => decodeURIComponent(t.R[0].T || "")).join(" ")
            ).join("\n");

            resolve(limpiarTextoOCR(text));
        });

        pdfParser.on("pdfParser_dataError", err => {
            console.error("❌ Error al procesar el PDF:", err);
            reject("No se pudo extraer texto del PDF.");
        });

        pdfParser.loadPDF(pdfPath);
    });
}

// 📌 Función para convertir PDF a imagen y extraer texto con OCR
async function extraerTextoDesdeImagen(pdfPath) {
    return new Promise(async (resolve, reject) => {
        const imagePath = pdfPath.replace(".pdf", ".png");

        console.log(`🔄 Convirtiendo PDF a imagen para OCR: ${pdfPath} → ${imagePath}`);

        exec(`convert -density 300 "${pdfPath}" -quality 100 "${imagePath}"`, async (error) => {
            if (error) {
                console.error("❌ Error al convertir PDF a imagen:", error);
                return reject("No se pudo convertir el PDF a imagen.");
            }

            console.log(`📄 Ejecutando OCR en la imagen: ${imagePath}`);
            try {
                const { data } = await Tesseract.recognize(imagePath, "spa");
                fs.unlinkSync(imagePath); // Eliminar la imagen después del OCR
                resolve(limpiarTextoOCR(data.text));
            } catch (err) {
                console.error("❌ Error en OCR:", err);
                reject("No se pudo extraer texto con OCR.");
            }
        });
    });
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
        let text = "";

        // 🔄 **Si el archivo es un PDF, intenta extraer texto sin OCR**
        if (dni_path.endsWith(".pdf")) {
            console.log("📄 Extrayendo texto del PDF sin conversión...");
            try {
                text = await extraerTextoDesdePDF(dni_path);
            } catch (error) {
                console.log("⚠️ No se pudo extraer texto directamente, usando OCR...");
                text = await extraerTextoDesdeImagen(dni_path);
            }
        } else {
            // 📄 **Si es una imagen, extrae texto con OCR**
            console.log("📄 Extrayendo texto con OCR...");
            const { data } = await Tesseract.recognize(dni_path, "spa");
            text = limpiarTextoOCR(data.text);
        }

        console.log("🔍 Texto extraído del DNI:", text);
        const nombreNormalizado = limpiarTextoOCR(nombre_real);

        // 🔎 **Ajuste de comparación con tolerancia**
        let wordsInOCR = text.split(" ");
        let wordsInName = nombreNormalizado.split(" ");
        let matches = wordsInName.filter(word => wordsInOCR.includes(word)).length;
        let similarity = matches / wordsInName.length;

        console.log(`🔎 Similaridad calculada: ${similarity}`);

        // 📌 **Si al menos el 30% de las palabras coinciden, aceptar**
        if (similarity < 0.3) {
            fs.unlinkSync(dni_path); // 🗑 Eliminar el archivo si no coincide
            return res.status(400).send("El nombre en el DNI no coincide con el ingresado.");
        }

        // 🔒 **Hashear la contraseña**
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 📌 **Guardar el usuario en la base de datos**
        const newUser = new User({
            nombre_real,
            username,
            email,
            password: hashedPassword,
            dni_path,
            verificado: true // ✅ Usuario verificado automáticamente
        });

        await newUser.save();

        console.log("✅ Usuario registrado y verificado:", username);
        res.redirect("/login"); // Redirigir al login tras el registro
    } catch (error) {
       
        if (error.code === 11000) {
            res.status(400).send("Este email ya está registrado. Usa otro.");
        } else {
            console.error("❌ Error en el registro:", error);
            res.status(500).send("Error en el registro.");
        }
        
        
    }
});

module.exports = router;


