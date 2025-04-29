require("dotenv").config();

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const session = require('express-session'); // Si usas sesiones

//Incluimos socket.io con estas dos dependencias para actualización bidireccional
const http = require('http');
const socketIo = require('socket.io');

const indexRouter = require('./routes/index');
//const gameRouter = require('./routes/game');
const { router: categoriasRouter } = require("./routes/api/categorias"); //con socket.io
const loginRouter = require('./routes/login'); // Ajusta la ruta según la ubicación de tu archivo
const verificarEmailRoutes = require('./routes/verificar-email');
const restrictedRouter = require('./routes/restricted');
const aboutRouter = require('./routes/about');
const publicarRouter = require('./routes/publicar');
const anunciosRouter = require('./routes/anuncios');
const registerRouter = require("./routes/registro");
const inscribirseRouter = require("./routes/inscribirse");
const chatRouter = require("./routes/chat");
const faqsRouter = require("./routes/faqs"); 
const soporteRouter = require('./routes/soporte');
const perfilRouter = require('./routes/mi-cuenta');
const editarPerfilRouter = require('./routes/editar-perfil');
const misAnunciosRouter = require('./routes/mis-anuncios');
const favoritosRouter = require("./routes/favoritos");

const anunciosApi = require('./routes/api/anuncios'); // Rutas REST
const apiExplorerRoutes = require('./routes/api-explorer');
const generateApiKeyRoutes = require("./routes/api/generateApiKey");

const Chat = require("./database/models/chat.model");
const politicaCookiesRouter = require("./routes/politica-cookies");
const terminosRouter = require("./routes/terminos");
const valoracionRouter = require('./routes/perfil');
const resenasRoutes = require('./routes/resenas');
const gestionUsuariosRoutes = require('./routes/gestion-usuarios');
const { iniciarVerificacionSubastas } = require('./routes/subasta'); 
const { registrarPuja } = require("./routes/subasta");
const gestionAnunciosRoutes = require("./routes/gestion-anuncios");
const chatsRoute = require('./routes/mis-chats');
const notificacionesRoutes = require("./routes/notificaciones");
const feedbackRoutes = require('./routes/feedback');
const busquedaRoutes = require('./routes/buscar');
const perfilUsuarioRouter = require('./routes/perfil-publico');
const pagoRouter = require('./routes/pago');



require("./database");

const actualizarEstadosDeAnuncios = require("./utils/estadoAnuncios");
setInterval(actualizarEstadosDeAnuncios, 10000); // cada 10 segundos

// Crear una instancia de Express
const app = express();

// Crear el servidor HTTP
const server = http.createServer(app); // Usa tu app Express
const io = socketIo(server); // Configurar Socket.IO con el servidor

// Iniciar la verificación de subastas pendientes en el servidor
iniciarVerificacionSubastas(io);  //Ahora sí existe


