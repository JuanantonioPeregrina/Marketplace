// lee el JSON inyectado en el div#user-data
const userDataEl = document.getElementById('user-data');
const user = userDataEl 
  ? JSON.parse(userDataEl.dataset.user) 
  : {};

// ahora `user.username` funciona igual que antes
console.log("🔍 Usuario detectado:", user);

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
    socket.on("actualizar_pujas", ({ anuncioId, pujas }) => {
        // 1) buscamos el contenedor de pujas para ESTE anuncio
        const pujasContainer = document.getElementById(`pujas-${anuncioId}`);
        const precioElement  = document.getElementById(`precio-${anuncioId}`);
        if (!pujasContainer || !precioElement) return;  // no estamos en esta página
      
        // 2) reconstruimos la lista de pujas
        let html = `<h3 class="font-semibold text-gray-800 mb-2">📢 Pujas realizadas:</h3>`;
        if (pujas.length) {
          for (const p of pujas) {
            html += `
              <div class="flex justify-between bg-gray-50 p-2 rounded mb-1">
                <span>${p.usuario}</span>
                <span class="${p.automatica?'text-green-500':''}">€${p.cantidad}</span>
              </div>`;
          }
        } else {
          html += `<p class="text-gray-500">Aún no hay pujas.</p>`;
        }
        pujasContainer.innerHTML = html;
      
        // 3) actualizamos el precio al máximo
        const max = pujas.length
          ? Math.max(...pujas.map(x => x.cantidad))
          : 0;
        precioElement.innerText = `€${max}`;
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
    const { anuncioId, precioFinal } = data;
  
    // 1) Mostrar alerta
    alert(`⏳ La subasta del anuncio ${anuncioId} ha finalizado con un precio de €${precioFinal}`);
  
    // 2) Forzar "00:00" en el temporizador pequeño
    const timerEl = document.getElementById(`timer-${anuncioId}`);
    if (timerEl) timerEl.innerText = "00:00";
  });
  
});
