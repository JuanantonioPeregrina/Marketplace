const express = require('express');
const multer = require('multer'); // Para manejar imágenes
const path = require('path');

const router = express.Router();

let anuncios = []; // Array temporal para almacenar los anuncios

// Configuración de Multer para subir imágenes
const storage = multer.diskStorage({
    destination: "./public/uploads",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Renombrar archivo
    }
});

const upload = multer({ storage });

// Mostrar la página de publicación
router.get("/", (req, res) => {
    res.render("publicar", { title: "Publicar - LibrePost", user: req.session.user });
});

// Manejar la publicación de anuncios
router.post("/", upload.single("imagen"), (req, res) => {
    const { titulo, descripcion, precio } = req.body;
    const imagen = req.file ? `/uploads/${req.file.filename}` : null;

    if (!titulo || !descripcion || !precio || !imagen) {
        return res.status(400).send("Todos los campos son obligatorios.");
    }

    // Guardar el anuncio en el array
    anuncios.push({ titulo, descripcion, precio, imagen });

    res.redirect("/anuncios"); // Redirigir a la página donde se listan los anuncios
});

// Exportar la ruta
module.exports = { router, anuncios };
