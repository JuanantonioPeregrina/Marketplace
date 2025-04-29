const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker");
const User = require("./database/models/user.model");
const Anuncio = require("./database/models/anuncio.model");

const MONGO_URI = "mongodb://localhost:27017/librepost"; // Asegúrate de que la URI es correcta
const BATCH_SIZE = 1000; // 🔹 Lotes de 5000 registros para evitar sobrecarga de memoria

// 🔹 Conectar a MongoDB
async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("📡 Conectado a MongoDB");
    } catch (error) {
        console.error("❌ Error de conexión:", error);
        process.exit(1);
    }
}

// 🔹 Generar usuarios en lotes
function generateUsers(count) {
    let users = [];
    for (let i = 0; i < count; i++) {
        users.push({
            username: faker.internet.userName(),
            nombre_real: faker.person.fullName(),
            password: faker.internet.password(),
            email: faker.internet.email(),
            dni_path: faker.image.avatar(),
            imagen_perfil: "/images/avatar.webp",
            verificado: faker.datatype.boolean(),
            reseñas: [],
            apiKeys: [
                {
                    key: faker.string.uuid(),
                    plan: faker.helpers.arrayElement(["Free", "Basic", "Pro", "Enterprise"]),
                    limit: 1000,
                    usage: faker.number.int({ min: 0, max: 1000 }),
                    createdAt: faker.date.past(),
                }
            ],
            createdAt: faker.date.past(),
        });
    }
    return users;
}

// 🔹 Generar anuncios en lotes
function generateAnuncios(count, users) {
    let anuncios = [];
    for (let i = 0; i < count; i++) {
        const randomUser = faker.helpers.arrayElement(users);
        anuncios.push({
            autor: randomUser.username,
            titulo: faker.commerce.productName(),
            descripcion: faker.commerce.productDescription(),
            precioInicial: faker.number.float({ min: 10, max: 1000, precision: 0.01 }),
            precioActual: faker.number.float({ min: 10, max: 2000, precision: 0.01 }),
            ubicacion: faker.location.city(),
            imagen: faker.image.url(),
            categoria: faker.commerce.department(),
            fechaPublicacion: faker.date.recent(),
            inscritos: [],
            fechaExpiracion: faker.date.future(),
            estadoSubasta: faker.helpers.arrayElement(["pendiente", "activa", "finalizada"]),
            pujas: [],
            ofertasAutomaticas: []
        });
    }
    return anuncios;
}

// 🔹 Insertar registros en lotes
async function insertInBatches(model, data, batchSize) {
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        let retries = 3; // Reintentar hasta 3 veces en caso de error
        while (retries > 0) {
            try {
                await model.insertMany(batch, { ordered: false });
                console.log(`✅ Insertados ${i + batch.length} registros en ${model.modelName}`);
                break; // Si se completa correctamente, salir del bucle
            } catch (error) {
                console.error(`❌ Error en inserción, reintentando (${retries} intentos restantes)...`, error);
                retries--;
                if (retries === 0) {
                    console.error(`🚨 Fallo permanente al insertar en ${model.modelName}`);
                }
            }
        }
    }
}


// 🔹 Función principal de importación
async function importData() {
    await connectDB();

    console.log("🚀 Generando 500.000 usuarios...");
    for (let i = 0; i < 500000; i += BATCH_SIZE) {
        const usersBatch = generateUsers(BATCH_SIZE);
        await insertInBatches(User, usersBatch, BATCH_SIZE);
    }

    console.log("🚀 Generando 5.000 anuncios...");
    const allUsers = await User.find({}, "username").limit(10000); // Obtenemos usuarios para asignar autores a los anuncios
    for (let i = 0; i < 5000; i += BATCH_SIZE) {
        const anunciosBatch = generateAnuncios(BATCH_SIZE, allUsers);
        await insertInBatches(Anuncio, anunciosBatch, BATCH_SIZE);
    }

    console.log("✅ Importación completada.");
    mongoose.connection.close();
}

// 🔹 Ejecutar la importación
importData().catch(err => {
    console.error("❌ Error durante la importación:", err);
    mongoose.connection.close();
});
