// routes/api/anuncios.js
const express = require('express');
const router = express.Router();
const Anuncio = require('../../database/models/anuncio.model');
const { authenticateToken } = require('../../middlewares/auth');

/**
 * @swagger
 * /api/anuncios:
 *   get:
 *     summary: Obtiene la lista de anuncios
 *     responses:
 *       200:
 *         description: Lista de anuncios obtenida con éxito.
 */
router.get('/', async (req, res) => {
    try {
        const anunciosDB = await Anuncio.find({});
        const anunciosConDatos = anunciosDB.map(anuncio => ({
            _id: anuncio._id.toString(),
            titulo: anuncio.titulo,
            descripcion: anuncio.descripcion,
            imagen: anuncio.imagen,
            precioInicial: anuncio.precioInicial,
            precioActual: anuncio.precioActual,
            autor: anuncio.autor,
            ubicacion: anuncio.ubicacion,
            inscritos: anuncio.inscritos || [],
            estadoSubasta: anuncio.estadoSubasta,
            fechaInicioSubasta: anuncio.fechaInicioSubasta,
            fechaExpiracion: anuncio.fechaExpiracion,
            pujas: anuncio.pujas.map(puja => ({
                usuario: puja.usuario,
                cantidad: puja.cantidad,
                fecha: puja.fecha,
                automatica: puja.automatica || false  
            })),
            ofertasAutomaticas: anuncio.ofertasAutomaticas || []
        }));
        res.json({ success: true, anuncios: anunciosConDatos });
    } catch (error) {
        console.error("Error cargando anuncios:", error);
        res.status(500).json({ error: "Error al cargar los anuncios." });
    }
});

/**
 * @swagger
 * /api/anuncios/{id}:
 *   get:
 *     summary: Obtiene un anuncio por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Anuncio encontrado
 *       404:
 *         description: Anuncio no encontrado
 */
router.get('/:id', async (req, res) => {
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

/**
 * @swagger
 * /api/anuncios:
 *   post:
 *     summary: Crea un nuevo anuncio
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Anuncio creado exitosamente
 */
router.post('/', authenticateToken, async (req, res) => {
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

/**
 * @swagger
 * /api/anuncios/{id}:
 *   delete:
 *     summary: Elimina un anuncio
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Anuncio eliminado exitosamente
 *       404:
 *         description: Anuncio no encontrado
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const anuncio = await Anuncio.findByIdAndDelete(req.params.id);
        if (!anuncio) {
            return res.status(404).json({ error: "Anuncio no encontrado" });
        }
        res.json({ mensaje: "Anuncio eliminado exitosamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el anuncio." });
    }
});

module.exports = router;
