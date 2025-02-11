const express = require('express');
const router = express.Router();
const User = require('../database/models/user.model'); // Modelo de usuario

// 📌 Ruta para cargar la cuenta del usuario con datos actualizados
router.get("/", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login"); // Redirigir si no hay usuario en sesión
    }

    try {
        // Buscar el usuario en la base de datos
        const usuario = await User.findOne({ email: req.session.user.email });

        if (!usuario) {
            return res.status(404).send("Usuario no encontrado.");
        }

        // Actualizar la sesión con los datos reales de la base de datos
        req.session.user = {
            username: usuario.username,
            nombre_real: usuario.nombre_real,
            imagen_perfil: usuario.imagen_perfil || "/images/avatar.webp",
            email: usuario.email,
        };

        res.render("mi-cuenta", { title: "Mi cuenta", user: req.session.user });
    } catch (error) {
        console.error("Error cargando la cuenta:", error);
        res.status(500).send("Error al cargar la cuenta");
    }
});



// 📌 Ruta para actualizar la imagen de perfil en la base de datos y sesión
router.post('/update-image', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const { image } = req.body;

    if (!image) {
        return res.status(400).json({ success: false, message: 'No se ha enviado ninguna imagen.' });
    }

    try {
        // 🔹 Actualizar la imagen de perfil en la base de datos
        const usuarioActualizado = await User.findOneAndUpdate(
            { email: req.session.user.email }, 
            { $set: { imagen_perfil: image } }, 
            { new: true, runValidators: true }
        );

        if (!usuarioActualizado) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        // 🔹 Asegurar que la imagen actualizada también se almacene en la sesión
        req.session.user.imagen_perfil = usuarioActualizado.imagen_perfil;

        return res.json({ success: true, imagen_perfil: usuarioActualizado.imagen_perfil });

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
        res.redirect('/login');
    });
});

module.exports = router;
