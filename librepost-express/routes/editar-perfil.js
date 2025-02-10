const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('editar-perfil', { usuario: req.user });
});

module.exports = router;
