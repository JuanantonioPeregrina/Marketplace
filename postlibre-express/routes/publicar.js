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

  const {
    titulo,
    descripcion,
    precio,
    categoria,
    ubicacion,
    fechaInicioSubasta,
    precioReserva,
    inglesaIncremento,
    inglesaIntervalo,
    inglesaDuracion
  } = req.body;
  const imagen = req.file ? `/uploads/${req.file.filename}` : null;
  const autor = req.session.user.username;

  // Campos obligatorios comunes
  if (!titulo || !descripcion || !precio || !categoria || !imagen || !ubicacion) {
    return res.status(400).send("Todos los campos obligatorios deben completarse.");
  }

  // Determinar tipo de subasta según categoría
  const auctionType = (categoria === 'lujo-reliquia') ? 'inglesa' : 'holandesa';

  // Validación y parámetros por tipo
  let fechaInicio = null;
  let fechaExpiracion = null;
  const ahora = new Date();

  if (auctionType === 'holandesa') {
    // Subasta holandesa: requiere fechaInicioSubasta y precioReserva
    if (!fechaInicioSubasta || !precioReserva) {
      return res.status(400).send("Fecha de inicio y precio mínimo son obligatorios para subasta holandesa.");
    }
    fechaInicio = new Date(fechaInicioSubasta);
    fechaExpiracion = new Date(fechaInicio.getTime() + 5 * 60 * 1000); // +5 minutos
  } else {
    // Subasta inglesa: requiere inglesaIncremento, inglesaIntervalo, inglesaDuracion
    if (!inglesaIncremento || !inglesaIntervalo || !inglesaDuracion) {
      return res.status(400).send("Parámetros de subasta inglesa incompletos.");
    }
    // Empezar inmediatamente
    fechaInicio = ahora;
    fechaExpiracion = new Date(ahora.getTime() + Number(inglesaDuracion) * 1000);
  }

  // Estado inicial de la subasta
  let estadoSubasta = fechaInicio <= ahora ? 'activa' : 'pendiente';
  let estado = estadoSubasta === 'activa' ? 'en_subasta' : 'esperando_inicio';

  try {
    // Construcción del documento con campos comunes y específicos
    const initialPrice = Number(precio);
    const startingPrice = (auctionType === 'inglesa') ? 0 : initialPrice;
    
    const nuevoAnuncio = new Anuncio({
      autor,
      titulo,
      descripcion,
      precioInicial: initialPrice,
      precioActual: startingPrice,
      ubicacion,
      imagen,
      categoria,
      auctionType,                // <-- asegúrate de guardar el tipo
      fechaInicioSubasta: fechaInicio,
      fechaExpiracion,
      estadoSubasta,
      estado,
      inscritos: [],
      // sólo precioReserva si es holandesa
      ...(auctionType === 'holandesa' && { precioReserva: Number(precioReserva) }),
      // sólo params inglés si es inglesa
      ...(auctionType === 'inglesa' && {
        inglesaIncremento: Number(inglesaIncremento),
        inglesaIntervalo:  Number(inglesaIntervalo),
        inglesaDuracion:   Number(inglesaDuracion)
      })
    });
    

    await nuevoAnuncio.save();

    // Envío de correos a usuarios interesados
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
          <p><a href="http://localhost:3000/anuncios/${nuevoAnuncio._id}" style="background-color:#007bff;padding:10px 20px;color:white;border-radius:5px;text-decoration:none;">Ver anuncio</a></p>
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
