
const Anuncio = require("../database/models/anuncio.model");

async function actualizarEstadosDeAnuncios() {
  const ahora = new Date();

  // 1. Subastas que deben pasar de pendiente -> activa
  await Anuncio.updateMany(
    {
      estadoSubasta: "pendiente",
      fechaInicioSubasta: { $lte: ahora },
      fechaExpiracion: { $gt: ahora }
    },
    {
      $set: { estadoSubasta: "activa", estado: "en_subasta" }
    }
  );

  // 2. Subastas que acaban de finalizar
  await Anuncio.updateMany(
    {
      estadoSubasta: { $in: ["pendiente", "activa"] },
      fechaExpiracion: { $lte: ahora }
    },
    {
      $set: {
        estadoSubasta: "finalizada",
        estado: "en_produccion"
      }
    }
  );

  // 3. Corregir subastas que ya están marcadas como finalizadas pero aún no tienen estado correcto
  await Anuncio.updateMany(
    {
      estadoSubasta: "finalizada",
      estado: { $ne: "en_produccion" }
    },
    {
      $set: {
        estado: "en_produccion"
      }
    }
  );
}



module.exports = actualizarEstadosDeAnuncios;
