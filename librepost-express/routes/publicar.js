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
router.post("/", upload.single("imagen"), async (req, res) => {  // ⬅️ Agregar `async`
    console.log("🔍 Datos recibidos en req.body:", req.body); // Depuración

    if (!req.session.user) {
        return res.redirect("/login");
    }

    const { titulo, descripcion, precio, categoria, fechaExpiracion } = req.body;

    if (!fechaExpiracion) {
        console.log("❌ Error: `fechaExpiracion` no está en req.body");
        return res.status(400).send("Error: No se recibió la fecha de expiración.");
    }

    const imagen = req.file ? `/uploads/${req.file.filename}` : null;
    const autor = req.session.user.username;

    if (!titulo || !descripcion || !precio || !categoria || !imagen || !fechaExpiracion) {
        return res.status(400).send("Todos los campos son obligatorios.");
    }

    try {
        const nuevoAnuncio = new Anuncio({
            titulo,
            descripcion,
            precio,
            imagen,
            categoria,
            fechaExpiracion: new Date(fechaExpiracion), // Convertir a Date
            autor,
            inscritos: []
        });

        await nuevoAnuncio.save();  // ✅ Ahora `await` funcionará porque la función es `async`
        console.log("✅ Anuncio guardado correctamente.");
        res.redirect(`/categorias/${categoria}`);
    } catch (error) {
        console.error("❌ Error al guardar el anuncio:", error);
        res.status(500).send("Error interno del servidor.");
    }
});


module.exports = router; // 🔥 CORRECCIÓN: Se exporta solo router
