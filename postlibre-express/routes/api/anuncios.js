const express = require("express");
const router = express.Router();
const Anuncio = require("../../database/models/anuncio.model");
const { authenticateToken } = require("../../middlewares/apiAuth");
const multer = require("multer");
const path = require("path");


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

// Obtener un anuncio por ID
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


//  Middleware global: Todas las rutas requieren autenticación
router.use(authenticateToken);

// Configuración de Multer para subir imágenes
const storage = multer.diskStorage({
    destination: "./public/uploads",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
// Ruta GET para mostrar información sobre cómo usar /api/anuncios/nuevo
router.get("/nuevo", (req, res) => {
  res.status(200).json({
      mensaje: "Para crear un anuncio, usa una solicitud POST a esta misma URL con los datos del anuncio."
  });
});


/**
 * Crear un nuevo anuncio - (ANTES: POST /publicar, AHORA: POST /api/anuncios/nuevo)
 */
router.post("/nuevo", upload.single("imagen"), async (req, res) => {
    try {
        const { titulo, descripcion, precio, categoria, ubicacion, fechaInicioSubasta } = req.body;
        const imagen = req.file ? `/uploads/${req.file.filename}` : null;

 //Permitir que `imagen` sea opcional
if (!titulo || !descripcion || !precio || !categoria || !fechaInicioSubasta) {
  return res.status(400).json({ error: "Todos los campos son obligatorios, excepto la imagen." });
}

        const nuevoAnuncio = new Anuncio({
            titulo,
            descripcion,
            precioInicial: Number(precio),
            precioActual: Number(precio),
            imagen,
            categoria,
            ubicacion,
            fechaInicioSubasta: new Date(fechaInicioSubasta),
            autor: req.user.username, // Obtener usuario autenticado
            inscritos: [],
            estadoSubasta: "pendiente"
        });

        await nuevoAnuncio.save();
        res.status(201).json({ mensaje: "Anuncio creado con éxito", anuncio: nuevoAnuncio });

    } catch (error) {
        console.error("Error al guardar el anuncio:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// Editar un anuncio
router.put("/:id", async (req, res) => {
  try {
      const anuncioId = req.params.id.trim();  // 🧹 Eliminar espacios en blanco
      console.log(" Intentando actualizar anuncio con ID:", anuncioId);

      const anuncio = await Anuncio.findById(anuncioId);
      if (!anuncio) {
          return res.status(404).json({ error: "Anuncio no encontrado" });
      }

      console.log("🔍 Autor del anuncio:", anuncio.autor);
      console.log("🔑 Usuario autenticado:", req.user ? req.user.username : "No autenticado");

      if (!req.user || anuncio.autor !== req.user.username) {
          return res.status(403).json({ error: "No tienes permiso para editar este anuncio." });
      }

      //  Aplicar actualización usando `findByIdAndUpdate`
      const anuncioActualizado = await Anuncio.findByIdAndUpdate(
          anuncioId,
          { $set: req.body },  // Solo los campos que llegan en `req.body`
          { new: true }  // Devuelve el documento actualizado
      );

      console.log(" Anuncio actualizado correctamente:", anuncioActualizado);
      res.json({ success: true, anuncio: anuncioActualizado });

  } catch (error) {
      console.error(" Error al actualizar el anuncio:", error);
      res.status(500).json({ error: "Error al actualizar el anuncio.", detalle: error.message });
  }
});


//Eliminar un anuncio
router.delete("/:id", async (req, res) => {
  try {
      const anuncioId = req.params.id;
      console.log(`Eliminando anuncio con ID: ${anuncioId}`);

      const anuncio = await Anuncio.findById(anuncioId);
      if (!anuncio) {
          return res.status(404).json({ success: false, error: "Anuncio no encontrado" });
      }

      await Anuncio.findByIdAndDelete(anuncioId);
      console.log("Anuncio eliminado correctamente");

      res.json({ success: true, message: "Anuncio eliminado exitosamente" });
  } catch (error) {
      console.error("Error en la eliminación del anuncio:", error);
      res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

// Inscribirse en un anuncio
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

// Registrar una puja automática (API REST)
router.post("/:id/oferta-automatica", async (req, res) => {
    try {
      const anuncio = await Anuncio.findById(req.params.id);
      if (!anuncio) {
        return res.status(404).json({ error: "Anuncio no encontrado" });
      }
  
      const { precioMaximo } = req.body;
      const usuario = req.user.username;
  
      if (isNaN(precioMaximo) || precioMaximo <= 0) {
        return res.status(400).json({ error: "Precio máximo inválido." });
      }
  
      if (anuncio.estadoSubasta !== "activa") {
        anuncio.ofertasAutomaticas.push({
          usuario,
          precioMaximo,
          fecha: new Date()
        });
      } else {
        anuncio.pujas.push({
          usuario,
          cantidad: precioMaximo,
          fecha: new Date(),
          automatica: true
        });
      }
  
      await anuncio.save();
      return res.json({ success: true, mensaje: "Oferta automática registrada.", anuncio });
  
    } catch (error) {
      console.error("Error registrando oferta automática (API):", error);
      res.status(500).json({ error: "Error al registrar la oferta automática." });
    }
  });
  

module.exports = router;
