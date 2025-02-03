const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Objeto para almacenar los anuncios por categoría
const anunciosPorCategoria = {};

// Configuración de Multer para subir imágenes
const storage = multer.diskStorage({
    destination: "./public/uploads",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Mostrar la página de publicación
router.get("/", (req, res) => {
    res.render("publicar", { title: "Publicar - LibrePost", user: req.session.user });
});

// Manejar la publicación de anuncios
router.post("/", upload.single("imagen"), (req, res) => {
    const { titulo, descripcion, precio, categoria } = req.body;
    const imagen = req.file ? `/uploads/${req.file.filename}` : null;

    if (!titulo || !descripcion || !precio || !categoria || !imagen) {
        return res.status(400).send("Todos los campos son obligatorios.");
    }

    // Si no hay anuncios para esta categoría, inicializamos un array
    if (!anunciosPorCategoria[categoria]) {
        anunciosPorCategoria[categoria] = [];
    }

    // Guardar el anuncio en la categoría correspondiente
    anunciosPorCategoria[categoria].push({ titulo, descripcion, precio, imagen });

    res.redirect(`/categorias/${categoria}`);
});

module.exports = { router, anunciosPorCategoria };
