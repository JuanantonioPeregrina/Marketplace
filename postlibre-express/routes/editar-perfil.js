const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Si no hay usuario, redirige al login
    }
    res.render('editar-perfil', { usuario: req.session.user });
});


module.exports = router;
