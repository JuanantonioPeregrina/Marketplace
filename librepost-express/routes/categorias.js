const express = require('express');
const router = express.Router();

// Datos de cada categoría
const categoriasData = {
    "diseño-grafico": {
        nombre: "Diseño Gráfico",
        descripcion: "Branding, ilustraciones y más.",
        imagen: "/images/pexels-george-milton-7015034.jpg"
    },
    "desarrollo-web": {
        nombre: "Desarrollo Web",
        descripcion: "Páginas web, aplicaciones móviles y más.",
        imagen: "/images/desarrollo-web.jpg"
    },
    "redaccion-traduccion": {
        nombre: "Redacción y Traducción",
        descripcion: "Creación de contenido y traducción profesional.",
        imagen: "/images/pexels-olha-ruskykh-7504771.jpg"
    },
    "marketing-digital": {
        nombre: "Marketing Digital",
        descripcion: "SEO, publicidad y redes sociales.",
        imagen: "/images/pexels-artempodrez-5716001.jpg"
    },
    "servicios-locales": {
        nombre: "Servicios Locales",
        descripcion: "Reparaciones, limpieza y más.",
        imagen: "/images/pexels-filatova-1861817299-30482688.jpg"
    },
    "fotografia-video": {
        nombre: "Fotografía y Video",
        descripcion: "Edición de video y sesiones fotográficas.",
        imagen: "/images/pexels-mographe-30469936.jpg"
    }
};

// 📌 **Ruta para la lista general de categorías**
router.get("/", (req, res) => {
    res.render("categorias", {
        title: "Categorías - LibrePost",
        categorias: categoriasData, // 👈 Se pasa toda la lista de categorías
        categoriaNombre: null, // 👈 Se pasa null para evitar el error
        descripcion: null,
        imagen: null,
        user: req.session.user || { username: "Invitado" }
    });
});

// 📌 **Ruta dinámica para acceder a una categoría específica**
router.get("/:categoria", (req, res) => {
    const categoria = req.params.categoria;
    const datos = categoriasData[categoria];

    if (!datos) {
        return res.status(404).send("Categoría no encontrada");
    }

    res.render("categorias", {
        title: `LibrePost - ${datos.nombre}`,
        categorias: categoriasData,
        categoriaNombre: datos.nombre, // 👈 Ahora se pasa correctamente
        descripcion: datos.descripcion,
        imagen: datos.imagen,
        user: req.session.user || { username: "Invitado" }
    });
});

module.exports = router;
