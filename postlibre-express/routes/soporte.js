const express = require('express');
const router = express.Router();

// Ruta para renderizar la vista del soporte
router.get('/', (req, res) => {

    /*if (!req.session.user) {
        return res.redirect('/login'); // Redirigir a login si el usuario no está autenticado
    } */
    const user = req.session.user || null;
    res.render('soporte', { user, title: 'Soporte' });
});

module.exports = router;
