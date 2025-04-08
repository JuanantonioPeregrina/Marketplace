document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const role = document.body.getAttribute('data-user-logged') === 'true' ? 'admin' : 'guest';
    let currentRoom = null;
    let mySocketId = null;

    socket.on('connect', () => {
        mySocketId = socket.id;
        const username = document.body.getAttribute('data-username') || (role === 'admin' ? 'Soporte' : `Invitado-${socket.id.slice(0, 5)}`);
        socket.emit('joinSupport', { role, username });

    });

    // Actualizar lista de usuarios conectados
    socket.on('updateUsersList', (users) => {
        const select = document.getElementById('target-user');
        select.innerHTML = '<option value="">Todos</option>';
        users.forEach(user => {
            if (user.socketId !== socket.id) {
                const option = document.createElement('option');
                option.value = user.socketId;
                option.textContent = user.username;
                select.appendChild(option);
            }
        });
    });

    // Lista de invitados activos para admin
    if (role === 'admin') {
        socket.on('activeGuests', (guests) => {
            const guestList = document.getElementById('active-guests');
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
        });

        socket.on('loadChatHistory', (messages) => {
            document.getElementById('messages').innerHTML = '';
            messages.forEach(({ remitente, contenido }) => {
                appendMessage(`${remitente}: ${contenido}`, 'other');
            });
        });
    }

    // Enviar mensaje
    document.getElementById('chat-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        if (!message) return;

        const targetUserId = document.getElementById('target-user')?.value || null;

        socket.emit('sendMessage', {
            message,
            targetUserId: currentRoom || targetUserId
        });

        input.value = '';
    });

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
    
        const texto = `${type === 'self' ? 'Tú' : messageData.remitente}: ${messageData.contenido} (${horaFormateada})`;
    
        li.textContent = texto;
        li.className = type;
        messages.appendChild(li);
        messages.scrollTop = messages.scrollHeight;
    }
    

    function loadChatHistory(room) {
        document.getElementById('messages').innerHTML = '';
        appendMessage(`Conversación con ${room}`, 'system');
    }
});
