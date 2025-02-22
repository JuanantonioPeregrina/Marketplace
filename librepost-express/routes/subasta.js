const Anuncio = require("../database/models/anuncio.model");

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
    }, 60000);
}

//  Registrar pujas y mostrar al usuario en la lista de pujas

async function registrarPuja(io, anuncioId, usuario, cantidad) {
    console.log(`💰 Registrando puja en BD: ${usuario} ha pujado €${cantidad} en el anuncio ${anuncioId}`);

    const anuncio = await Anuncio.findById(anuncioId);
    if (!anuncio || anuncio.estadoSubasta !== "activa") {
        console.error("❌ No se encontró el anuncio o la subasta no está activa.");
        return;
    }

    if (!anuncio.pujas) anuncio.pujas = [];
    anuncio.pujas.push({ usuario, cantidad });

    if (cantidad > anuncio.precioActual) {
        anuncio.precioActual = cantidad;
    }

    await anuncio.save();
    console.log("✅ Puja guardada correctamente en BD.");

    io.emit("actualizar_pujas", { 
        anuncioId, 
        usuario, 
        cantidad, 
        precioActual: anuncio.precioActual,
        pujas: anuncio.pujas 
    });
}



module.exports = { iniciarProcesoSubasta, iniciarVerificacionSubastas, registrarPuja };
