const express = require('express');
const router = express.Router();

// Renderizar la página del API Explorer
router.get('/api-explorer', (req, res) => {
    res.render('api-explorer');
});

module.exports = router;
