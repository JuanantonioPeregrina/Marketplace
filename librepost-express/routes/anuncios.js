const express = require('express');
const { anuncios } = require('./publicar'); // Importar anuncios desde publicar.js

const router = express.Router();

router.get('/', (req, res) => {
    res.render('anuncios', { title: "Anuncios - LibrePost", user: req.session.user, anuncios });
});

module.exports = router;
