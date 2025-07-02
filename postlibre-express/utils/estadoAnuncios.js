const Anuncio = require("../database/models/anuncio.model");

async function actualizarEstadosDeAnuncios() {
  const ahora = new Date();

  //Subastas que deben comenzar ahora → activa / en_subasta
  await Anuncio.updateMany(
    {
      estadoSubasta: "pendiente",
      fechaInicioSubasta: { $lte: ahora },
      fechaExpiracion: { $gt: ahora }
    },
    {
      $set: {
        estadoSubasta: "activa",
        estado: "en_subasta"
      }
    }
  );

  //Subastas finalizadas CON inscritos → finalizada / en_produccion
  await Anuncio.updateMany(
    {
      estadoSubasta: { $in: ["pendiente", "activa"] },
      fechaExpiracion: { $lte: ahora },
      inscritos: { $exists: true, $not: { $size: 0 } }
    },
    {
      $set: {
        estadoSubasta: "finalizada",
        estado: "en_produccion"
      }
    }
  );

  // Subastas finalizadas SIN inscritos → finalizada / finalizado
  await Anuncio.updateMany(
    {
      estadoSubasta: { $in: ["pendiente", "activa"] },
      fechaExpiracion: { $lte: ahora },
      $or: [
        { inscritos: { $exists: false } },
        { inscritos: { $size: 0 } }
      ]
    },
    {
      $set: {
        estadoSubasta: "finalizada",
        estado: "finalizado"
      }
    }
  );
}

module.exports = actualizarEstadosDeAnuncios;

