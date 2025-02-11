/*
const express = require('express');
const router = express.Router();
const database = require('../database');

router.get('/', function(req, res, next) {
  res.render('login', {user: req.session.user, title:"Embutidos León"}); //renderiza la view login
});

router.post('/', async (req, res) => {
 
  const user = req.body.user;
  if(await database.user.isLoginRight(user, req.body.pass)){
    req.session.user = {username: user};
    req.session.message = "¡Login correcto!"
    res.redirect("restricted"); //redirige a la página restricted
  } else {
    req.session.error = "Incorrect username or password.";
    res.redirect("login");
  }
});

module.exports = router;
*/
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../database/models/user.model'); // Importa el modelo de usuario

router.get('/', function(req, res) {
    res.render('login', { user: req.session.user, title: "LibrePost" });
});

router.post('/', async (req, res) => {
    const { user, pass } = req.body;

    try {
        const foundUser = await User.findOne({ username: user });

        console.log("🔍 Usuario encontrado:", foundUser); // DEBUG

        if (!foundUser) {
            console.log("❌ Usuario no encontrado");
            req.session.error = "Usuario no encontrado.";
            return res.redirect('/login');
        }

        const match = await bcrypt.compare(pass, foundUser.password);

        console.log("🔍 Contraseña correcta:", match); // DEBUG

        if (match) {
            // 🔹 Guardamos toda la información relevante en la sesión
            req.session.user = {
                _id: foundUser._id,
                username: foundUser.username,
                email: foundUser.email, // Asegurar que el email está presente
                imagen_perfil: foundUser.imagen_perfil, // Almacenar imagen
                nombre_real: foundUser.nombre_real, // Nombre real para mostrarlo correctamente
            };

            req.session.message = "¡Login correcto!";
            return res.redirect('/restricted');
        } else {
            console.log("❌ Contraseña incorrecta");
            req.session.error = "Contraseña incorrecta.";
            return res.redirect('/login');
        }
    } catch (error) {
        console.error("❌ Error en el login:", error);
        res.status(500).send("Error en el servidor.");
    }
});

module.exports = router;


