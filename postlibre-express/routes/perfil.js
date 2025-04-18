const express = require('express');
const Usuario = require('../database/models/user.model'); // Asegúrate de que el nombre del archivo sea correcto
const router = express.Router();
const bcrypt = require("bcrypt");
const { categoriasData } = require("../routes/api/categorias");



// Ruta para mostrar el perfil del usuario
router.get("/", async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    try {
        const usuario = await Usuario.findOne({ username: req.session.user.username });

        if (!usuario) return res.status(404).send("Usuario no encontrado.");

        // Separamos reseñas como anunciante e inscrito
        const reseñasComoAnunciante = usuario.reseñas.filter(r => r.autor && r.anuncioId);
        const reseñasComoInscrito = usuario.reseñas.filter(r => r.autor && r.anuncioId);

        res.render("perfil", {
            title: "Perfil de " + usuario.username,
            usuario,
            user: req.session.user,
            categorias: categoriasData,
            reseñasComoAnunciante,
            reseñasComoInscrito
        });

    } catch (error) {
        console.error("❌ Error al cargar el perfil:", error);
        res.status(500).send("Error interno del servidor.");
    }
});

router.post("/", async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    try {
        const usuario = await Usuario.findOne({ username: req.session.user.username });

        if (!usuario) return res.status(404).send("Usuario no encontrado");

        //  Actualiza sugerencias
        usuario.recibirSugerencias = !!req.body.recibirSugerencias;

        // Actualiza preferencias
        usuario.preferencias = {
            categoria: req.body.categoria || "",
            ubicacion: req.body.ubicacion || ""
        };

        await usuario.save();
        res.redirect("/perfil");
    } catch (err) {
        console.error("❌ Error actualizando perfil:", err);
        res.status(500).send("Error al actualizar el perfil");
    }
});

router.post('/cambiar-password', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { oldPassword, newPassword } = req.body;

    try {
        const usuario = await Usuario.findOne({ username: req.session.user.username });

        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Comparar la contraseña ingresada con el hash almacenado
        const esCorrecta = await bcrypt.compare(oldPassword, usuario.password);
        if (!esCorrecta) {
            return res.status(400).json({ error: "Contraseña actual incorrecta" });
        }

        //Guardar directamente la nueva contraseña en texto plano, el modelo la hasheará
        usuario.password = newPassword; 

        await usuario.save(); // El modelo se encarga de hashearla antes de guardarla

        res.redirect('/mi-cuenta');  // Redirigir a la cuenta del usuario tras cambiar la contraseña
    } catch (error) {
        console.error("Error al cambiar la contraseña:", error);
        res.status(500).json({ error: "Error al cambiar la contraseña" });
    }
});

module.exports = router;