// Escuchar eventos de conexión de los clientes
io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado.");

  socket.on("puja_realizada", async (data) => {
    console.log("📥 Puja recibida en el servidor:", data);

    const { anuncioId, usuario, cantidad } = data;
    if (!anuncioId || !usuario || !cantidad) {
        console.error("❌ Datos de puja incompletos.");
        return;
    }

    await registrarPuja(io, anuncioId, usuario, cantidad);
});

  socket.on("unirse-chat", (anuncioId) => {
      socket.join(anuncioId);
      console.log(`📌 Cliente unido a la sala del anuncio ${anuncioId}`);
  });

  socket.on("mensaje", async (datosMensaje) => {
    console.log("📥 Mensaje recibido en el servidor:", datosMensaje);

    const { anuncioId, remitente, destinatario, contenido, fecha } = datosMensaje;

    try {
        let chat = await Chat.findOne({
            anuncioId,
            $or: [
                { remitente, destinatario },
                { remitente: destinatario, destinatario: remitente }
            ]
        });

        if (!chat) {
            console.log("ℹNo se encontró un chat, creando uno nuevo...");
            chat = new Chat({ 
                anuncioId, 
                remitente, 
                destinatario, 
                mensajes: []  // Asegurar que `mensajes` existe
            });
        }

        // 🔹 Verificamos si la propiedad `mensajes` está definida
        if (!Array.isArray(chat.mensajes)) {
            chat.mensajes = [];
        }

        //  Guardamos el mensaje dentro de `mensajes`
        chat.mensajes.push({ remitente, contenido, fecha, leido: false });
        await chat.save();

        console.log(" Mensaje guardado correctamente en MongoDB:", chat);

        // Emitimos el mensaje al cliente en tiempo real
        io.to(anuncioId).emit("mensaje", { remitente, contenido, fecha });

    } catch (error) {
        console.error(" Error guardando el mensaje en MongoDB:", error);
    }
});

  const usuariosSoporte = {}; // socket.id => { role, nombre }
  // Cliente se conecta al soporte
  socket.on('joinSupport', ({ role, username }) => {
    const nombre = username || (role === 'admin' ? 'Soporte' : `Invitado-${socket.id.slice(0, 5)}`);
    
    socket.username = nombre; //  guardamos el nombre en el socket
    
    usuariosSoporte[socket.id] = { role, username: nombre };

    // Emitir lista
    const usuariosList = Object.entries(usuariosSoporte).map(([id, data]) => ({
        socketId: id,
        username: data.username
    }));
    io.emit('updateUsersList', usuariosList);

    // Emitir solo invitados al admin
    if (role === 'admin') {
        const invitados = {};
        for (const [id, data] of Object.entries(usuariosSoporte)) {
            if (data.role === 'guest') invitados[id] = data.username;
        }
        socket.emit('activeGuests', invitados);
    }
});

  // Enviar mensaje entre usuarios
  const SoporteChat = require("./database/models/soporte.model"); 

  socket.on('sendMessage', async ({ message, targetUserId, targetUsername }) => {
    const senderUsername = socket.username || 'Desconocido';

    
    let receptorUsername = 'admin';
    if (targetUsername) {
        receptorUsername = targetUsername;
    } else if (usuariosSoporte[targetUserId]) {
        receptorUsername = usuariosSoporte[targetUserId].username;
    }

    const participantes = [senderUsername, receptorUsername].sort();
    
    const nuevoMensaje = {
        remitente: senderUsername,
        contenido: message,
        fecha: new Date()
    };

    try {
        let chat = await SoporteChat.findOne({ participantes });

        if (!chat) {
            chat = new SoporteChat({ participantes, mensajes: [] });
        }

        chat.mensajes.push({nuevoMensaje, leido: false});
        await chat.save();
    } catch (err) {
        console.error(" Error guardando mensaje de soporte:", err);
    }

    // Emitir a ambos lados
    io.emit('receiveMessage', {
        sender: senderUsername,
        senderId: socket.id,
        message,
        fecha: nuevoMensaje.fecha
    });
});


socket.on('requestChatHistory', async (targetId) => {
    const senderUsername = usuariosSoporte[socket.id]?.username || 'Desconocido';
    const receptorUsername = usuariosSoporte[targetId]?.username || 'admin';
    const participantes = [senderUsername, receptorUsername].sort();

    try {
        const chat = await SoporteChat.findOne({ participantes });
        socket.emit('loadChatHistory', chat?.mensajes || []);
    } catch (err) {
        console.error(" Error cargando historial de soporte:", err);
        socket.emit('loadChatHistory', []);
    }
});

  

  
  // Cliente se desconecta
  socket.on('disconnect', () => {
      delete usuariosSoporte[socket.id];
      console.log(`Cliente desconectado: ${socket.id}`);
  
      // Notificar nueva lista
      const usuariosList = Object.entries(usuariosSoporte).map(([id, data]) => ({
          socketId: id,
          username: data.username
      }));
      io.emit('updateUsersList', usuariosList);
  });
  
});
// Definir el puerto ya no hace falta porque se encarga /bin/www
//const PORT = 3000;


// Configurar EJS como el motor de vistas

app.set('views', path.join(__dirname, 'views')); // Carpeta donde estarán los archivos .ejs
app.set('view engine', 'ejs');
// Middleware para servir archivos estáticos como estilos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));
// Servir CSS desde 'public/css'
app.use('/css', express.static(path.join(__dirname, "public/css")));
// Servir JavaScript desde 'public/js'
app.use('/js', express.static(path.join(__dirname, "public/js")));
app.use(cookieParser()); // Habilita el uso de cookies

