const express = require('express');
const router = express.Router();

// Ruta para renderizar la vista del explorador de APIs
router.get('/', (req, res) => {
    res.render('api-explorer');
});

module.exports = router;
