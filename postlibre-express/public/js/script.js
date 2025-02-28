
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
                            location.reload(); // ✅ Recarga la página para actualizar el botón después de la inscripción
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
                    console.log(`🔹 Iniciando chat con anuncioId: ${anuncioId}, destinatario: ${destinatario}`);
                
                    fetch(`/chat/iniciar`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ anuncioId, destinatario })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log("📩 Respuesta del servidor:", data);
                        if (data.success) {
                            console.log(`✅ Redirigiendo a /chat?anuncioId=${anuncioId}&usuario=${destinatario}`);
                            window.location.href = `/chat?anuncioId=${anuncioId}&usuario=${destinatario}`;
                        } else {
                            console.error("⚠️ Error al iniciar la conversación:", data.message);
                            alert(data.message || "Error al iniciar la conversación.");
                        }
                    })
                    .catch(error => console.error("❌ Error iniciando el chat:", error));
                }
                
                // Muestra u oculta el menú de perfil
                function toggleProfileMenu() {
                    const menu = document.getElementById("profile-menu");
                    const icon = document.getElementById("profile-icon");
                
                    // Alternar visibilidad
                    if (menu.style.display === "block") {
                        menu.style.display = "none";
                    } else {
                        // Calcular posición exacta debajo del icono
                        const rect = icon.getBoundingClientRect();
                        menu.style.top = `${rect.bottom + 8}px`;  // Ajusta la distancia vertical
                        menu.style.left = `${rect.left}px`;  // Ajusta la alineación horizontal
                
                        menu.style.display = "block";
                    }
                }
                
                // Cierra el menú si se hace clic fuera de él
                document.addEventListener("click", function(event) {
                    const profileIcon = document.getElementById("profile-icon");
                    const menu = document.getElementById("profile-menu");
                    if (!profileIcon.contains(event.target) && !menu.contains(event.target)) {
                        menu.style.display = "none";
                    }
                });
                
                              

                document.addEventListener("DOMContentLoaded", async () => {
                    try {
                        const response = await fetch("/api/anuncios");
                        const data = await response.json();
                
                        if (data.success) {
                            const anunciosContainer = document.getElementById("anuncios-container");
                            anunciosContainer.innerHTML = "";
                
                            data.anuncios.forEach(anuncio => {
                                const anuncioHTML = `
                                    <div class="anuncio">
                                        <h3>${anuncio.titulo}</h3>
                                        <p>${anuncio.descripcion}</p>
                                        <img src="${anuncio.imagen}" alt="Imagen del anuncio">
                                        <p>Precio: ${anuncio.precioActual}€</p>
                                    </div>
                                `;
                                anunciosContainer.innerHTML += anuncioHTML;
                            });
                        }
                    } catch (error) {
                        console.error("Error al cargar los anuncios:", error);
                    }
                });
                