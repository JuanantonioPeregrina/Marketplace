const express = require("express");
const Anuncio = require("../../database/models/anuncio.model"); // Importamos modelo
const Chat = require("../../database/models/chat.model"); // Importamos modelo de Chat

const router = express.Router();

// Datos de cada categoría
const categoriasData = {
    "diseño-grafico": { nombre: "Diseño Gráfico", descripcion: "Branding, ilustraciones y más.", imagen: "/images/pexels-george-milton-7015034.jpg" },
    "desarrollo-web": { nombre: "Desarrollo Web", descripcion: "Páginas web, aplicaciones móviles y más.", imagen: "/images/desarrollo-web.jpg" },
    "redaccion-traduccion": { nombre: "Redacción y Traducción", descripcion: "Creación de contenido y traducción profesional.", imagen: "/images/pexels-olha-ruskykh-7504771.jpg" },
    "marketing-digital": { nombre: "Marketing Digital", descripcion: "SEO, publicidad y redes sociales.", imagen: "/images/pexels-artempodrez-5716001.jpg" },
    "servicios-locales": { nombre: "Servicios Locales", descripcion: "Reparaciones, limpieza y más.", imagen: "/images/pexels-filatova-1861817299-30482688.jpg" },
    "fotografia-video": { nombre: "Fotografía y Video", descripcion: "Edición de video y sesiones fotográficas.", imagen: "/images/pexels-mographe-30469936.jpg" },
    "lujo-reliquia": {
        nombre: "Lujo / Reliquia",
        descripcion: "Piezas de colección, antigüedades y objetos de alto valor.",
        imagen: "/images/reliquia.jpg"
      }
};

// Ruta general de categorías
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

// Función para normalizar categorías eliminando acentos y caracteres especiales
const normalizarTexto = (str) => str
    .toLowerCase()
    .normalize("NFD") // Elimina tildes y caracteres especiales
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos
    .replace(/\s+/g, "-"); // Sustituye espacios por "-";

// Ruta para ver anuncios en una categoría específica
router.get("/:categoria", async (req, res) => {
    try {
        // Decodificar y normalizar la categoría de la URL
        const categoriaRaw = decodeURIComponent(req.params.categoria);
        const categoriaNormalizada = normalizarTexto(categoriaRaw);

        console.log("Buscando categoría:", categoriaNormalizada);

        // Buscar los datos de la categoría en el objeto categoriasData
        const datos = categoriasData[categoriaNormalizada] || categoriasData[categoriaRaw];

        if (!datos) {
            return res.status(404).send("Categoría no encontrada");
        }

        // Buscar anuncios en la base de datos con ambas versiones de la categoría
        const anunciosDB = await Anuncio.find({ 
            categoria: { $in: [categoriaRaw, categoriaNormalizada] } 
        });

        let anunciosConDatos = [];

        for (let anuncio of anunciosDB) {
            let chatIniciado = false;

            if (req.session.user && anuncio.inscritos.includes(req.session.user.username)) {
                chatIniciado = await Chat.exists({
                    anuncioId: anuncio._id,
                    $or: [
                        { remitente: anuncio.autor, destinatario: req.session.user.username },
                        { remitente: req.session.user.username, destinatario: anuncio.autor }
                    ]
                });
            }

            anunciosConDatos.push({
                _id: anuncio._id.toString(),
                titulo: anuncio.titulo,
                descripcion: anuncio.descripcion,
                imagen: anuncio.imagen,
                precio: anuncio.precio,
                autor: anuncio.autor,
                ubicacion: anuncio.ubicacion,
                inscritos: anuncio.inscritos || [],
                chatIniciado, // Agregar chatIniciado para el botón de chat
            });
        }

        res.render("categorias", {
            title: `LibrePost - ${datos.nombre}`,
            categorias: categoriasData,
            categoriaNombre: datos.nombre,
            descripcion: datos.descripcion,
            imagen: datos.imagen,
            anuncios: anunciosConDatos, // Enviamos los anuncios con `chatIniciado`
            user: req.session.user || { username: "Invitado" }
        });
    } catch (error) {
        console.error("Error al recuperar anuncios:", error);
        res.status(500).send("Error al cargar los anuncios.");
    }
});

module.exports = {
    router,
    categoriasData
};
