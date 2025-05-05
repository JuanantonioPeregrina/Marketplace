// public/js/subasta.js

document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const userDataEl = document.getElementById("user-data");
    const user       = userDataEl
      ? JSON.parse(userDataEl.dataset.user)
      : {};
  
    // 1) PUJA MANUAL
    document.body.addEventListener("click", e => {
      if (!e.target.classList.contains("pujar-btn")) return;
      const anuncioId   = e.target.dataset.anuncioId;
      const precioEl    = document.getElementById(`precio-${anuncioId}`);
      const precio      = parseInt(precioEl.textContent.replace("€",""), 10);
      if (!user.username) {
        return alert("⚠️ Debes iniciar sesión para pujar.");
      }
      socket.emit("puja_realizada", {
        anuncioId,
        usuario:  user.username,
        cantidad: precio
      });
      // opcional: un pequeño toasteo, pero sin bloquear el flujo con alert()
      console.log(`✅ Puja enviada: ${user.username} => €${precio}`);
    });
  
    // 2) ACTUALIZAR Pujas en vivo
    socket.on("actualizar_pujas", ({ anuncioId, pujas }) => {
      const contenedor = document.getElementById(`pujas-${anuncioId}`);
      if (!contenedor) return;
  
      // reconstruir lista
      let html = "";
      if (pujas.length) {
        pujas.forEach(p => {
          html += `
            <div class="flex justify-between bg-gray-50 p-2 rounded mb-1">
              <span>${p.usuario}</span>
              <span class="${p.automatica?'text-green-500':''}">€${p.cantidad}</span>
            </div>`;
        });
      } else {
        html = `<p class="text-gray-500">Aún no hay pujas.</p>`;
      }
      contenedor.innerHTML = html;
  
      // actualizar ticker de precio
      const max = pujas.length
        ? Math.max(...pujas.map(x => x.cantidad))
        : 0;
      const precioEl = document.getElementById(`precio-${anuncioId}`);
      if (precioEl) precioEl.textContent = `€${max}`;
    });
  
    // 3) ACTUALIZAR precio + timer
    socket.on("actualizar_subasta", ({ anuncioId, precioActual, tiempoRestante }) => {
      const precioEl = document.getElementById(`precio-${anuncioId}`);
      if (precioEl) precioEl.textContent = `€${precioActual}`;
      const timerEl = document.getElementById(`timer-${anuncioId}`);
      if (timerEl) {
        const m = Math.floor(tiempoRestante/60),
              s = tiempoRestante % 60;
        timerEl.textContent = `${m}:${s<10?'0':''}${s}`;
      }
    });
  
    // 4) FINALIZACIÓN: sustituye la lista por el ganador
    socket.on("subasta_finalizada", ({ anuncioId, precioFinal, ganador }) => {
      const wrapper = document.getElementById(`pujas-container-${anuncioId}`);
      if (!wrapper) return;
  
      wrapper.innerHTML = `
        <h3 class="font-semibold text-gray-800 mb-2">🏆 Puja ganadora:</h3>
        <div class="flex justify-between bg-gray-50 p-2 rounded">
          <strong>${ganador}</strong>
          <span class="text-green-600">€${precioFinal}</span>
        </div>`;
  
      // forzar el timer a 00:00
      const timerEl = document.getElementById(`timer-${anuncioId}`);
      if (timerEl) timerEl.textContent = "00:00";
    });
  
  });
  