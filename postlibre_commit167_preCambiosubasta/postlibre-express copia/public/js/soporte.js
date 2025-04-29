document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const role = document.body.getAttribute('data-user-logged') === 'true' ? 'admin' : 'guest';
    let currentRoom = null;
    let mySocketId = null;
    const mensajesCrudos = document.body.getAttribute('data-mensajes-json');
    const mensajesIniciales = mensajesCrudos ? JSON.parse(mensajesCrudos.replace(/&quot;/g, '"').replace(/&apos;/g, "'")) : [];

    let usuarioActual = document.body.getAttribute('data-username') || '';
        if (role === 'admin') usuarioActual = 'admin';

    const conversacionActiva = document.body.getAttribute('data-conversacion-activa') || '';


    socket.on('connect', () => {
        mySocketId = socket.id;
        const username = document.body.getAttribute('data-username') || (role === 'admin' ? 'Soporte' : `Invitado-${socket.id.slice(0, 5)}`);
        socket.emit('joinSupport', { role, username });
    });

    // Actualizar lista de usuarios conectados
    socket.on('updateUsersList', (users) => {
        const select = document.getElementById('target-user');
        if (select) {
            select.innerHTML = '<option value="">Todos</option>';
            users.forEach(user => {
                if (user.socketId !== socket.id) {
                    const option = document.createElement('option');
                    option.value = user.socketId;
                    option.textContent = user.username;
                    select.appendChild(option);
                }
            });
        }
    });

    // Lista de invitados activos (solo admin)
    if (role === 'admin') {
        socket.on('activeGuests', (guests) => {
            const guestList = document.getElementById('active-guests');
            if (guestList) {
                guestList.innerHTML = '';
                for (const [socketId, username] of Object.entries(guests)) {
                    const li = document.createElement('li');
                    li.textContent = username;
                    li.addEventListener('click', () => {
                        currentRoom = socketId;
                        socket.emit('requestChatHistory', currentRoom);
                        loadChatHistory(currentRoom);
                    });
                    guestList.appendChild(li);
                }
            }
        });

        socket.on('loadChatHistory', (messages) => {
            document.getElementById('messages').innerHTML = '';
            messages.forEach(({ remitente, contenido, fecha }) => {
                const tipo = remitente === usuarioActual ? 'self' : 'other';
                appendMessage({ remitente, contenido, fecha }, tipo);
            });
        });
    }

    // Enviar mensaje
    const form = document.getElementById('chat-form');
    const input = document.getElementById('message-input');

    if (form && input) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = input.value.trim();
            if (!message) return;

          // Enviar también el nombre del receptor (solo si eres admin)
        let targetUserId = null;
        let targetUsername = null;

        if (role === 'admin') {
            targetUserId = currentRoom; // socketId
            targetUsername = document.querySelector('#active-guests li.selected')?.textContent || conversacionActiva;
        }

        socket.emit('sendMessage', {
            message,
            targetUserId,
            targetUsername
        });



            input.value = '';
        });
    }

    // Mostrar mensaje recibido
    socket.on('receiveMessage', ({ sender, senderId, message, fecha }) => {
        const isSelf = senderId === mySocketId;
        appendMessage({ remitente: sender, contenido: message, fecha }, isSelf ? 'self' : 'other');
    });

    function appendMessage(messageData, type) {
        const messages = document.getElementById('messages');
        const li = document.createElement('li');

        const fecha = new Date(messageData.fecha || Date.now());
        const horaFormateada = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const texto = (type === 'self' ? 'Tú' : messageData.remitente) + ': ' + messageData.contenido + ' (' + horaFormateada + ')';

        li.textContent = texto;
        li.className = type;
        messages.appendChild(li);
        messages.scrollTop = messages.scrollHeight;
    }

    //  MOSTRAR MENSAJES PRECARGADOS (ya definidos en soporte.ejs)
    if (Array.isArray(mensajesIniciales) && mensajesIniciales.length > 0) {
        mensajesIniciales.forEach((m) => {
          const tipo = m.remitente === usuarioActual ? 'self' : 'other';
          appendMessage(m, tipo);
        });
      
        if (conversacionActiva) {
          appendMessage({ remitente: 'Sistema', contenido: 'Conversación con ' + conversacionActiva }, 'system');
        }
      }

    function loadChatHistory(room) {
        document.getElementById('messages').innerHTML = '';
        appendMessage({ remitente: 'Sistema', contenido: 'Conversación con ' + room }, 'system');
    }
});

