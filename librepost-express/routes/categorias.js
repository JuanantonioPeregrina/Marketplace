
/*Tanto invitados como registrados acceden*/
const express = require('express');

const router = express.Router();
// Ruta GET para mostrar la página del juego (permitiendo invitados)
router.get('/', (req, res) => {
    // Verifica si el usuario está autenticado o establece un usuario por defecto como "Invitado"
    const user = req.session.user || { username: "Invitado" };
    res.render('categorias', {
        user: req.session.user || { username: "Invitado" }, // Información del usuario (autenticado o "Invitado")
        title: "LibrePost", // Título de la página
        message: "¡Te presentamos todos nuestros productos/servicios!",
        player: user.username, // Nombre del jugador (autenticado o "Invitado")
        
    });
});

module.exports = router;
