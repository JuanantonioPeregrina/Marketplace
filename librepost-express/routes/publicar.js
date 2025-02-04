const express = require("express");
const multer = require("multer");
const path = require("path");
const Anuncio = require("../database/models/anuncio.model");

const router = express.Router();

// Configuración de Multer para subir imágenes
const storage = multer.diskStorage({
    destination: "./public/uploads",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Verificar autenticación
router.get("/", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("publicar", { title: "Publicar - LibrePost", user: req.session.user });
});

// Publicar un anuncio en MongoDB
router.post("/", upload.single("imagen"), async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const { titulo, descripcion, precio, categoria } = req.body;
    const imagen = req.file ? `/uploads/${req.file.filename}` : null;

    if (!titulo || !descripcion || !precio || !categoria || !imagen) {
        return res.status(400).send("Todos los campos son obligatorios.");
    }

    try {
        const nuevoAnuncio = new Anuncio({ titulo, descripcion, precio, imagen, categoria, autor: req.session.user.username, fechaExpiracion: new Date(fechaExpiracion)});// Convertir a formato de fecha
        await nuevoAnuncio.save();
        console.log("📌 Anuncio guardado:", nuevoAnuncio);
        res.redirect(`/categorias/${categoria}`);
    } catch (error) {
        console.error("❌ Error al guardar el anuncio:", error);
        res.status(500).send("Error al guardar el anuncio.");
    }
});

module.exports = router; // 🔥 CORRECCIÓN: Se exporta solo router
