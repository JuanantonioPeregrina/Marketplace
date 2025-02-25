/**
 * Inicia un contador regresivo que maneja tres estados:
 * 1) Falta para que empiece:   cuenta atrás a fechaInicio
 * 2) Subasta en curso:         cuenta atrás a fechaFin
 * 3) Subasta finalizada:       muestra texto "Subasta finalizada"
 *
 * @param {string} id - Un identificador único del anuncio
 * @param {string} fechaInicio - Fecha/hora de inicio (ISO) "2026-01-01T00:00:00Z"
 * @param {string} fechaFin - Fecha/hora de fin (ISO)
 */
function iniciarCuentaRegresiva(id, fechaInicio, fechaFin) {
    // Buscamos el contenedor principal (countdown-12345, por ejemplo)
    var container = document.getElementById("countdown-" + id);
    if (!container) return;
  
    // Buscamos los spans individuales para días, horas, minutos, segundos
    var daysEl    = document.getElementById("days-" + id);
    var hoursEl   = document.getElementById("hours-" + id);
    var minutesEl = document.getElementById("minutes-" + id);
    var secondsEl = document.getElementById("seconds-" + id);
  
    // Convertimos a timestamps
    var startTime = new Date(fechaInicio).getTime();
    var endTime   = new Date(fechaFin).getTime();
  
    function actualizar() {
      var now = Date.now();
  
      // (A) SUBASTA FINALIZADA
      if (now >= endTime) {
        container.innerHTML = "<span class='text-red-600 font-bold'>Subasta finalizada</span>";
        return;
      }
  
      // (B) SUBASTA EN CURSO (ahora >= fechaInicio y < fechaFin)
      if (now >= startTime) {
        var diff = endTime - now;
        if (diff < 0) diff = 0;
  
        var d = Math.floor(diff / (1000 * 60 * 60 * 24));
        var h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        var s = Math.floor((diff % (1000 * 60)) / 1000);
  
        daysEl.textContent    = d < 10 ? "0" + d : d;
        hoursEl.textContent   = h < 10 ? "0" + h : h;
        minutesEl.textContent = m < 10 ? "0" + m : m;
        secondsEl.textContent = s < 10 ? "0" + s : s;
  
      } else {
        // (C) TODAVÍA NO HA EMPEZADO (ahora < fechaInicio)
        var diff = startTime - now;
        if (diff < 0) diff = 0;
  
        var d = Math.floor(diff / (1000 * 60 * 60 * 24));
        var h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        var s = Math.floor((diff % (1000 * 60)) / 1000);
  
        daysEl.textContent    = d < 10 ? "0" + d : d;
        hoursEl.textContent   = h < 10 ? "0" + h : h;
        minutesEl.textContent = m < 10 ? "0" + m : m;
        secondsEl.textContent = s < 10 ? "0" + s : s;
      }
    }
  
    // Iniciamos
    actualizar();
    setInterval(actualizar, 1000);
  }
  