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

            if (!user || user.username === "Invitado") {
                alert("⚠️ Debes iniciar sesión para pujar.");
                return;
            }

            const anuncioId = event.target.getAttribute("data-anuncio-id");
            const precioElement = document.getElementById(`precio-${anuncioId}`);
            const precioActual = parseInt(precioElement.innerText.replace("€", "").trim());

            const cantidadPuja = prompt("Introduce tu puja (€):", precioActual + 50);
            if (!cantidadPuja || isNaN(cantidadPuja) || cantidadPuja <= precioActual) {
                alert("⚠️ La puja debe ser mayor que el precio actual.");
                return;
            }

            console.log(`⏳ Enviando puja: Usuario: ${user.username}, Cantidad: ${cantidadPuja}`);

            socket.emit("puja_realizada", {
                anuncioId: anuncioId,
                usuario: user.username, 
                cantidad: parseInt(cantidadPuja)
            });

            alert(`✅ Puja enviada con €${cantidadPuja}`);
        }
    });





    // 📢 Evento cuando la subasta se actualiza
    socket.on("actualizar_pujas", (data) => {
        console.log("📢 Nueva puja registrada:", data);

        const { anuncioId, usuario, cantidad, precioActual, pujas } = data;
        const pujasContainer = document.getElementById(`pujas-${anuncioId}`);
        const precioElement = document.getElementById(`precio-${anuncioId}`);

        if (pujasContainer) {
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
