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
const categoriasRouter = require('./routes/categorias'); //con socket.io
const loginRouter = require('./routes/login'); // Ajusta la ruta según la ubicación de tu archivo
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

const Chat = require("./database/models/chat.model");
const politicaCookiesRouter = require("./routes/politica-cookies");
const terminosRouter = require("./routes/terminos");




require("./database");

// Crear una instancia de Express
const app = express();

// Crear el servidor HTTP
const server = http.createServer(app); // Usa tu app Express
const io = socketIo(server); // Configurar Socket.IO con el servidor

// Escuchar eventos de conexión de los clientes
io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado.");

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
            console.log("ℹ️ No se encontró un chat, creando uno nuevo...");
            chat = new Chat({ 
                anuncioId, 
                remitente, 
                destinatario, 
                mensajes: []  // ✅ Asegurar que `mensajes` existe
            });
        }

        // 🔹 Verificamos si la propiedad `mensajes` está definida
        if (!Array.isArray(chat.mensajes)) {
            chat.mensajes = [];
        }

        // ✅ Guardamos el mensaje dentro de `mensajes`
        chat.mensajes.push({ remitente, contenido, fecha });
        await chat.save();

        console.log("✅ Mensaje guardado correctamente en MongoDB:", chat);

        // Emitimos el mensaje al cliente en tiempo real
        io.to(anuncioId).emit("mensaje", { remitente, contenido, fecha });

    } catch (error) {
        console.error("❌ Error guardando el mensaje en MongoDB:", error);
    }
});



  socket.on("disconnect", () => {
      console.log("Cliente desconectado.");
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

app.use(express.json()); // Para manejar JSON
app.use(express.urlencoded({ extended: true })); // Para manejar datos del formulario
app.use(session({ // Configuración de la sesión (Guardar datos de usuario en el servidor)
  secret: "Una frase muy secreta",
  resave: false,
  saveUninitialized: true
}));
app.use((req, res, next) => {
  const message = req.session.message; // Obtiene el mensaje de la sesión
  const error = req.session.error; // Obtiene el error de la sesión

  delete req.session.message; // Elimina el mensaje de la sesión
  delete req.session.error; // Elimina el error de la sesión

  res.locals.message = ""; // Inicializa el mensaje local como vacío
  res.locals.error = ""; // Inicializa el error local como vacío

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
app.use('/anuncios', anunciosRouter);
app.use("/registro", registerRouter);
app.use("/inscribirse", inscribirseRouter);
app.use("/chat", chatRouter);
app.use("/politica-cookies", politicaCookiesRouter);
app.use("/faqs", faqsRouter);
app.use('/soporte', soporteRouter);
app.use("/terminos", terminosRouter);
app.use("/mi-cuenta", perfilRouter);
app.use("/editar-perfil", editarPerfilRouter);
app.use('/restricted', restricted, restrictedRouter); //middleware en una funcion aparte
//Se define sin ninguna ruta(solo en el server)
app.use('/logout', (req,res) =>{
  req.session.destroy(); //destruye el id de sesión y manda a la página principal
  res.redirect("/");
});

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
      res.locals.user = { username: "Invitado" };
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
