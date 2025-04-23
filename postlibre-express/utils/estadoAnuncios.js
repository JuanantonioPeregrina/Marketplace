const Anuncio = require("../database/models/anuncio.model");

async function actualizarEstadosDeAnuncios() {
  const ahora = new Date();
  const hace30Segundos = new Date(ahora.getTime() - 30 * 1000);

  // 🔄 pendiente → activa
  await Anuncio.updateMany(
    {
      estadoSubasta: "pendiente",
      fechaInicioSubasta: { $lte: ahora },
      fechaExpiracion: { $gt: ahora },
      fechaPublicacion: { $lte: hace30Segundos }
    },
    {
      $set: {
        estadoSubasta: "activa",
        estado: "en_subasta"
      }
    }
  );

  // 🔄 pendiente o activa → finalizada
  await Anuncio.updateMany(
    {
      estadoSubasta: { $in: ["pendiente", "activa"] },
      fechaExpiracion: { $lte: ahora },
      fechaPublicacion: { $lte: hace30Segundos }
    },
    {
      $set: {
        estadoSubasta: "finalizada",
        estado: "en_produccion"
      }
    }
  );

  // 🛠️ Corrección extra por si no se actualizó correctamente
  await Anuncio.updateMany(
    {
      estadoSubasta: "finalizada",
      estado: { $ne: "en_produccion" }
    },
    {
      $set: { estado: "en_produccion" }
    }
  );
}

module.exports = actualizarEstadosDeAnuncios;
