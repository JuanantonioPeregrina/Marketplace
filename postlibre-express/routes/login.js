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
            console.log("Usuario no encontrado:", user);
            req.session.error = "Usuario no encontrado.";
            return res.redirect('/login');
        }

        console.log("🔍 Usuario encontrado en BD:", foundUser);
        console.log("🔍 Contraseña ingresada:", pass);
        console.log("🔍 Hash almacenado en BD:", foundUser.password);

        if (!pass) {
            console.log("Error: La contraseña ingresada es undefined o vacía.");
            req.session.error = "Debe ingresar una contraseña.";
            return res.redirect("/login");
        }

        //Comparar la contraseña ingresada con el hash almacenado en BD
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
            console.log("Contraseña incorrecta para usuario:", foundUser.username);
            req.session.error = "Contraseña incorrecta.";
            return res.redirect('/login');
        }
    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).send("Error en el servidor.");
    }
});

// Mostrar formulario para recuperar contraseña
router.get('/olvide-contrasena', (req, res) => {
    res.render('olvide-contrasena', {
        user: req.session.user,
        title: 'Recuperar contraseña',
        message: req.session.message,
        error: req.session.error
    });

    // Limpia mensajes después de mostrarlos
    req.session.message = null;
    req.session.error = null;
});

// Procesar formulario de recuperación
const crypto = require("crypto");
const enviarCorreo = require("../utils/email"); 

router.post('/olvide-contrasena', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        req.session.error = 'No existe ninguna cuenta con ese correo.';
        return res.redirect('/login/olvide-contrasena');
    }

    //Generar token aleatorio y guardar fecha de expiración (1 hora)
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hora
    await user.save();

    //Enviar correo con enlace
    const enlace = `http://localhost:4000/login/restablecer-contrasena/${token}`;
    await enviarCorreo({
        to: email,
        subject: "Restablecer tu contraseña",
        html: `
            <h2>Solicitud de recuperación de contraseña</h2>
            <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
            <a href="${enlace}" style="display:inline-block;padding:10px 20px;background:#3498db;color:white;border-radius:5px;text-decoration:none;">Restablecer Contraseña</a>
            <p>Este enlace expirará en 1 hora.</p>
        `
    });

    req.session.message = 'Revisa tu correo para continuar con el cambio de contraseña.';
    return res.redirect('/login/olvide-contrasena');
});

// Ruta para mostrar formulario de restablecer contraseña con token
router.get('/restablecer-contrasena/:token', async (req, res) => {
    const { token } = req.params;
    const user = await User.findOne({
        resetToken: token,
        resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.session.error = 'El enlace no es válido o ha expirado.';
        return res.redirect('/login');
    }

    res.render('restablecer-contrasena', {
        title: 'Establecer nueva contraseña',
        token,
        user: null,
        error: req.session.error,
        message: req.session.message
    });

    req.session.error = null;
    req.session.message = null;
});


router.post('/restablecer-contrasena/:token', async (req, res) => {
    const { token } = req.params;
    const { nuevaContrasena } = req.body;

    const user = await User.findOne({
        resetToken: token,
        resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.session.error = 'El enlace ha expirado o es inválido.';
        return res.redirect('/login');
    }

    user.password = nuevaContrasena;// texto plano, será hasheado por el pre("save")
    if (!nuevaContrasena || nuevaContrasena.length < 6) {
        req.session.error = 'La contraseña debe tener al menos 6 caracteres.';
        return res.redirect(`/login/restablecer-contrasena/${token}`);
      }
      
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    req.session.message = 'Contraseña actualizada correctamente. Ahora puedes iniciar sesión.';
    res.redirect('/login');
});



module.exports = router;

