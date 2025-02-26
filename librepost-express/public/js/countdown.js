/**
 * Inicia un contador regresivo dinámico, considerando:
 * 1. Tiempo restante para que la subasta comience
 * 2. Tiempo restante hasta que la subasta finalice una vez iniciada
 * 3. Mensaje de subasta finalizada cuando termine
 * 
 * @param {string} id - ID único del anuncio
 * @param {string} fechaInicio - Fecha/hora de inicio (ISO 8601)
 * @param {string} fechaFin - Fecha/hora de finalización (ISO 8601)
 */
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

      if (ahora >= fin) {
          container.innerHTML = "<span class='text-red-600 font-bold'>Subasta finalizada</span>";
          return;
      }

      let objetivo = ahora < inicio ? inicio : fin;
      let diff = objetivo - ahora;

      if (diff < 0) diff = 0;

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      daysEl.textContent = d < 10 ? "0" + d : d;
      hoursEl.textContent = h < 10 ? "0" + h : h;
      minutesEl.textContent = m < 10 ? "0" + m : m;
      secondsEl.textContent = s < 10 ? "0" + s : s;
  }

  actualizar();
  setInterval(actualizar, 1000);
}
