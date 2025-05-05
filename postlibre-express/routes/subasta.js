// routes/subasta.js

const Anuncio = require("../database/models/anuncio.model");

/**
 * Dado un array de números, devuelve la mediana.
 * Si la longitud es par, devuelve la media de los dos centrales.
 */
function calcularMediana(array) {
  if (!array.length) return 0;
  const sorted = array.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  } else {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
}

/**
 * Mediana histórica de los precios finales de subastas holandesas
 * finalizadas en la misma categoría.
 */
async function medianaHistorica(categoria) {
  const antiguas = await Anuncio.find({
    categoria,
    auctionType: "holandesa",
    estadoSubasta: "finalizada"
  }).select("pujas");
  const finales = antiguas
    .map(a => a.pujas?.length && a.pujas[a.pujas.length - 1].cantidad)
    .filter(x => typeof x === "number");
  return calcularMediana(finales);
}

// ——————————————————————————————————————————————
// Procesa ofertas automáticas (solo para holandesa)

/**
 * Procesa todas las ofertas automáticas pendientes que superen
 * el precioActual de la subasta holandesa.
 */
async function procesarOfertasAutomaticas(anuncio, io) {
  if (!anuncio.ofertasAutomaticas?.length) return;
  const aplicables = anuncio.ofertasAutomaticas.filter(
    o => o.precioMaximo >= anuncio.precioActual
  );
  for (const o of aplicables) {
    anuncio.pujas.push({
      usuario:   o.usuario,
      cantidad:  o.precioMaximo,
      fecha:     new Date(),
      automatica: true
    });
    anuncio.ofertasAutomaticas = anuncio.ofertasAutomaticas
      .filter(x => x._id.toString() !== o._id.toString());
    await anuncio.save();
    io.emit("actualizar_pujas", {
      anuncioId: anuncio._id.toString(),
      pujas:     anuncio.pujas
    });
  }
}

// ——————————————————————————————————————————————
/**
 * Cuando arranca la holandesa:
 *  • Calcula mediana local (≥3 ofertas) o histórica.
 *  • Fija precioInicial y emite YA la actualización al cliente.
 *  • Arranca la bajada progresiva.
 */const MIN_OFERTAS_LOCALES = 3;

async function prepararHolandesa(anuncioId, io) {
  const anuncio = await Anuncio.findById(anuncioId);
  const autos    = (anuncio.ofertasAutomaticas || []).map(o => o.precioMaximo);

    // Si NO hay ninguna oferta automática, cancelamos la subasta
    if (autos.length === 0) {
      anuncio.estadoSubasta = "finalizada";
      anuncio.estado        = anuncio.inscritos.length ? "en_produccion" : "finalizado";
      await anuncio.save();
      io.emit("subasta_finalizada", {
        anuncioId: anuncio._id.toString(),
        precioFinal: anuncio.precioActual || 0,
        ganador: null
      });
      return;  // no arrancamos la holandesa
    }
  // ———————————————
  // 1) Si hay ≥3, mediana local; 2) si <3, histórica; 3) si histórica falla pero hay <3, local; 4) fallback
  let precioInicial = null;
  if (autos.length >= MIN_OFERTAS_LOCALES) {
    precioInicial = calcularMediana(autos);
  } else {
    precioInicial = await medianaHistorica(anuncio.categoria);
    if ((!precioInicial || precioInicial === 0) && autos.length > 0) {
      precioInicial = calcularMediana(autos);
    }
  }
  if (!precioInicial) precioInicial = anuncio.precioInicial || 100;

  // descartamos ofertas ≥ precioInicial
  anuncio.ofertasAutomaticas = anuncio.ofertasAutomaticas
    .filter(o => o.precioMaximo < precioInicial);

  anuncio.precioInicial = precioInicial;
  anuncio.precioActual  = precioInicial;
  await anuncio.save();

  io.emit("actualizar_subasta", {
    anuncioId: anuncio._id.toString(),
    precioActual: precioInicial,
    tiempoRestante: 300
  });

  iniciarHolandesa(anuncio, io);
}




