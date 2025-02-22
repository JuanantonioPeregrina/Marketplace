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

    // 📢 Evento cuando la subasta se actualiza
    socket.on("actualizar_subasta", (data) => {
        console.log("📢 Actualización recibida:", data);

        const { anuncioId, precioActual, tiempoRestante } = data;
        const precioElement = document.getElementById(`precio-${anuncioId}`);
        const timerElement = document.getElementById(`timer-${anuncioId}`);

        if (precioElement) precioElement.innerText = `€${precioActual}`;

        if (timerElement) {
            if (!Number.isFinite(tiempoRestante) || tiempoRestante < 0) {
                console.error(`⚠️ tiempoRestante inválido para ${anuncioId}:`, tiempoRestante);
                timerElement.innerText = "0:00"; // Si hay error, lo ponemos en 0
            } else {
                const minutos = Math.floor(tiempoRestante / 60);
                const segundos = tiempoRestante % 60;
                timerElement.innerText = `${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;
            }
        }
    });

    // 📢 Evento cuando la subasta finaliza
    socket.on("subasta_finalizada", (data) => {
        alert(`La subasta del anuncio ${data.anuncioId} ha finalizado con un precio de €${data.precioFinal}`);
    });

    // 📢 Evento cuando alguien puja
    socket.on("actualizar_pujas", (data) => {
        const pujasContainer = document.getElementById(`pujas-${data.anuncioId}`);
        if (pujasContainer) {
            pujasContainer.innerHTML += `<p>${data.usuario} ha pujado €${data.cantidad}</p>`;
        }
    });

    // 🔹 Botón para hacer una puja
    document.querySelectorAll(".pujar-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const anuncioId = event.target.getAttribute("data-anuncio-id");
            const precioActual = document.getElementById(`precio-${anuncioId}`).innerText.replace("€", "").trim();

            if (!user || !user.username) {
                alert("Debes iniciar sesión para pujar.");
                return;
            }

            console.log(`⏳ Enviando puja: Usuario: ${user.username}, Cantidad: ${precioActual}`);

            socket.emit("puja_realizada", {
                anuncioId: anuncioId,
                usuario: user.username, 
                cantidad: parseInt(precioActual)
            });

            alert(`Puja enviada con €${precioActual}`);
        });
    });
});
