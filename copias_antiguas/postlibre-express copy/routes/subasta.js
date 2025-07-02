const Anuncio = require("../database/models/anuncio.model");

// ✅ Función para procesar ofertas automáticas en cada iteración del decremento del precio
async function procesarOfertasAutomaticas(anuncio, io) {
    if (!anuncio.ofertasAutomaticas || anuncio.ofertasAutomaticas.length === 0) return;

    const ofertasAplicables = anuncio.ofertasAutomaticas.filter(oferta => oferta.precioMaximo >= anuncio.precioActual);

    for (const oferta of ofertasAplicables) {
        console.log(`🤖 Ejecutando oferta automática de ${oferta.usuario} por €${oferta.precioMaximo}`);

        // Crear la puja automática
        const nuevaPujaAutomatica = {
            usuario: oferta.usuario,
            cantidad: oferta.precioMaximo,
            fecha: new Date(),
            automatica: true
        };

        anuncio.pujas.push(nuevaPujaAutomatica);

        // Eliminar la oferta automática ya que se ha ejecutado
        anuncio.ofertasAutomaticas = anuncio.ofertasAutomaticas.filter(o => o._id.toString() !== oferta._id.toString());

        // Guardar cambios
        await anuncio.save();

        // Emitir evento a los clientes para actualizar la interfaz
        io.emit("actualizar_pujas", {
            anuncioId: anuncio._id.toString(),
            pujas: anuncio.pujas
        });

        console.log(`✅ Oferta automática de ${oferta.usuario} registrada y eliminada de la lista de ofertas automáticas.`);
    }
}

// ✅ Modificar el temporizador de la subasta para verificar ofertas automáticas en cada iteración
async function iniciarProcesoSubasta(anuncioId, io) {
    const anuncio = await Anuncio.findById(anuncioId);
    if (!anuncio || anuncio.estadoSubasta !== "activa") return;

    console.log(`🚀 Subasta iniciada: ${anuncio.titulo}`);

    let tiempoRestante = 300; // 5 minutos en segundos
    let precioActual = anuncio.precioInicial;
    const decremento = 100; // Se reduce de 100 en 100 cada 10s

    const intervalo = setInterval(async () => {
        try {
            const anuncioActualizado = await Anuncio.findById(anuncioId);
            if (!anuncioActualizado || anuncioActualizado.estadoSubasta !== "activa") {
                console.log(`⏹️ Subasta finalizada.`);
                clearInterval(intervalo);
                return;
            }

            if (tiempoRestante <= 0 || precioActual <= 0) {
                console.log(`⏳ Subasta finalizada automáticamente.`);
                anuncioActualizado.estadoSubasta = "finalizada";
                await anuncioActualizado.save();
                io.emit("subasta_finalizada", { anuncioId, precioFinal: precioActual });
                clearInterval(intervalo);
                return;
            }

            // Reducir el precio actual
            if (anuncioActualizado.precioActual > 0) {
                anuncioActualizado.precioActual = Math.max(0, anuncioActualizado.precioActual - decremento);
            }

            // 🔹 Verificar ofertas automáticas en cada iteración
            await procesarOfertasAutomaticas(anuncioActualizado, io);

            // Evitar valores NaN en el tiempo restante
            tiempoRestante = Math.max(0, tiempoRestante - 10);
            if (anuncioActualizado.precioActual <= 0) {
                tiempoRestante = 0;
            }

            console.log(`⏳ Tiempo restante para ${anuncioActualizado.titulo}: ${tiempoRestante} segundos`);

            io.emit("actualizar_subasta", { 
                anuncioId, 
                precioActual: anuncioActualizado.precioActual, 
                tiempoRestante: tiempoRestante
            });

            await anuncioActualizado.save();
        } catch (error) {
            console.error("❌ Error en la subasta:", error);
            clearInterval(intervalo);
        }
    }, 10000);
}


