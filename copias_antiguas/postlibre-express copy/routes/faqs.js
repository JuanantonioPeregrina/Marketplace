const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("faqs", { title: "Preguntas Frecuentes (FAQs)",user: req.session.user, message: 'Bienvenido a LibrePost' });
});

module.exports = router;
