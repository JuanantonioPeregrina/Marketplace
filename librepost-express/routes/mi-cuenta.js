const express = require('express');
const router = express.Router();
const User = require('../database/models/user.model'); // Ajusta el path si es necesario

// 📌 Ruta para la vista "Mi Cuenta"
router.get("/", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login"); // Redirigir si no hay usuario en sesión
    }

    try {
        res.render("mi-cuenta", { title: "Mi cuenta", user: req.session.user});
    } catch (error) {
        console.error("Error cargando la cuenta:", error);
        res.status(500).send("Error al cargar la cuenta");
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
        // 🔹 Buscar y actualizar la imagen en la base de datos
        const usuarioActualizado = await User.findOneAndUpdate(
            { email: req.session.user.email }, // Busca por email
            { $set: { imagen_perfil: image } }, // Actualiza solo la imagen
            { new: true, runValidators: true } // Devuelve el usuario actualizado
        );

        if (!usuarioActualizado) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        // 🔹 Actualizar la imagen en la sesión
        req.session.user.imagen_perfil = usuarioActualizado.imagen_perfil;

        return res.json({ success: true, message: 'Imagen de perfil actualizada correctamente.' });

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
