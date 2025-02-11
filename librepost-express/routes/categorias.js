const express = require("express");
const Anuncio = require("../database/models/anuncio.model"); // Importamos modelo

const router = express.Router();

// Datos de cada categoría
const categoriasData = {
    "diseño-grafico": { nombre: "Diseño Gráfico", descripcion: "Branding, ilustraciones y más.", imagen: "/images/pexels-george-milton-7015034.jpg" },
    "desarrollo-web": { nombre: "Desarrollo Web", descripcion: "Páginas web, aplicaciones móviles y más.", imagen: "/images/desarrollo-web.jpg" },
    "redaccion-traduccion": { nombre: "Redacción y Traducción", descripcion: "Creación de contenido y traducción profesional.", imagen: "/images/pexels-olha-ruskykh-7504771.jpg" },
    "marketing-digital": { nombre: "Marketing Digital", descripcion: "SEO, publicidad y redes sociales.", imagen: "/images/pexels-artempodrez-5716001.jpg" },
    "servicios-locales": { nombre: "Servicios Locales", descripcion: "Reparaciones, limpieza y más.", imagen: "/images/pexels-filatova-1861817299-30482688.jpg" },
    "fotografia-video": { nombre: "Fotografía y Video", descripcion: "Edición de video y sesiones fotográficas.", imagen: "/images/pexels-mographe-30469936.jpg" }
};

// 📌 Ruta general de categorías
router.get("/", (req, res) => {
    res.render("categorias", {
        title: "Categorías - LibrePost",
        categorias: categoriasData,
        categoriaNombre: null,
        descripcion: null,
        imagen: null,
        user: req.session.user || { username: "Invitado" }
    });
});

// 📌 Ruta para ver anuncios en una categoría específica
router.get("/:categoria", async (req, res) => {

    const categoria = req.params.categoria; // Asegurar que existe
    if (!categoria) {
        return res.status(400).send("Categoría no especificada");
    }

    const normalizarTexto = (str) => str
    .toLowerCase()
    .normalize("NFD") // Elimina tildes y caracteres especiales<form action="/categorias/<%= encodeURIComponent(categoriaNombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')) %>" method="GET">

    .replace(/[\u0300-\u036f]/g, "") // Quita acentos
    .replace(/\s+/g, '-'); // Sustituye espacios por "-"

const categoriaNormalizada = normalizarTexto(categoria);
const datos = categoriasData[categoriaNormalizada];

if (!datos) {
    return res.status(404).send("Categoría no encontrada");
}

    if (!datos) {
        return res.status(404).send("Categoría no encontrada");
    }

    try {

        const filtros = { categoria: categoriaNormalizada };


        if (req.query.presupuesto) {
            if (req.query.presupuesto === "menos-100") filtros.precio = { $lt: 100 };
            else if (req.query.presupuesto === "100-500") filtros.precio = { $gte: 100, $lte: 500 };
            else if (req.query.presupuesto === "mas-500") filtros.precio = { $gt: 500 };
        }

        if (req.query.ubicacion) {
            filtros.ubicacion = { $regex: req.query.ubicacion, $options: "i" };
        }

        if (req.query.reputacion) {
            filtros.reputacion = parseInt(req.query.reputacion);
        }
        // Recuperar anuncios de la base de datos
        const anuncios = await Anuncio.find({ categoria });

        res.render("categorias", {
            title: `LibrePost - ${datos.nombre}`,
            categorias: categoriasData,
            categoriaNombre: datos.nombre,
            descripcion: datos.descripcion,
            imagen: datos.imagen,
            anuncios,
            user: req.session.user || { username: "Invitado" }
        });
    } catch (error) {
        console.error("❌ Error al recuperar anuncios:", error);
        res.status(500).send("Error al cargar los anuncios.");
    }
});

module.exports = router; // 🔥 CORRECCIÓN: Se exporta solo router
