let _dropCountdownIv = null;
let _currentDecremento = 0;
let _dropTimeout = null;

document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const userDataEl = document.getElementById("user-data");
  const user = userDataEl ? JSON.parse(userDataEl.dataset.user) : {};

  // Obtener el ID del anuncio desde el dataset
  const auctionMsgEl = document.getElementById("auctionMessage");
  const anuncioId = auctionMsgEl ? auctionMsgEl.dataset.id : null;

  if (anuncioId) {
    socket.emit("join_auction", anuncioId);
    console.log(`✅ Unido a la sala: auction_${anuncioId}`);
  }

  /**
   * ============================
   * 1) PUJA MANUAL
   * ============================
   */
  document.body.addEventListener("click", e => {
    if (!e.target.classList.contains("pujar-btn")) return;
  
    const anuncioId = e.target.dataset.anuncioId;
    const inputManual = document.getElementById("puja-manual");
  
    let cantidad;
  
    if (inputManual) {
      const valorInput = parseInt(inputManual.value, 10);
      if (isNaN(valorInput) || valorInput <= 0) {
        return alert("Introduce una cantidad válida para pujar.");
      }
      cantidad = valorInput;
    } else {
      const precioEl = document.getElementById(`precio-${anuncioId}`);
      cantidad = parseInt(precioEl.textContent.replace("€", ""), 10);
    }
  
    if (!user.username) {
      return alert("⚠️ Debes iniciar sesión para pujar.");
    }
  
    socket.emit("puja_realizada", {
      anuncioId,
      usuario: user.username,
      cantidad
    });
  
    console.log(`✅ Puja enviada: ${user.username} => €${cantidad}`);
  });
  

  /**
   * ============================
   * 2) ACTUALIZAR PUJAS EN VIVO
   * ============================
   */
  socket.on("actualizar_pujas", ({ anuncioId, pujas, precioActual }) => {
    const contenedor = document.getElementById(`pujas-${anuncioId}`);
    if (!contenedor) return;

    let html = "";
    if (pujas.length) {
      pujas.forEach(p => {
        html += `
          <div class="flex justify-between bg-gray-50 p-2 rounded mb-1">
            <span>${p.usuario}</span>
            <span class="${p.automatica ? 'text-green-500' : ''}">€${p.cantidad}</span>
          </div>`;
      });
    } else {
      html = `<p class="text-gray-500">Aún no hay pujas.</p>`;
    }
    contenedor.innerHTML = html;

    // Actualizar el precio en la vista
    const precioEl = document.getElementById(`precio-${anuncioId}`);
    if (precioEl) precioEl.textContent = `€${precioActual}`;
  });

  /**
   * ============================
   * 3) ACTUALIZAR PRECIO + TIMER
   * ============================
   */
  const lineEl = document.getElementById("countdown-line");
  const dropEl = document.getElementById("next-drop");

  socket.on("actualizar_subasta", ({ anuncioId, precioActual, tiempoRestante, decremento, tickLeft }) => {
    // Actualizar precio
    const pe = document.getElementById(`precio-${anuncioId}`);
    if (pe) pe.textContent = `€${precioActual}`;

    // Actualizar temporizador
    const te = document.getElementById(`timer-${anuncioId}`);
    if (te) {
      const m = Math.floor(tiempoRestante / 60);
      const s = tiempoRestante % 60;
      te.textContent = `${m}:${s < 10 ? "0" : ""}${s}`;
    }

    // Actualizar barra lineal
    if (lineEl) lineEl.style.width = `${(tiempoRestante / 300) * 100}%`;

    // Animación del decremento
    if (_dropTimeout) clearTimeout(_dropTimeout);
    dropEl.textContent = `${decremento} € en ${tickLeft}s`;

    _dropTimeout = setTimeout(() => {
      dropEl.textContent = `${decremento} € en 0s`;
    }, Math.max(0, tickLeft * 1000 - 100));
  });

  /**
   * ============================
   * 4) FINALIZACIÓN DE SUBASTA
   * ============================
   */
  socket.on("subasta_finalizada", ({ anuncioId, precioFinal, ganador }) => {
    const wrapper = document.getElementById(`pujas-container-${anuncioId}`);
    if (!wrapper) return;

    wrapper.innerHTML = `
      <h3 class="font-semibold text-gray-800 mb-2">🏆 Puja ganadora:</h3>
      <div class="flex justify-between bg-gray-50 p-2 rounded">
        <strong>${ganador ? ganador : 'Sin ganador'}</strong>
        <span class="text-green-600">€${precioFinal}</span>
      </div>`;

    // Forzar el timer a 00:00
    const timerEl = document.getElementById(`timer-${anuncioId}`);
    if (timerEl) timerEl.textContent = "00:00";
  });

  /**
   * ============================
   * 5) REINICIAR TURNO
   * ============================
   */
  socket.on("reset_turno", ({ anuncioId, duracion }) => {
    console.log(`⏳ Reiniciando turno para subasta: ${anuncioId}`);

    const timerEl = document.getElementById(`timer-${anuncioId}`);
    if (timerEl) {
      const m = Math.floor(duracion / 60);
      const s = duracion % 60;
      timerEl.textContent = `${m}:${s < 10 ? "0" : ""}${s}`;
    }

    // Reconfigurar la barra lineal
    if (lineEl) lineEl.style.width = "100%";
  });

  /**
   * ============================
   * 6) INICIO SUBASTA INGLESA
   * ============================
   */
  socket.on("subasta_inglesa_iniciada", ({ anuncioId, duracion }) => {
    console.log(`🚀 Subasta inglesa iniciada: ${anuncioId} con duración de ${duracion}s`);

    const timerEl = document.getElementById(`timer-${anuncioId}`);
    if (timerEl) {
      const m = Math.floor(duracion / 60);
      const s = duracion % 60;
      timerEl.textContent = `${m}:${s < 10 ? "0" : ""}${s}`;
    }

    // Restablecer barra lineal
    if (lineEl) lineEl.style.width = "100%";
  });
  /**
   * ============================
   * 7) RECARGAR PÁGINA AL INICIAR SUBASTA
   * ============================
   */
  socket.on("subasta_iniciada", ({ anuncioId }) => {
    const auctionMsgEl = document.getElementById("auctionMessage");
    const currentAnuncioId = auctionMsgEl ? auctionMsgEl.dataset.id : null;

    // Solo recargar si es la subasta actual
    if (currentAnuncioId === anuncioId) {
      console.log(`🔄 Recargando la página para activar los sockets en la subasta: ${anuncioId}`);
      location.reload();
    }
  });

});
