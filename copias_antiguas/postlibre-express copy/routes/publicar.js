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

router.get("/", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("publicar", { title: "Publicar - LibrePost", user: req.session.user });
});

// Publicar un anuncio en MongoDB
router.post("/", upload.single("imagen"), async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    const { titulo, descripcion, precio, categoria, fechaExpiracion, ubicacion, fechaInicioSubasta } = req.body;
    const imagen = req.file ? `/uploads/${req.file.filename}` : null;
    const autor = req.session.user.username;

    if (!titulo || !descripcion || !precio || !categoria || !imagen || !fechaExpiracion || !fechaInicioSubasta) {
        return res.status(400).send("Todos los campos son obligatorios.");
    }

    try {
        const nuevoAnuncio = new Anuncio({
            titulo,
            descripcion,
            precioInicial: Number(precio),
            precioActual: Number(precio), // Inicialmente igual al precio inicial
            imagen,
            categoria,
            ubicacion,
            fechaExpiracion: new Date(fechaExpiracion),
            fechaInicioSubasta: new Date(fechaInicioSubasta), 
            autor,
            inscritos: [],
            estadoSubasta: "pendiente"
        });

        await nuevoAnuncio.save();
        res.redirect("/anuncios");
    } catch (error) {
        console.error("❌ Error al guardar el anuncio:", error);
        res.status(500).send("Error interno del servidor.");
    }
});

module.exports = router;
