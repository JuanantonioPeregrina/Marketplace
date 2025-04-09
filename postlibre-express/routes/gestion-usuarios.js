const express = require('express');
const router = express.Router();
const Usuario = require('../database/models/user.model'); // Ajusta si tu modelo tiene otro nombre

// Middleware para comprobar si es admin
function soloAdmins(req, res, next) {
    if (req.session.user?.rol === 'admin') {
        next();
    } else {
        res.status(403).send("Acceso denegado");
    }
}

// GET: Mostrar todos los usuarios
router.get('/', soloAdmins, async (req, res) => {
    try {
        const usuarios = await Usuario.find({}, '-__v'); // sin versión
        res.render('gestion-usuarios', {
            title: 'Gestión de Usuarios',
            usuarios,
            user: req.session.user
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al obtener usuarios");
    }
});

// POST: Banear usuario
router.post('/banear', soloAdmins, async (req, res) => {
    try {
        const { id } = req.body;
        await Usuario.findByIdAndUpdate(id, { baneado: true });
        res.redirect('/gestion-usuarios');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al banear usuario");
    }
});

module.exports = router;
