/*const bcrypt = require('bcrypt');

users = {};

users.data = {};

users.generateHash = function(password, callback){ //callback se ejecuta cdo el hash esté listo
    bcrypt.hash(password, 10, callback);
}

users.comparePass = async function(password, hash){
    return await bcrypt.compare(password, hash);
}

users.register = function(username, password){
    if(users.data.hasOwnProperty(username)){
        throw new Error(`Ya existe el usuario ${username}.`);
    }
    users.generateHash(password, function(err, hash){
        if(err){
            throw new Error(`Error al generar el hash de ${username}.`);
        }
        users.data[username] = {username, hash, last_Login: new Date().toISOString};
    });
}

users.isLoginRight = async function(username, password){
    if(!users.data.hasOwnProperty(username)){
        return false;
    }
    return await users.comparePass(password, users.data[username].hash);
}

module.exports = users;
*/

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    nombre_real: { type: String, required: true }, // Nombre real obligatorio
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    imagen_perfil: { type: String, default: "/images/avatar.webp" }, // Campo para la imagen de perfil
    email: { type: String, unique: true, required: true }, // campo para email
    dni_path: { type: String, required: true }, //  ruta del DNI
    
});

// Middleware para hashear la contraseña antes de guardar
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
