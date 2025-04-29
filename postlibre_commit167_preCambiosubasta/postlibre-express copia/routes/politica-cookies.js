const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("politica-cookies", { title: "Política de Cookies",  user: req.session.user || { username: "Invitado" } });
});

module.exports = router;
