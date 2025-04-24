const Anuncio = require("../database/models/anuncio.model");

async function actualizarEstadosDeAnuncios() {
  const ahora = new Date();
  const hace30Segundos = new Date(ahora.getTime() - 30 * 1000);

// 🔄 pendiente → activa
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
  
  // 🔄 Subastas finalizadas con inscritos → en_produccion
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
  
  // 🔄 Subastas finalizadas sin inscritos → finalizado
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
