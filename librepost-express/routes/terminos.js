const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("terminos", { title: "Términos y Condiciones - LibrePost", user: req.user || null });
});

module.exports = router;
