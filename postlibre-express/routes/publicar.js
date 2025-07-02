// routes/publicar.js

const express       = require("express");
const multer        = require("multer");
const path          = require("path");
const Anuncio       = require("../database/models/anuncio.model");
const Usuario       = require("../database/models/user.model");
const enviarCorreo  = require("../utils/email");

const router = express.Router();

const { iniciarProcesoSubasta } = require("../routes/subasta");

// ‣ Multer: configurar subida de imágenes
const storage = multer.diskStorage({
  destination: "./public/uploads",
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });


// GET /publicar → formulario
router.get("/", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("publicar", {
    title: "Publicar Anuncio - LibrePost",
    user: req.session.user
  });
});


// POST /publicar → crear nuevo Anuncio
router.post("/", upload.single("imagen"), async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const {
    titulo,
    descripcion,
    //precio,                // solo para holandesa
    categoria,
    minEstrellas,
    maxEstrellas,
    ubicacion,
    fechaInicioSubasta,    // obligatorio siempre
    precioReservaInglesa,  // solo inglesa
    inglesaIncremento,     // solo inglesa
    inglesaIntervalo,      // solo inglesa
    inglesaDuracion        // solo inglesa (en segundos)
  } = req.body;

  const imagen = req.file ? `/uploads/${req.file.filename}` : null;
  const autor  = req.session.user.username;

  // — Validación básica común —
  if (
    !titulo ||
    !descripcion ||
    !categoria ||
    !fechaInicioSubasta ||
    !imagen ||
    !ubicacion
  ) {
    return res.status(400).send(
      "Completa título, descripción, categoría, fecha de inicio, imagen y ubicación."
    );
  }

  // Determinar tipo de subasta
  const auctionType = categoria === "lujo-reliquia"
    ? "inglesa"
    : "holandesa";

  // Validaciones específicas
  if (auctionType === "holandesa") {
    // Ya no validamos precioReserva aquí, sólo el precio inicial
    /*if (!precio) {
      return res.status(400).send(
        "Para subasta holandesa necesitas precio inicial."
      );
    } */
  } else {
    // Para inglesa seguimos validando todos sus campos, incluido el nuevo precioReservaInglesa
    if (
      !inglesaIncremento ||
      !inglesaIntervalo ||
      !inglesaDuracion ||
      !precioReservaInglesa
    ) {
      return res.status(400).send(
        "Para subasta inglesa necesitas incremento, intervalo, duración y precio mínimo."
      );
    }
  }

  // — Fechas y estados iniciales —
  const inicio    = new Date(fechaInicioSubasta);
  let expiracion;

  if (auctionType === "holandesa") {
    // 5 minutos después
    expiracion = new Date(inicio.getTime() + 5 * 60 * 1000);
  } else {
    // inglesaDuracion en segundos
    expiracion = new Date(
      inicio.getTime() + Number(inglesaDuracion) * 1000
    );
  }

  const ahora         = new Date();
  const estadoSubasta = inicio <= ahora ? "activa" : "pendiente";
  const estado        = estadoSubasta === "activa"
    ? "en_subasta"
    : "esperando_inicio";

  // — Precio inicial y arrancada —

  // Holandesa arranca en 0€ (daremos el verdadero precio de salida cuando inicie)
  const precioInicial = auctionType === "holandesa" ? 0 : 0;
  // Holandesa arranca en precioInicial, inglesa siempre en 0€
 /* const precioInicial = auctionType === "holandesa"
    ? Number(precio)
    : 0; */
    
  const precioActual = precioInicial;

  try {
    // Construyo el documento, añadiendo solo los campos propios de cada subasta
    const nuevoAnuncio = new Anuncio({
      autor,
      titulo,
      descripcion,
      ubicacion,
      imagen,
      categoria,
      minEstrellas: Number(minEstrellas) || 0,
      maxEstrellas: Number(maxEstrellas) || 5,
      auctionType,
      fechaInicioSubasta: inicio,
      fechaExpiracion:    expiracion,
      estadoSubasta,
      estado,
      inscritos:         [],

      // Campos comunes de precio
      precioInicial,
      precioActual,


      // Campos de subasta inglesa
      ...(auctionType === "inglesa" && {
        inglesaIncremento: Number(inglesaIncremento),
        inglesaIntervalo:  Number(inglesaIntervalo),
        inglesaDuracion:   Number(inglesaDuracion),
        precioReserva:     Number(precioReservaInglesa)
      })
    });

    await nuevoAnuncio.save();

    // — Si al publicar ya estamos dentro de la ventana de inicio…
    if (nuevoAnuncio.estadoSubasta === "activa") {
    // recupero io que guardé en app.js
    const io = req.app.get("io");
    iniciarProcesoSubasta(nuevoAnuncio._id, io);
  }

    // — Envío de correos a interesados —
    const interesados = await Usuario.find({
      recibirSugerencias: true,
      $or: [
        { "preferencias.categoria": nuevoAnuncio.categoria },
        { "preferencias.ubicacion": { $regex: nuevoAnuncio.ubicacion, $options: "i" } }
      ]
    });

    for (const usuario of interesados) {
      await enviarCorreo({
        to:      usuario.email,
        subject: "📢 Nuevo anuncio que podría interesarte",
        html: `
          <h2>Hola <strong>${usuario.username}</strong>,</h2>
          <p>Se ha publicado un nuevo anuncio:</p>
          <ul>
            <li><strong>Título:</strong> ${nuevoAnuncio.titulo}</li>
            <li><strong>Categoría:</strong> ${nuevoAnuncio.categoria}</li>
            <li><strong>Ubicación:</strong> ${nuevoAnuncio.ubicacion}</li>
          </ul>
          <p><a href="http://localhost:3000/anuncios/${nuevoAnuncio._id}"
                style="background-color:#007bff;padding:10px 20px;color:white;border-radius:5px;
                       text-decoration:none;">
              Ver anuncio
          </a></p>
          <p>Gracias por usar LibrePost.</p>
        `
      });
    }

    // Redirigir a la lista de anuncios
    res.redirect("/anuncios");

  } catch (err) {
    console.error("Error al guardar anuncio:", err);
    res.status(500).send("Error interno del servidor.");
  }
});

module.exports = router;
