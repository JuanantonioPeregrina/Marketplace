// public/js/countdown.js

function iniciarCuentaRegresiva(id, fechaInicio, fechaFin) {
  const cont = document.getElementById(`countdown-${id}`);
  if (!cont) return;

  const tInicio = new Date(fechaInicio).getTime();
  const tFin    = fechaFin ? new Date(fechaFin).getTime() : null;

  function dibujar(diffMs, texto) {
    const totalSeg = Math.max(0, Math.floor(diffMs / 1000));
    const d = Math.floor(totalSeg / 86400);
    const h = Math.floor((totalSeg % 86400) / 3600);
    const m = Math.floor((totalSeg % 3600) / 60);
    const s = totalSeg % 60;

    cont.innerHTML = `
      <div class="text-sm text-gray-700 font-bold">${texto}</div>
      <div class="flex space-x-2 text-center">
        <div class="countdown-box">
          <div class="countdown-box-value">${d<10?"0"+d:d}</div>
          <div class="countdown-box-label">DÍAS</div>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-box">
          <div class="countdown-box-value">${h<10?"0"+h:h}</div>
          <div class="countdown-box-label">HORAS</div>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-box">
          <div class="countdown-box-value">${m<10?"0"+m:m}</div>
          <div class="countdown-box-label">MINUTOS</div>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-box">
          <div class="countdown-box-value">${s<10?"0"+s:s}</div>
          <div class="countdown-box-label">SEGUNDOS</div>
        </div>
      </div>`;
  }

  function tick() {
    const ahora = Date.now();
    if (ahora < tInicio) {
      dibujar(tInicio - ahora, "⏳ Comienza en:");
    } else if (tFin && ahora <= tFin) {
      dibujar(tFin - ahora, "⏳ Tiempo restante:");
    } else {
      dibujar(0, "⏳ Finalizado:");
      clearInterval(intervalo);
    }
  }

  tick();
  const intervalo = setInterval(tick, 1000);
}

// Arranca en todos los contadores
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".countdown-container").forEach(el => {
    const id  = el.id.replace("countdown-", "");
    const ini = el.dataset.inicio;
    const fin = el.dataset.fin;
    if (ini && fin) iniciarCuentaRegresiva(id, ini, fin);
  });
});
