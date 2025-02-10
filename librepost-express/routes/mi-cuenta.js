const express = require('express');
const router = express.Router();
const User = require('../database/models/user.model'); // Ajusta el path si es necesario

// 📌 Ruta para la vista "Mi Cuenta"
router.get('/', async (req, res) => {
    if (!req.session.user) {
        req.session.error = "Debes iniciar sesión para acceder a tu cuenta.";
        return res.redirect('/iniciosesion');
    }

    try {
        // Buscar el usuario en la base de datos usando el email
        const usuario = await User.findOne({ email: req.session.user.email });

        res.render('mi-cuenta', { 
            title: 'Mi Cuenta', 
            user: usuario || req.session.user, // Si no está en la BD, usa la sesión
            imagen_perfil: usuario?.imagen_perfil || "/images/Fotoperfilpordefecto.png"
        });

    } catch (error) {
        console.error("❌ Error al cargar la cuenta:", error);
        res.status(500).send("Hubo un error al cargar tu cuenta.");
    }
});

// 📌 Ruta para actualizar la imagen de perfil
router.post('/update-image', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const { image } = req.body;
  
    if (!image) {
        return res.status(400).json({ success: false, message: 'No se ha enviado ninguna imagen.' });
    }
  
    try {
        // Obtener el usuario actual de la sesión
        const usuario = await User.findOne({ email: req.session.user.email });

        if (usuario) {
            usuario.imagen_perfil = image;
            await usuario.save();

            // Actualizar la sesión con la nueva imagen
            req.session.user.imagen_perfil = image;

            return res.json({ success: true, message: 'Imagen de perfil actualizada correctamente.' });
        } else {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
    } catch (error) {
        console.error("❌ Error al actualizar la imagen:", error);
        return res.status(500).json({ success: false, message: 'Error al actualizar la imagen de perfil.' });
    }
});

// 📌 Ruta para cerrar sesión
router.get('/cerrar-sesion', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("❌ Error al cerrar sesión:", err);
            return res.status(500).send("Hubo un error al cerrar sesión.");
        }
        res.redirect('/iniciosesion');
    });
});

module.exports = router;
