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
  // traemos precioActual y pujas para cada holandesa finalizada
  const antiguas = await Anuncio.find({
    categoria,
    auctionType: "holandesa",
    estadoSubasta: "finalizada"
  }).select("precioActual pujas");

  // si hay pujas, tiramos de la última; si no, de precioActual
  const finales = antiguas
    .map(a => {
      if (Array.isArray(a.pujas) && a.pujas.length > 0) {
        return a.pujas[a.pujas.length - 1].cantidad;
      }
      return a.precioActual;
    })
    .filter(x => typeof x === "number" && x > 0);

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

  if (autos.length === 0) {
    anuncio.estadoSubasta = "finalizada";
    anuncio.estado        = anuncio.inscritos.length ? "en_produccion" : "finalizado";
    await anuncio.save();
    io.emit("subasta_finalizada", {
      anuncioId: anuncio._id.toString(),
      precioFinal: anuncio.precioActual || 0,
      ganador: null
    });
    return;
  }

  // 1) Mediana local ≥3 o histórica
  let precioInicial = autos.length >= MIN_OFERTAS_LOCALES
    ? calcularMediana(autos)
    : await medianaHistorica(anuncio.categoria);
  if ((!precioInicial || precioInicial === 0) && autos.length > 0) {
    precioInicial = calcularMediana(autos);
  }
  if (!precioInicial) precioInicial = anuncio.precioInicial || 100;

  // ——— LOGS DE DEBUG ———
  console.log("🏷️ [DEBUG holandesa] categoría:", anuncio.categoria);
  console.log("🔢 [DEBUG holandesa] autos (ofertasAutomáticas):", autos);
  console.log("📊 [DEBUG holandesa] mediana local (>=3):",
    autos.length >= MIN_OFERTAS_LOCALES ? calcularMediana(autos) : "n/a");
  console.log("📜 [DEBUG holandesa] mediana histórica:", await medianaHistorica(anuncio.categoria));
  console.log("⚙️ [DEBUG holandesa] precioInicial antes de redondeo:", precioInicial);

  // Aseguramos múltiplo de 50 por defecto
  const STEP = 50;
  precioInicial = Math.ceil(precioInicial / STEP) * STEP;

  // Descartamos ofertas ≥ precioInicial
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


// Subasta Holandesa (baja progresiva, tiempo fijo con decremento dinámico)
async function iniciarHolandesa(anuncioDoc, io) {
  console.log(`🚀 Subasta holandesa iniciada: ${anuncioDoc.titulo}`);

  const duracionSeg   = 300;        // 5 minutos
  const TICK_MS       = 1000;       // 1 segundo entre cada tick
  const anuncioId     = anuncioDoc._id.toString();

  // STEP para redondear al múltiplo de 50 inicial
  const STEP = 50;
  let precioIni = Math.round(anuncioDoc.precioActual / STEP) * STEP;

  // Calculamos decremento base y resto
  const baseDecr = Math.floor(precioIni / duracionSeg);
  const resto    = precioIni - (baseDecr * duracionSeg);

  let precioActual    = precioIni;
  let segundosPasados = 0;

  const iv = setInterval(async () => {
    try {
      const a = await Anuncio.findById(anuncioId);
      if (!a || a.estadoSubasta !== "activa") {
        clearInterval(iv);
        return;
      }

      // 1) Procesar ofertas automáticas
      const elegibles = (a.ofertasAutomaticas || []).filter(o =>
        o.precioMaximo >= a.precioActual && o.precioMaximo <= precioIni
      );
      if (elegibles.length) {
        const winner = elegibles.reduce((min, o) =>
          o.precioMaximo < min.precioMaximo ? o : min,
          elegibles[0]
        );
        a.pujas.push({
          usuario:    winner.usuario,
          cantidad:   a.precioActual,
          fecha:      new Date(),
          automatica: true
        });
        a.ofertasAutomaticas = [];
        a.estadoSubasta      = "finalizada";
        a.estado             = a.inscritos.length ? "en_produccion" : "finalizado";
        await a.save();

        io.emit("actualizar_pujas",   { anuncioId, pujas: [a.pujas.slice(-1)[0]] });
        io.emit("subasta_finalizada", { anuncioId, precioFinal: a.precioActual, ganador: winner.usuario });
        clearInterval(iv);
        return;
      }

      // 2) Decremento dinámico: baseDecr ó baseDecr+1
      const decremento = segundosPasados < resto
        ? baseDecr + 1
        : baseDecr;
      precioActual = Math.max(0, precioActual - decremento);
      segundosPasados++;

      // 3) Guardar y emitir estado + datos de tick
      a.precioActual   = precioActual;
      const tiempoLeft = Math.max(0, duracionSeg - segundosPasados);
      await a.save();

      /* calculamos cuantos segundos quedan para el próximo tick
      const tickIntervalSec = TICK_MS / 1000;           // aquí 1
      const tickLeft        = tickIntervalSec - (segundosPasados % tickIntervalSec);
*/
      io.emit("actualizar_subasta", {
        anuncioId,
        precioActual,
        tiempoRestante: tiempoLeft,
        decremento,    // € que caerán
        tickLeft:1       // s hasta el próximo tick
      });

      // 4) Cierre al terminar tiempo o llegar a 0
      if (segundosPasados >= duracionSeg || precioActual === 0) {
        a.estadoSubasta = "finalizada";
        a.estado        = a.inscritos.length ? "en_produccion" : "finalizado";
        await a.save();
        io.emit("subasta_finalizada", { anuncioId, precioFinal: precioActual, ganador: null });
        clearInterval(iv);
      }
    } catch (err) {
      console.error("❌ Error en subasta holandesa:", err);
      clearInterval(iv);
    }
  }, TICK_MS);
}


