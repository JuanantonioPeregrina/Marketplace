
const mongoose = require('mongoose');

const MONGO_URI = "mongodb://localhost:27017/librepost"; // Cambia el nombre según tu base de datos

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Conectado a MongoDB"))
.catch(err => console.error("Error conectando a MongoDB:", err));

module.exports = mongoose;
