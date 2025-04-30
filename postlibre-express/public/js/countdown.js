function iniciarCuentaRegresiva(id) {
  const cont       = document.getElementById(`countdown-${id}`);
  const boxes      = document.getElementById(`boxes-${id}`);
  const tInicio    = new Date(cont.dataset.inicio).getTime();
  const tFin       = new Date(cont.dataset.fin).getTime();
  let intervalo;

  function dibujar(diffMs) {
    const totalSeg = Math.max(0, Math.floor(diffMs / 1000));
    const d = Math.floor(totalSeg / 86400);
    const h = Math.floor((totalSeg % 86400) / 3600);
    const m = Math.floor((totalSeg % 3600) / 60);
    const s = totalSeg % 60;

    boxes.innerHTML = `
      <div class="flex space-x-2 text-center">
        <div class="countdown-box">
          <div class="countdown-box-value">${String(d).padStart(2,'0')}</div>
          <div class="countdown-box-label">DÍAS</div>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-box">
          <div class="countdown-box-value">${String(h).padStart(2,'0')}</div>
          <div class="countdown-box-label">HORAS</div>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-box">
          <div class="countdown-box-value">${String(m).padStart(2,'0')}</div>
          <div class="countdown-box-label">MINUTOS</div>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-box">
          <div class="countdown-box-value">${String(s).padStart(2,'0')}</div>
          <div class="countdown-box-label">SEGUNDOS</div>
        </div>
      </div>`;
  }

  function tick() {
    const ahora = Date.now();
    if (ahora < tInicio) {
      dibujar(tInicio - ahora);
    } else if (ahora < tFin) {
      dibujar(tFin - ahora);
    } else {
      dibujar(0);
      clearInterval(intervalo);
    }
  }

  tick();
  intervalo = setInterval(tick, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".countdown-container").forEach(el => {
    const id  = el.id.replace("countdown-","");
    if (el.dataset.inicio && el.dataset.fin) iniciarCuentaRegresiva(id);
  });
});
