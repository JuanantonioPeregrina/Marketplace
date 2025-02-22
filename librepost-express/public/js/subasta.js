/*
document.addEventListener("DOMContentLoaded", function () {
    const socket = io();

    socket.on("actualizar_subasta", (data) => {
        const precioElemento = document.getElementById(`precio-${data.anuncioId}`);
        const tiempoElemento = document.getElementById(`timer-${data.anuncioId}`);

        if (precioElemento && tiempoElemento) {
            precioElemento.innerText = `€${data.precioActual}`;
            tiempoElemento.innerText = `${data.tiempoRestante}s`;

            precioElemento.classList.add("bajando");
            setTimeout(() => precioElemento.classList.remove("bajando"), 500);
        }
    });

    socket.on("subasta_finalizada", (data) => {
        const anuncioElemento = document.getElementById(`anuncio-${data.anuncioId}`);
        if (anuncioElemento) {
            anuncioElemento.innerHTML += `<p class='text-green-500 text-lg font-bold'>¡Subasta finalizada! Ganador: ${data.ganador || "Nadie"} por €${data.precioFinal}</p>`;
        }
    });

    document.querySelectorAll(".pujar-btn").forEach(button => {
        button.addEventListener("click", function () {
            const anuncioId = this.getAttribute("data-anuncio-id");
            socket.emit("pujar", { anuncioId });
        });
    });
});
*/
document.addEventListener("DOMContentLoaded", function () {
    const socket = io();

    console.log("🔄 Cliente conectado a Socket.io");
    console.log("🔍 Usuario detectado:", user);

    document.body.addEventListener("click", function (event) {
        if (event.target.classList.contains("pujar-btn")) {
            console.log("🔥 Click detectado en el botón de puja");
    
            const anuncioId = event.target.getAttribute("data-anuncio-id");
            const precioElement = document.getElementById(`precio-${anuncioId}`);
            
            if (!precioElement) {
                console.error("❌ No se encontró el elemento del precio.");
                return;
            }
    
            const precioActual = parseInt(precioElement.innerText.replace("€", "").trim());
    
            if (!user || !user.username) {
                alert("⚠️ Debes iniciar sesión para pujar.");
                return;
            }
    
            console.log(`⏳ Enviando puja: Usuario: ${user.username}, Cantidad: ${precioActual}`);
    
            // Emitir evento al servidor con el precio actual como cantidad
            socket.emit("puja_realizada", {
                anuncioId: anuncioId,
                usuario: user.username,
                cantidad: precioActual
            });
    
            alert(`✅ Puja enviada con €${precioActual}`);
        }
    });
    

    // 📢 Evento cuando la subasta se actualiza
    socket.on("actualizar_pujas", (data) => {
        console.log("📢 Nueva puja registrada:", data);
    
        const { anuncioId, usuario, cantidad, precioActual, pujas } = data;
        const pujasContainer = document.getElementById(`pujas-${anuncioId}`);
        const precioElement = document.getElementById(`precio-${anuncioId}`);
    
        if (pujasContainer) {
            // Limpiar la lista de pujas y volver a renderizar todas las pujas
            pujasContainer.innerHTML = "<h4 class='text-md font-semibold text-gray-700'>📢 Pujas realizadas:</h4>";
            pujas.forEach(puja => {
                pujasContainer.innerHTML += `<p class="text-gray-800"><strong>${puja.usuario}</strong> ha pujado €${puja.cantidad}</p>`;
            });
        }
    
        if (precioElement) {
            precioElement.innerText = `€${precioActual}`;
        }
    });
    
    // 📢 Evento cuando la subasta finaliza
    socket.on("subasta_finalizada", (data) => {
        alert(`La subasta del anuncio ${data.anuncioId} ha finalizado con un precio de €${data.precioFinal}`);
    });
});
