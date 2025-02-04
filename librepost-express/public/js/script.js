
function actualizarCuentaRegresiva(id, fechaExpiracion) {
    const expiraEl = document.getElementById(`expira-${id}`);
    if (!expiraEl) {
        console.warn(`Elemento con id expira-${id} no encontrado`);
        return;
    }

    const fin = new Date(fechaExpiracion).getTime();

    function actualizar() {
        const ahora = new Date().getTime();
        const diferencia = fin - ahora;

        if (diferencia <= 0) {
            expiraEl.innerText = "⚠️ Inscripción cerrada";
            return;
        }

        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));

        expiraEl.innerText = `⏳ Tiempo restante: ${dias}d ${horas}h ${minutos}m`;
    }

    actualizar();
    setInterval(actualizar, 60000);
}


                actualizarCuentaRegresiva("<%= anuncio._id %>", "<%= anuncio.fechaExpiracion %>");
            
                
                function inscribirse(anuncioId) {
                    fetch(`/inscribirse/${anuncioId}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.message) {
                            alert(data.message);
                            actualizarListaInscritos(anuncioId, data.inscritos);
                        } else {
                            alert("Error al inscribirse. Intenta nuevamente.");
                        }
                    })
                    .catch(error => console.error("Error en la inscripción:", error));
                }
                
                function actualizarListaInscritos(anuncioId, inscritos) {
                    const lista = document.getElementById(`inscritos-${anuncioId}`);
                    if (lista) {
                        lista.innerHTML = inscritos.map(user => `<li class="text-sm text-gray-700">${user}</li>`).join("");
                    }
                }
                

                document.addEventListener("DOMContentLoaded", function () {
                    const notifButton = document.getElementById("notifButton");
                    const notifDropdown = document.getElementById("notifDropdown");
                
                    // Función para alternar la visibilidad del dropdown
                    notifButton.addEventListener("click", function () {
                        notifDropdown.classList.toggle("show");
                    });
                
                    // Cerrar el dropdown si se hace clic fuera de él
                    document.addEventListener("click", function (event) {
                        if (!notifButton.contains(event.target) && !notifDropdown.contains(event.target)) {
                            notifDropdown.classList.remove("show");
                        }
                    });
                });
                
                function iniciarChat(anuncioId, destinatario) {
                    fetch(`/chat/iniciar`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ anuncioId, destinatario })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            window.location.href = `/chat?anuncioId=${anuncioId}&usuario=${destinatario}`;
                        } else {
                            alert(data.message || "Error al iniciar la conversación.");
                        }
                    })
                    .catch(error => console.error("Error iniciando el chat:", error));
                }
                
                
                