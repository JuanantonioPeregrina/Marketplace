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

        if (!foundUser) {
            console.log("❌ Usuario no encontrado:", user);
            req.session.error = "Usuario no encontrado.";
            return res.redirect('/login');
        }

        console.log("🔍 Usuario encontrado en BD:", foundUser);
        console.log("🔍 Contraseña ingresada:", pass);
        console.log("🔍 Hash almacenado en BD:", foundUser.password);

        if (!pass) {
            console.log("❌ Error: La contraseña ingresada es undefined o vacía.");
            req.session.error = "Debe ingresar una contraseña.";
            return res.redirect("/login");
        }

        // 📌 Comparar la contraseña ingresada con el hash almacenado en BD
        const match = await bcrypt.compare(pass, foundUser.password);

        console.log("🔍 ¿Contraseña correcta?:", match);

        if (match) {
            req.session.user = {
                username: foundUser.username,
                email: foundUser.email,
                nombre_real: foundUser.nombre_real,
                rol: foundUser.rol
            };

            req.session.message = "¡Login correcto!";
            return res.redirect('/restricted');
        } else {
            console.log("❌ Contraseña incorrecta para usuario:", foundUser.username);
            req.session.error = "Contraseña incorrecta.";
            return res.redirect('/login');
        }
    } catch (error) {
        console.error("❌ Error en el login:", error);
        res.status(500).send("Error en el servidor.");
    }
});

module.exports = router;

