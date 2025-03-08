function iniciarCuentaRegresiva(id, fechaInicio, fechaFin) {
  const container = document.getElementById(`countdown-${id}`);
  if (!container) return;

  const daysEl = document.getElementById(`days-${id}`);
  const hoursEl = document.getElementById(`hours-${id}`);
  const minutesEl = document.getElementById(`minutes-${id}`);
  const secondsEl = document.getElementById(`seconds-${id}`);

  const inicio = new Date(fechaInicio).getTime();
  const fin = new Date(fechaFin).getTime();

  function actualizar() {
      const ahora = new Date().getTime();

      // Caso 1: La subasta aún no ha empezado -> Mostrar cuenta regresiva hasta inicio
      if (ahora < inicio) {
          let diff = inicio - ahora;
          actualizarVisual(diff, "");
          return;
      }

      // Caso 2: La subasta está en curso -> Mostrar cuenta regresiva hasta el fin
      if (ahora >= inicio && ahora < fin) {
          let diff = fin - ahora;
          actualizarVisual(diff, "Tiempo restante:");
          return;
      }

      // Caso 3: La subasta ha terminado -> Mostrar mensaje de finalización
      container.innerHTML = "<span class='text-red-600 font-bold'>Subasta finalizada</span>";
  }

  function actualizarVisual(diff, texto) {
      if (diff < 0) diff = 0;

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      container.innerHTML = `
          <div class="text-sm text-gray-700 font-bold">${texto}</div>
          <div class="flex space-x-2 text-center">
              <div class="countdown-box"><div class="countdown-box-value">${d < 10 ? "0" + d : d}</div><div class="countdown-box-label">DÍAS</div></div>
              <span class="countdown-separator">:</span>
              <div class="countdown-box"><div class="countdown-box-value">${h < 10 ? "0" + h : h}</div><div class="countdown-box-label">HORAS</div></div>
              <span class="countdown-separator">:</span>
              <div class="countdown-box"><div class="countdown-box-value">${m < 10 ? "0" + m : m}</div><div class="countdown-box-label">MINUTOS</div></div>
              <span class="countdown-separator">:</span>
              <div class="countdown-box"><div class="countdown-box-value">${s < 10 ? "0" + s : s}</div><div class="countdown-box-label">SEGUNDOS</div></div>
          </div>
      `;
  }

  actualizar();
  setInterval(actualizar, 1000);
}