// Subasta Holandesa (baja progresiva, sin cierre por tiempo)
// ——————————————————————————————————————————————
async function iniciarHolandesa(anuncioDoc, io) {
console.log(`🚀 Subasta holandesa iniciada: ${anuncioDoc.titulo}`);
  let tiempoRestante = 300;     // 5 minutos en segundos
  const decremento   = 100;     // € cada 10s
  const anuncioId    = anuncioDoc._id.toString();
  const precioInicial = anuncioDoc.precioActual;  // 📌 guardamos la mediana

  const iv = setInterval(async () => {
    try {
      const a = await Anuncio.findById(anuncioId);
      if (!a || a.estadoSubasta !== "activa") {
        clearInterval(iv);
        return;
      }

      // — 1) Buscamos sólo las ofertas automáticas cuyo max esté
      //    entre el precioActual y el precioInicial:
      const elegibles = (a.ofertasAutomaticas || []).filter(o =>
        o.precioMaximo >= a.precioActual &&
        o.precioMaximo <= precioInicial
      );

      if (elegibles.length) {
        // elegimos la oferta con precioMaximo más bajo
        const ganadorAuto = elegibles.reduce(
          (min, o) => o.precioMaximo < min.precioMaximo ? o : min,
          elegibles[0]
        );

        // registramos la puja al precio actual
        a.pujas.push({
          usuario:    ganadorAuto.usuario,
          cantidad:   a.precioActual,
          fecha:      new Date(),
          automatica: true
        });

        // cerramos la subasta
        a.ofertasAutomaticas = [];
        a.estadoSubasta      = "finalizada";
        a.estado             = a.inscritos.length ? "en_produccion" : "finalizado";
        await a.save();

        // emitimos sólo la puja ganadora y el cierre
        io.emit("actualizar_pujas", {
          anuncioId,
          pujas: [ a.pujas.slice(-1)[0] ]
        });
        io.emit("subasta_finalizada", {
          anuncioId,
          precioFinal: a.precioActual,
          ganador:     ganadorAuto.usuario
        });

        clearInterval(iv);
        return;
      }

      // — 2) Si no hay ninguna elegible, aplicamos el decremento…
      a.precioActual = Math.max(0, a.precioActual - decremento);
      tiempoRestante = Math.max(0, tiempoRestante - 10);
      await a.save();

      io.emit("actualizar_subasta", {
        anuncioId,
        precioActual:   a.precioActual,
        tiempoRestante
      });

      // ¡NUNCA cerramos aquí por tiempo ni por precio 0!
    }
    catch (err) {
      console.error("❌ Error en subasta holandesa:", err);
      clearInterval(iv);
    }
  }, 10000);
}


// ——————————————————————————————————————————————
// Subasta Inglesa (sube progresivamente)
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

      a.precioActual += inc;
      elapsed += intervaloSeg;
      await a.save();

      io.emit("actualizar_subasta", {
        anuncioId,
        precioActual: a.precioActual,
        tiempoRestante: Math.max(0, duracionSeg - elapsed)
      });

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
// Prepara y fija el precio inicial de la holandesa mediante mediana
// ——————————————————————————————————————————————


// ——————————————————————————————————————————————
// Arranca el proceso según tipo de subasta
// ——————————————————————————————————————————————
async function iniciarProcesoSubasta(anuncioId, io) {
  const anuncio = await Anuncio.findById(anuncioId);
  if (!anuncio || anuncio.estadoSubasta !== "activa") return;

  if (anuncio.auctionType === "inglesa") {
    iniciarInglesa(anuncio, io);
  } else {
    // Para holandesa primero calculamos el precio con mediana
    await prepararHolandesa(anuncioId, io);
  }
}

// ——————————————————————————————————————————————
// Comprueba cada X segundos si alguna pendiente ya debe arrancar
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
      a.estado        = "en_subasta";
      await a.save();
      iniciarProcesoSubasta(a._id.toString(), io);
    }
  }, 1000);
}

// ——————————————————————————————————————————————
// Registrar una puja manual
// ——————————————————————————————————————————————
async function registrarPuja(io, anuncioId, usuario, cantidad) {
  const anuncio = await Anuncio.findById(anuncioId);
  if (!anuncio || anuncio.estadoSubasta !== "activa") return;

  if (anuncio.auctionType === "holandesa") {
    // registro la puja y cierro
    anuncio.pujas.push({ usuario, cantidad, fecha: new Date(), automatica: false });
    anuncio.estadoSubasta = "finalizada";
    anuncio.estado        = anuncio.inscritos.length ? "en_produccion" : "finalizado";
    await anuncio.save();

    // emito sólo esa puja y el cierre
    io.emit("actualizar_pujas", {
      anuncioId,
      pujas: [ anuncio.pujas.slice(-1)[0] ]
    });
    io.emit("subasta_finalizada", {
      anuncioId,
      precioFinal: anuncio.precioActual,
      ganador:     usuario
    });
    return;
  }

  // caso subasta inglesa…
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
