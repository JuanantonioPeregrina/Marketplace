const express = require("express");
const router = express.Router();
const Usuario = require("../database/models/user.model");

router.get("/", (req, res) => {
    const { email } = req.query;
    res.render("verificar-email", { email, title: "Verificar Email", user: null }); // 🛠️ pasa title y user para evitar errores
});

router.post("/", async (req, res) => {
    const { email, code } = req.body;

    console.log("Email recibido:", email);
    console.log("Código recibido del usuario:", code);

    const user = await Usuario.findOne({ email });

    if (!user) return res.status(404).send("Usuario no encontrado");

    console.log("Código guardado en MongoDB:", user.codigoVerificacion);

    if ((user.codigoVerificacion || "").trim() !== (code || "").trim()) {
        return res.send("Código incorrecto");
    }

    user.verificado = true;
    user.codigoVerificacion = undefined;
    await user.save();

    res.send("Cuenta verificada correctamente. Ahora puedes iniciar sesión.");
});


module.exports = router; //exportar el router correctamente