// ✅ Revisar si hay ofertas automáticas que deben activarse
async function verificarOfertasAutomaticas(anuncioId, io) {
    const anuncio = await Anuncio.findById(anuncioId);
    if (!anuncio || anuncio.estadoSubasta !== "activa") return;

    let ofertasEjecutadas = [];

    anuncio.ofertasAutomaticas.forEach(oferta => {
        if (anuncio.precioActual >= oferta.precioMaximo) {
            console.log(`🚀 Activando oferta automática de ${oferta.usuario} por €${oferta.precioMaximo}`);

            // 🔹 Registrar la puja automática en `pujas`
            anuncio.pujas.push({
                usuario: oferta.usuario,
                cantidad: oferta.precioMaximo,
                fecha: new Date(),
                automatica: true
            });

            // 🔹 Actualizar el precio actual
            anuncio.precioActual = oferta.precioMaximo;
            ofertasEjecutadas.push(oferta._id);
        }
    });

    // 🗑️ Eliminar las ofertas ejecutadas
    anuncio.ofertasAutomaticas = anuncio.ofertasAutomaticas.filter(oferta => !ofertasEjecutadas.includes(oferta._id));

    await anuncio.save();

    // 📢 Emitir evento para actualizar la interfaz
    io.emit("actualizar_pujas", {
        anuncioId,
        usuario: anuncio.pujas[anuncio.pujas.length - 1]?.usuario || "N/A",
        cantidad: anuncio.precioActual,
        pujas: anuncio.pujas
    });
}

// ✅ Revisar cada minuto si hay subastas programadas que deben activarse
function iniciarVerificacionSubastas(io) {
    setInterval(async () => {
        console.log("🔎 Verificando subastas pendientes...");
        const ahora = new Date();
        const anunciosPendientes = await Anuncio.find({
            estadoSubasta: "pendiente",
            fechaInicioSubasta: { $lte: ahora } // Si la fecha es menor o igual a ahora, la subasta debe activarse
        });

        for (let anuncio of anunciosPendientes) {
            console.log(`⏳ Activando subasta programada: ${anuncio.titulo}`);
            anuncio.estadoSubasta = "activa";
            anuncio.precioActual = anuncio.precioInicial;
            await anuncio.save();
            iniciarProcesoSubasta(anuncio._id, io);
        }
    }, 60000); // Se ejecuta cada minuto
}


// ✅ Registrar pujas y mostrar al usuario en la lista de pujas
async function registrarPuja(io, anuncioId, usuario, cantidad) {
    console.log(`💰 Registrando puja en BD: ${usuario} ha pujado €${cantidad} en el anuncio ${anuncioId}`);

    const anuncio = await Anuncio.findById(anuncioId);
    if (!anuncio || anuncio.estadoSubasta !== "activa") {
        console.error("❌ No se encontró el anuncio o la subasta no está activa.");
        return;
    }

    // ✅ Asegurar que el array de pujas existe
    if (!anuncio.pujas) anuncio.pujas = [];

    // 📌 Agregar la puja al array
    anuncio.pujas.push({ usuario, cantidad, fecha: new Date(), automatica: false });

    // 📌 Si la puja es mayor que el precio actual, actualizarlo
    if (cantidad > anuncio.precioActual) {
        anuncio.precioActual = cantidad;
    }

    try {
        await anuncio.save(); // 💾 Guardar en la base de datos
        console.log("✅ Puja guardada correctamente en BD:", anuncio.pujas);
    } catch (error) {
        console.error("❌ Error al guardar la puja en MongoDB:", error);
    }

    // 📢 Notificar a todos los clientes que la puja ha sido actualizada
    io.emit("actualizar_pujas", { 
        anuncioId, 
        usuario, 
        cantidad, 
        precioActual: anuncio.precioActual,
        pujas: anuncio.pujas // Enviar todas las pujas actualizadas
    });
}

module.exports = { iniciarProcesoSubasta, iniciarVerificacionSubastas, registrarPuja };
