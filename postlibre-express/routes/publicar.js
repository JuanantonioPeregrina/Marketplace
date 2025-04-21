const express = require("express");
const multer = require("multer");
const path = require("path");
const Anuncio = require("../database/models/anuncio.model");
const Usuario = require("../database/models/user.model"); 
const enviarCorreo = require("../utils/email");

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
            precioActual: Number(precio),
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

        // 📬 Lógica para enviar sugerencias por correo
        const interesados = await Usuario.find({
            recibirSugerencias: true,
            $or: [
                { "preferencias.categoria": nuevoAnuncio.categoria },
                { "preferencias.ubicacion": { $regex: nuevoAnuncio.ubicacion, $options: "i" } }
            ]
        });

        for (const usuario of interesados) {
            await enviarCorreo({
                to: usuario.email,
                subject: `📢 Nuevo anuncio que podría interesarte`,
                html: `
                    <h2>Hola <strong>${usuario.username}</strong>,</h2>
                    <p>Se ha publicado un nuevo anuncio que podría interesarte:</p>
                    <ul>
                        <li><strong>Título:</strong> ${nuevoAnuncio.titulo}</li>
                        <li><strong>Categoría:</strong> ${nuevoAnuncio.categoria}</li>
                        <li><strong>Ubicación:</strong> ${nuevoAnuncio.ubicacion}</li>
                    </ul>
                    <p><a href="http://localhost:4000/anuncios/${nuevoAnuncio._id}" style="background-color:#007bff;padding:10px 20px;color:white;border-radius:5px;text-decoration:none;">Ver anuncio</a></p>
                    <p>Gracias por usar LibrePost.</p>
                `
            });
        }

        res.redirect("/anuncios");

    } catch (error) {
        console.error("❌ Error al guardar el anuncio:", error);
        res.status(500).send("Error interno del servidor.");
    }
});



module.exports = router;