// 🔹 Aumenta el límite de tamaño de `body-parser` para evitar errores con imágenes grandes
app.use(bodyParser.json({ limit: "50mb" }));  // 👈 Aumenta a 50MB
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true })); // 👈 También en formularios

app.use(express.json()); // Para manejar JSON
app.use(express.urlencoded({ extended: true })); // Para manejar datos del formulario
app.use(session({ // Configuración de la sesión (Guardar datos de usuario en el servidor)
  secret: "Una frase muy secreta",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use((req, res, next) => {
  const message = req.session.message; // Obtiene el mensaje de la sesión
  const error = req.session.error; // Obtiene el error de la sesión

  delete req.session.message; // Elimina el mensaje de la sesión
  delete req.session.error; // Elimina el error de la sesión

  res.locals.message = ""; // Inicializa el mensaje local como vacío
  res.locals.error = ""; // Inicializa el error local como vacío
  res.locals.notificaciones = 0;
  if (message) res.locals.message = `<p>${message}</p>`; // Si hay mensaje, lo formatea como HTML
  if (error) res.locals.error = `<p>${error}</p>`; // Si hay error, lo formatea como HTML

  next(); // Continúa con el siguiente middleware o ruta
});

//app.use('/js/socket.io-client', express.static(path.join(__dirname, 'node_modules/socket.io-client/dist')));


//routes

app.use('/', indexRouter);
app.use('/login', loginRouter);


app.use('/categorias', categoriasRouter);
app.use('/about', aboutRouter);
app.use('/publicar', publicarRouter);
app.use('/anuncios', anunciosRouter(io));
app.use("/registro", registerRouter);
app.use("/inscribirse", inscribirseRouter);
app.use("/chat", chatRouter);
app.use("/politica-cookies", politicaCookiesRouter);
app.use("/faqs", faqsRouter);
app.use('/soporte', soporteRouter);
app.use("/terminos", terminosRouter);
app.use("/mi-cuenta", perfilRouter);
app.use("/editar-perfil", editarPerfilRouter);
app.use('/perfil', valoracionRouter);
app.use("/verificar-email",verificarEmailRoutes);
app.use('/resenas', resenasRoutes);
app.use('/mis-anuncios', misAnunciosRouter);
app.use("/favoritos", favoritosRouter);
app.use("/gestion-usuarios", gestionUsuariosRoutes);
app.use("/gestion-anuncios", gestionAnunciosRoutes);
app.use('/mis-chats', chatsRoute);
app.use("/notificaciones", notificacionesRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/pago', pagoRouter);

app.use('/restricted', restricted, restrictedRouter); //middleware en una funcion aparte
//Se define sin ninguna ruta(solo en el server)
app.use('/logout', (req,res) =>{
  req.session.destroy(); //destruye el id de sesión y manda a la página principal
  res.redirect("/");
});

app.use('/api/anuncios', anunciosApi);
app.use('/api-explorer', apiExplorerRoutes);
app.use("/api", generateApiKeyRoutes);
app.use('/', busquedaRoutes);
app.use('/perfil-publico', perfilUsuarioRouter);

//Actualizar el nombre de usuario en la vista con el que ha iniciado sesión en vez de hardcodeado Invitado o el mismo nombre para todas las vistas.
/*app.use((req, res, next) => {
  res.locals.user = req.session.user || { username: "Invitado" }; // Si no hay usuario, muestra "Invitado"
  next();              //user.username es el nombre del usuario que se logueó
});
*/
app.use((req, res, next) => {
  if (req.session.user) {
      res.locals.user = req.session.user; // Pasa el usuario completo
      res.locals.imagen_perfil = req.session.user.imagen_perfil || "/images/avatar.webp"; // Si no tiene imagen, usa una por defecto
  } else {
      res.locals.user = { username: "Invitado", rol: null };
      res.locals.imagen_perfil = "/images/avatar.webp"; // Imagen por defecto para invitados
  }
  next();
});



function restricted(req, res, next){
  if(req.session.user){
    next();
  } else {
    res.redirect("login");
  }
}
// Exportar la aplicación sin sockets
  //module.exports = app;

  // Exporta el servidor en lugar de `app`
module.exports = { app, server, io };
// Iniciar el servidor
/*app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});*/
