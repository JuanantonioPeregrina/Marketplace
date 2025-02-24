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

    // 📢 Evento cuando se recibe una nueva puja (manual o automática)
    // 📢 Evento cuando se recibe una nueva puja (manual o automática)
socket.on("actualizar_pujas", (data) => {
    console.log("📥 Datos de pujas recibidos en cliente:", JSON.stringify(data, null, 2)); // 🔥 DEBUG

    const { anuncioId, pujas } = data;
    const pujasContainer = document.getElementById(`pujas-${anuncioId}`);
    const precioElement = document.getElementById(`precio-${anuncioId}`);

    if (!pujasContainer || !precioElement) {
        console.error("❌ No se encontró el contenedor de pujas o precio.");
        return;
    }

    // 🔹 Mostrar todas las pujas
    pujasContainer.innerHTML = `<h4 class="text-md font-semibold text-gray-700">📢 Pujas realizadas:</h4>`;

    pujas.forEach(puja => {
        pujasContainer.innerHTML += `
            <p class="text-gray-800">
                <strong>${puja.usuario}</strong> ha pujado €${puja.cantidad} 
                ${puja.automatica ? '<span class="text-green-500">🤖 (Automática)</span>' : ''}
            </p>`;
    });

    if (pujas.length === 0) {
        pujasContainer.innerHTML += `<p class="text-gray-500">Aún no hay pujas.</p>`;
    }

    // 🔹 Actualizar el precio actual con la puja más alta
    const maxPuja = Math.max(...pujas.map(p => p.cantidad), 0);
    precioElement.innerText = `€${maxPuja}`;
});

    
    // 📢 Evento cuando se recibe una confirmación de oferta automática
    socket.on("confirmar_oferta_automatica", (data) => {
        console.log("🤖 Oferta automática confirmada:", data);
        
        const { anuncioId, usuario, cantidad, pujas } = data;
        const pujasContainer = document.getElementById(`pujas-${anuncioId}`);
        const precioElement = document.getElementById(`precio-${anuncioId}`);

        if (pujasContainer && precioElement) {
            // 🔹 Actualizar la lista de pujas con la oferta automática
            pujasContainer.innerHTML = `<h4 class="text-md font-semibold text-gray-700">📢 Pujas realizadas:</h4>`;

            pujas.forEach(puja => {
                pujasContainer.innerHTML += `
                    <p class="text-gray-800">
                        <strong>${puja.usuario}</strong> ha pujado €${puja.cantidad} 
                        ${puja.automatica ? '<span class="text-green-500">🤖 (Automática)</span>' : ''}
                    </p>`;
            });

            // 🔹 Actualizar el precio actual con la puja más alta
            const maxPuja = Math.max(...pujas.map(p => p.cantidad), 0);
            precioElement.innerText = `€${maxPuja}`;
        }
    });

    // ✅ Evento que actualiza el precio automáticamente cuando disminuye
    socket.on("actualizar_subasta", (data) => {
        console.log("📢 Subasta actualizada:", data);

        const { anuncioId, precioActual, tiempoRestante } = data;
        const precioElement = document.getElementById(`precio-${anuncioId}`);
        const timerElement = document.getElementById(`timer-${anuncioId}`);

        if (precioElement) {
            precioElement.innerText = `€${precioActual}`;
        }

        if (timerElement) {
            if (!isNaN(tiempoRestante) && tiempoRestante >= 0) { 
                const minutos = Math.floor(tiempoRestante / 60);
                const segundos = tiempoRestante % 60;
                timerElement.innerText = `${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;
            } else {
                timerElement.innerText = "00:00"; 
            }
        }
    });

    // 📢 Evento cuando la subasta finaliza
    socket.on("subasta_finalizada", (data) => {
        alert(`⏳ La subasta ha finalizado con un precio final de €${data.precioFinal}`);
    });
});
