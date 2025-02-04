const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../database/models/user.model");

const router = express.Router();

router.get("/", (req, res) => {
    res.render("registro", { title: "Registro - LibrePost" });
});

router.post("/", async (req, res) => {
    const { username, password } = req.body;

    try {
        // Verifica si el usuario ya existe
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).send("El usuario ya existe");
        }

        // Crea un nuevo usuario (se hashea automáticamente en el modelo)
        const newUser = new User({ username, password });
        await newUser.save();

        console.log("Usuario registrado:", username);
        res.redirect("/login"); // Redirigir al login tras el registro
    } catch (error) {
        console.error(" Error en el registro:", error);
        res.status(500).send("Error en el registro");
    }
});

module.exports = router;
