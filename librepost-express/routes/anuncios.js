const express = require('express');
const Anuncio = require('../database/models/anuncio.model');
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const anunciosDB = await Anuncio.find({});
        
        // Verificar que cada anuncio tiene un _id correcto
        console.log("Anuncios desde BD:", anunciosDB);

        const anunciosConDatos = anunciosDB.map(anuncio => ({
            _id: anuncio._id.toString(), // Asegurar que el ID es un string
            titulo: anuncio.titulo,
            descripcion: anuncio.descripcion,
            imagen: anuncio.imagen,
            precio: anuncio.precio,
            autor: anuncio.autor,
            inscritos: anuncio.inscritos || [] // Verificar que `inscritos` siempre tenga un array
        }));

        res.render("anuncios", { 
            title: "Anuncios - LibrePost", 
            user: req.session.user, 
            anuncios: anunciosConDatos
        });

    } catch (error) {
        console.error("Error cargando anuncios:", error);
        res.status(500).send("Error al cargar los anuncios.");
    }
});




module.exports = router;