// ——————————————————————————————————————————————
// Subasta Inglesa (sube progresivamente)
// ——————————————————————————————————————————————
async function iniciarInglesa(anuncioDoc, io) {
  const anuncioId      = anuncioDoc._id.toString();
  const duracionSeg    = anuncioDoc.inglesaDuracion || anuncioDoc.inglesaIntervalo;
  let tiempoRestante   = duracionSeg;

  // ───> 1) Al arrancar fija el precioActual al precioReserva
  anuncioDoc.precioActual    = anuncioDoc.precioReserva;            // NUEVO
  // ───> 2) actualiza la fecha de expiración
  anuncioDoc.fechaExpiracion = new Date(Date.now() + duracionSeg * 1000); // NUEVO
  await anuncioDoc.save();                                         // NUEVO

  // Arrancar cliente (opcional gauge)
  io.emit("subasta_inglesa_iniciada", {
    anuncioId,
    duracion: duracionSeg
  });

  // ───> Proxy-bidding inicial: de cada usuario solo su oferta mínima
  const autos = anuncioDoc.ofertasAutomaticas || [];               // NUEVO
  const minimoPorUsuario = autos.reduce((map, o) => {               // NUEVO
    if (!map[o.usuario] || o.precioMaximo < map[o.usuario].precioMaximo) { // NUEVO
      map[o.usuario] = o;                                          // NUEVO
    }                                                              // NUEVO
    return map;                                                    // NUEVO
  }, {});                                                          // NUEVO

  const candidatos = Object.values(minimoPorUsuario);               // NUEVO
  if (candidatos.length) {                                         // NUEVO
    candidatos.sort((a, b) => b.precioMaximo - a.precioMaximo);    // NUEVO
    const mejor = candidatos[0].precioMaximo;                     // NUEVO
    const topIguales = candidatos.filter(o => o.precioMaximo === mejor); // NUEVO
    const ganadorAuto = topIguales[Math.floor(Math.random() * topIguales.length)]; // NUEVO

    anuncioDoc.pujas.push({                                        // NUEVO
      usuario:    ganadorAuto.usuario,                             // NUEVO
      cantidad:   mejor,                                           // NUEVO
      fecha:      new Date(),                                      // NUEVO
      automatica: true                                             // NUEVO
    });                                                            // NUEVO

    anuncioDoc.precioActual       = Math.max(anuncioDoc.precioActual, mejor); // NUEVO
    anuncioDoc.ofertasAutomaticas = [];                             // NUEVO
    await anuncioDoc.save();                                       // NUEVO

    io.emit("actualizar_pujas", {                                 // NUEVO
      anuncioId,
      pujas:     anuncioDoc.pujas
    });                                                            // NUEVO
  }                                                                // NUEVO

  // ───> Ahora arrancamos el conteo normal
  const iv = setInterval(async () => {
    const a = await Anuncio.findById(anuncioId);
    if (!a || a.estadoSubasta !== "activa") {
      clearInterval(iv);
      return;
    }

    tiempoRestante--;

    io.emit("actualizar_subasta", {
      anuncioId,
      precioActual: a.precioActual,
      tiempoRestante,
      decremento: 0,
      tickLeft: 1
    });

    if (tiempoRestante <= 0) {
      clearInterval(iv);

      // Al acabar, elegimos ganador entre ofertas automáticas o la última manual:
      let ganador = null;
      let precioFinal = a.precioActual;

      if (a.ofertasAutomaticas.length) {
        // la oferta automática más alta
        const best = a.ofertasAutomaticas
          .sort((x, y) => y.precioMaximo - x.precioMaximo)[0];
        const finalAmt = Math.min(best.precioMaximo, a.precioActual);
        a.pujas.push({
          usuario:    best.usuario,
          cantidad:   finalAmt,
          fecha:      new Date(),
          automatica: true
        });
        ganador     = best.usuario;
        precioFinal = finalAmt;
        a.precioActual = finalAmt;
      }
      else if (a.pujas.length) {
        const last = a.pujas[a.pujas.length - 1];
        ganador = last.usuario;
        precioFinal = last.cantidad;
      }

      a.estadoSubasta = "finalizada";
      a.estado        = a.inscritos.length ? "en_produccion" : "finalizado";
      await a.save();

      io.emit("subasta_finalizada", {
        anuncioId,
        precioFinal,
        ganador
      });
    }
  }, 1000);
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
    if (!anuncio.precioActual) {
      anuncio.precioActual = anuncio.precioReserva;
      await anuncio.save();
    }
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
    // igual que antes: registras, cierras y emites
    anuncio.pujas.push({ usuario, cantidad, fecha: new Date(), automatica: false });
    anuncio.estadoSubasta = "finalizada";
    anuncio.estado        = anuncio.inscritos.length ? "en_produccion" : "finalizado";
    await anuncio.save();
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
  if (cantidad > anuncio.precioActual) {
    anuncio.precioActual = cantidad;
  }
  await anuncio.save();

  io.emit("actualizar_pujas", {
    anuncioId,
    pujas:       anuncio.pujas,
    precioActual: anuncio.precioActual
  });
  // reiniciamos el turno
  io.emit("reset_turno", {
    anuncioId,
    duracion: anuncio.inglesaIntervalo
  });
}

module.exports = {
  iniciarProcesoSubasta,
  iniciarVerificacionSubastas,
  registrarPuja
};