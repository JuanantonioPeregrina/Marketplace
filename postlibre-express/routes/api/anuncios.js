const express = require("express");
const router = express.Router();
const Anuncio = require("../../database/models/anuncio.model");
const { authenticateToken } = require("../../middlewares/apiAuth");

// 📌 Middleware global: Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @swagger
 * /api/anuncios:
 *   get:
 *     summary: Obtiene la lista de anuncios con filtros y paginación
 *     parameters:
 *       - in: query
 *         name: ubicacion
 *         schema:
 *           type: string
 *         description: Filtrar por ubicación
 *       - in: query
 *         name: precioMin
 *         schema:
 *           type: number
 *         description: Precio mínimo
 *       - in: query
 *         name: precioMax
 *         schema:
 *           type: number
 *         description: Precio máximo
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Cantidad de resultados por página
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         description: Página de resultados
 *     responses:
 *       200:
 *         description: Lista de anuncios obtenida con éxito.
 */
router.get("/", async (req, res) => {
    try {
        let { ubicacion, precioMin, precioMax, limit = 10, page = 1 } = req.query;
        let filter = {};

        if (ubicacion) filter.ubicacion = ubicacion;
        if (precioMin) filter.precioActual = { $gte: Number(precioMin) };
        if (precioMax) filter.precioActual = { ...filter.precioActual, $lte: Number(precioMax) };

        const anunciosDB = await Anuncio.find(filter)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        res.json({ success: true, anuncios: anunciosDB });
    } catch (error) {
        console.error("Error cargando anuncios:", error);
        res.status(500).json({ error: "Error al cargar los anuncios." });
    }
});

// 📌 Obtener un anuncio por ID
router.get("/:id", async (req, res) => {
    try {
        const anuncio = await Anuncio.findById(req.params.id);
        if (!anuncio) {
            return res.status(404).json({ error: "Anuncio no encontrado" });
        }
        res.json(anuncio);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el anuncio" });
    }
});

// 📌 Crear un nuevo anuncio
router.post("/", async (req, res) => {
    try {
        const nuevoAnuncio = new Anuncio({
            ...req.body,
            autor: req.user.username
        });
        await nuevoAnuncio.save();
        res.status(201).json(nuevoAnuncio);
    } catch (error) {
        res.status(400).json({ error: "Error al crear el anuncio." });
    }
});

// 📌 Editar un anuncio
router.put("/:id", async (req, res) => {
    try {
        const anuncio = await Anuncio.findById(req.params.id);
        if (!anuncio) return res.status(404).json({ error: "Anuncio no encontrado" });

        if (anuncio.autor !== req.user.username) {
            return res.status(403).json({ error: "No tienes permiso para editar este anuncio." });
        }

        Object.assign(anuncio, req.body);
        await anuncio.save();
        res.json({ success: true, anuncio });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el anuncio." });
    }
});

// 📌 Eliminar un anuncio
router.delete("/:id", async (req, res) => {
    try {
        const anuncio = await Anuncio.findById(req.params.id);
        if (!anuncio) return res.status(404).json({ error: "Anuncio no encontrado" });

        if (anuncio.autor !== req.user.username) {
            return res.status(403).json({ error: "No tienes permiso para eliminar este anuncio." });
        }

        await Anuncio.findByIdAndDelete(req.params.id);
        res.json({ mensaje: "Anuncio eliminado exitosamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el anuncio." });
    }
});

// 📌 Inscribirse en un anuncio
router.post("/:id/inscribirse", async (req, res) => {
    try {
        const anuncio = await Anuncio.findById(req.params.id);
        if (!anuncio) return res.status(404).json({ error: "Anuncio no encontrado" });

        if (!anuncio.inscritos.includes(req.user.username)) {
            anuncio.inscritos.push(req.user.username);
            await anuncio.save();
        }

        res.json({ success: true, mensaje: "Inscripción exitosa." });
    } catch (error) {
        res.status(500).json({ error: "Error al inscribirse en el anuncio." });
    }
});

module.exports = router;
