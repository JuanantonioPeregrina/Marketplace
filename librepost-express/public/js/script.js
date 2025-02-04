
                function actualizarCuentaRegresiva(id, fechaExpiracion) {
                    const expiraEl = document.getElementById(`expira-${id}`);
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
            