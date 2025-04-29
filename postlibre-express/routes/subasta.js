// routes/subasta.js
const Anuncio = require("../database/models/anuncio.model");

// ——————————————————————————————————————————————
// Procesa ofertas automáticas (se usa sólo en subasta holandesa)
// ——————————————————————————————————————————————
async function procesarOfertasAutomaticas(anuncio, io) {
  if (!anuncio.ofertasAutomaticas?.length) return;

  const aplicables = anuncio.ofertasAutomaticas.filter(
    o => o.precioMaximo >= anuncio.precioActual
  );

  for (const o of aplicables) {
    console.log(`🤖 Oferta automática de ${o.usuario} por €${o.precioMaximo}`);
    anuncio.pujas.push({ usuario: o.usuario, cantidad: o.precioMaximo, fecha: new Date(), automatica: true });
    // Eliminamos la oferta ya ejecutada
    anuncio.ofertasAutomaticas = anuncio.ofertasAutomaticas.filter(x => x._id.toString() !== o._id.toString());
    await anuncio.save();

    io.emit("actualizar_pujas", {
      anuncioId: anuncio._id.toString(),
      pujas: anuncio.pujas
    });
  }
}

// ——————————————————————————————————————————————
// Subasta Holandesa (precio descendente)
// ——————————————————————————————————————————————
async function iniciarHolandesa(anuncioDoc, io) {
  console.log(`🚀 Subasta holandesa iniciada: ${anuncioDoc.titulo}`);
  let tiempoRestante = 300;               // 5 minutos
  const decremento = 100;                 // €100 cada tick
  const anuncioId = anuncioDoc._id.toString();

  const interval = setInterval(async () => {
    try {
      const a = await Anuncio.findById(anuncioId);
      if (!a || a.estadoSubasta !== "activa") {
        clearInterval(interval);
        return;
      }

      // Fin si tiempo o llega a reserva
      if (tiempoRestante <= 0 || a.precioActual <= a.precioReserva) {
        a.estadoSubasta = "finalizada";
        a.estado = (a.inscritos.length > 0 && a.precioActual <= a.precioReserva)
          ? "en_produccion"
          : "finalizado";
        await a.save();

        io.emit("subasta_finalizada", {
          anuncioId,
          precioFinal: a.precioActual,
          adjudicada: a.precioActual <= a.precioReserva
        });

        clearInterval(interval);
        return;
      }

      // Bajar precio
      a.precioActual = Math.max(a.precioReserva, a.precioActual - decremento);

      // Procesar ofertas automáticas
      await procesarOfertasAutomaticas(a, io);

      tiempoRestante = Math.max(0, tiempoRestante - 10);

      await a.save();

      io.emit("actualizar_subasta", {
        anuncioId,
        precioActual: a.precioActual,
        tiempoRestante
      });
    } catch (err) {
      console.error("❌ Error en subasta holandesa:", err);
      clearInterval(interval);
    }
  }, 10000);
}

// ——————————————————————————————————————————————
// Subasta Inglesa (precio ascendente)
// ——————————————————————————————————————————————
async function iniciarInglesa(anuncioDoc, io) {
  console.log(`🚀 Subasta inglesa iniciada: ${anuncioDoc.titulo}`);
  const {
    inglesaIncremento: inc,
    inglesaIntervalo: intervaloSeg,
    inglesaDuracion: duracionSeg
  } = anuncioDoc;

  let elapsed = 0;
  const anuncioId = anuncioDoc._id.toString();

  const interval = setInterval(async () => {
    try {
      const a = await Anuncio.findById(anuncioId);
      if (!a || a.estadoSubasta !== "activa") {
        clearInterval(interval);
        return;
      }

      // Subir precio
      a.precioActual += inc;
      elapsed += intervaloSeg;

      await a.save();

      io.emit("actualizar_subasta", {
        anuncioId,
        precioActual: a.precioActual,
        tiempoRestante: Math.max(0, duracionSeg - elapsed)
      });

      // Fin si supera duración
      if (elapsed >= duracionSeg) {
        a.estadoSubasta = "finalizada";
        a.estado = a.inscritos.length > 0 ? "en_produccion" : "finalizado";
        await a.save();

        io.emit("subasta_finalizada", {
          anuncioId,
          precioFinal: a.precioActual,
          adjudicada: a.inscritos.length > 0
        });

        clearInterval(interval);
      }
    } catch (err) {
      console.error("❌ Error en subasta inglesa:", err);
      clearInterval(interval);
    }
  }, intervaloSeg * 1000);
}

// ——————————————————————————————————————————————
// Arranca la subasta, eligiendo el tipo
// ——————————————————————————————————————————————
async function iniciarProcesoSubasta(anuncioId, io) {
  const anuncio = await Anuncio.findById(anuncioId);
  if (!anuncio || anuncio.estadoSubasta !== "activa") return;

  if (anuncio.auctionType === "inglesa") {
    iniciarInglesa(anuncio, io);
  } else {
    iniciarHolandesa(anuncio, io);
  }
}

// ——————————————————————————————————————————————
// Verifica cada X segundos subastas pendientes
// ——————————————————————————————————————————————
function iniciarVerificacionSubastas(io) {
  setInterval(async () => {
    const ahora = new Date();
    const pendientes = await Anuncio.find({
      estadoSubasta: "pendiente",
      fechaInicioSubasta: { $lte: new Date(ahora.getTime() + 5000) }
    });

    for (const a of pendientes) {
      a.estadoSubasta = "activa";
      a.estado = "en_subasta";
      a.precioActual = a.precioInicial;
      await a.save();
      iniciarProcesoSubasta(a._id, io);
    }
  }, 10000);
}

// ——————————————————————————————————————————————
// Registrar puja manual
// ——————————————————————————————————————————————
async function registrarPuja(io, anuncioId, usuario, cantidad) {
  const anuncio = await Anuncio.findById(anuncioId);
  if (!anuncio || anuncio.estadoSubasta !== "activa") return;

  anuncio.pujas.push({ usuario, cantidad, fecha: new Date(), automatica: false });
  if (cantidad > anuncio.precioActual) anuncio.precioActual = cantidad;
  await anuncio.save();

  io.emit("actualizar_pujas", {
    anuncioId,
    usuario,
    cantidad,
    precioActual: anuncio.precioActual,
    pujas: anuncio.pujas
  });
}

module.exports = {
  iniciarProcesoSubasta,
  iniciarVerificacionSubastas,
  registrarPuja
};
