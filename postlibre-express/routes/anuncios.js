const express = require('express');
const Anuncio = require('../database/models/anuncio.model');
const Usuario = require('../database/models/user.model');
const Chat = require('../database/models/chat.model');
const mongoose = require("mongoose");
const path = require('path'); // 

const actualizarEstadosDeAnuncios = require("../utils/estadoAnuncios");

async function obtenerSugerencias(inscritos) {
    if (!inscritos?.length) return [];
    const usuarios = await Usuario.find({ username: { $in: inscritos } });
    return usuarios
        .map(u => ({
        username:     u.username,
        reputacion:   calcularPromedioReseñas(u),
        totalResenas: u.reseñas.length
        }))
        .sort((a,b) => b.reputacion - a.reputacion)
        .slice(0,3);
}


function calcularPromedioReseñas(usuario) {
    if (!usuario.reseñas || usuario.reseñas.length === 0) return 0;
    const total = usuario.reseñas.reduce((sum, r) => sum + (r.puntuacion || 0), 0);
    return total / usuario.reseñas.length;
}

module.exports = (io) => {
    const router = express.Router();

   
    router.get("/", async (req, res) => {
        try {
            await actualizarEstadosDeAnuncios(); 
            const usuario = req.session.user ? req.session.user.username : null;
            let apiKey = "";
            let userData = null;

            if (usuario) {
                userData = await Usuario.findOne({ username: usuario });
                if (userData && userData.apiKeys.length > 0) {
                    apiKey = userData.apiKeys[0].key; 
                }
}

// Auto-actualización simple de estados antes de mostrar anuncios
    
            console.log("📢 API Key enviada al frontend:", apiKey || "No disponible");
    
            // PAGINACIÓN: Límite de anuncios por página (20 por defecto)
            const page = parseInt(req.query.page) || 1;  // Página actual
            const limit = 20;  // 🔹 Solo mostramos 20 anuncios por página
            const skip = (page - 1) * limit;  // 🔹 Saltamos los registros anteriores
    
            // FILTROS: Obtenemos los parámetros de búsqueda
            let filtro = {};
            if (req.query.presupuesto) {
                if (req.query.presupuesto === "menos-100") filtro.precioActual = { $lt: 100 };
                else if (req.query.presupuesto === "100-500") filtro.precioActual = { $gte: 100, $lte: 500 };
                else if (req.query.presupuesto === "mas-500") filtro.precioActual = { $gt: 500 };
            }
            if (req.query.ubicacion) {
                filtro.ubicacion = new RegExp(req.query.ubicacion, "i");
            }
            const estado = req.query.estado || 'activos'; //Por defecto "activos"


            

            // Filtrado por estado
           
            if (estado === 'activos') {
                filtro.estadoSubasta = { $in: ['pendiente', 'activa'] };
                filtro.estado = { $in: ['esperando_inicio', 'en_subasta'] };
            
            
            } else if (estado === 'finalizados') {
                filtro.estado = 'finalizado';
            } else if (estado === 'en_produccion') {
                filtro.estado = 'en_produccion';
            }

            
            
           

            
            // EJECUTAR CONSULTA PAGINADA CON FILTROS
            const anunciosFiltrados = await Anuncio.find(filtro)
            .sort({ fechaPublicacion: -1 })
            .skip(skip)
            .limit(limit);
        
        let anunciosConDatos = await Promise.all(anunciosFiltrados.map(async (anuncio) => {
            let chatIniciado = false;
        
            if (usuario && anuncio.inscritos.includes(usuario)) {
                chatIniciado = await Chat.exists({
                    anuncioId: anuncio._id,
                    $or: [
                        { remitente: anuncio.autor, destinatario: usuario },
                        { remitente: usuario, destinatario: anuncio.autor }
                    ]
                });
            }
        const esFavorito = userData && userData.favoritos.includes(anuncio._id);
            // Buscar si el usuario inscrito ha valorado ya al autor del anuncio
            let yaResenoAlAutor = false;

            if (usuario && anuncio.autor !== usuario) {
                const autor = await Usuario.findOne({ username: anuncio.autor });
            
                if (autor && Array.isArray(autor.reseñas)) {
                    yaResenoAlAutor = autor.reseñas.some(r => {
                        // Comprobar si existe el campo autor y si es igual al username
                        return r.autor === usuario;
                    });
                }
            }
            
            let inscritosConResenaPorAnuncio = {};

            if (usuario === anuncio.autor && anuncio.inscritos?.length > 0) {
                for (const inscrito of anuncio.inscritos) {
                    const userInscrito = await Usuario.findOne({ username: inscrito });
                    inscritosConResenaPorAnuncio[inscrito] = userInscrito?.reseñas?.some(r =>
                        r.autor === usuario && r.anuncioId?.toString() === anuncio._id.toString()
                    );
                }
            }

            return {
                _id: anuncio._id.toString(),
                titulo: anuncio.titulo,
                descripcion: anuncio.descripcion,
                imagen: anuncio.imagen,
                precioInicial: anuncio.precioInicial,
                precioActual: anuncio.precioActual,
                auctionType: anuncio.auctionType,              //tipo de subasta
                inglesaIncremento: anuncio.inglesaIncremento,  
                inglesaIntervalo:  anuncio.inglesaIntervalo,
                inglesaDuracion:   anuncio.inglesaDuracion,
                autor: anuncio.autor,
                ubicacion: anuncio.ubicacion,
                inscritos: anuncio.inscritos || [],
                estadoSubasta: anuncio.estadoSubasta,
                fechaInicioSubasta: anuncio.fechaInicioSubasta,
                fechaExpiracion: anuncio.fechaExpiracion,
                chatIniciado,
                pujas: anuncio.pujas || [],
                ofertasAutomaticas: anuncio.ofertasAutomaticas || [],
                sugerencias: await obtenerSugerencias(anuncio.inscritos),
                esFavorito: userData?.favoritos?.some(fav => fav.toString() === anuncio._id.toString()) || false,
                resenaEnviadaAlAutor: yaResenoAlAutor,
                inscritosConResenaPorAnuncio
            };
            
        }));

        
        
    
            // 📌 Contar TOTAL de anuncios para calcular páginas
            const total = await Anuncio.countDocuments(filtro);
    
            res.render("anuncios", {
                title: "Anuncios - LibrePost",
                user: req.session.user,
                apiKey,
                anuncios: anunciosConDatos,
                page,
                totalPages: Math.ceil(total / limit),
                estado,
                filtros: req.query
            });
            
    
        } catch (error) {
            console.error("Error cargando anuncios:", error);
            res.status(500).send("Error al cargar los anuncios.");
        }
    });
    
    
    
    
    // Ruta para registrar oferta automática antes del inicio de la subasta
const STEP = 100; //ajuste aquí del “salto” de la subasta

router.post("/oferta-automatica/:id", async (req, res) => {
    try {
      const { user } = req.session;
      if (!user) {
        return res.status(403).json({ error: "Debe iniciar sesión para registrar una oferta automática." });
      }
  
      const precioMaximo = parseInt(req.body.precioMaximo, 10);
      if (isNaN(precioMaximo) || precioMaximo <= 0) {
        return res.status(400).json({ error: "Precio máximo inválido." });
      }
      if (precioMaximo % STEP !== 0) {
        return res.status(400).json({ error: `El precio debe ser múltiplo de ${STEP} €.` });
      }
  
      // ——————————————
      // cargamos el anuncio
      const anuncio = await Anuncio.findById(req.params.id);
      if (!anuncio) {
        return res.status(404).json({ error: "Anuncio no encontrado." });
      }
  
      // <<< NUEVA VALIDACIÓN >>> 
      // sólo los inscritos pueden dejar ofertas automáticas
      if (!anuncio.inscritos.includes(user.username)) {
        return res.status(403).json({
          error: "Debes inscribirte en la subasta para enviar ofertas automáticas."
        });
      }
      // ——————————————
  
      // 2) un único registro por usuario
      const yaRegistrado = anuncio.ofertasAutomaticas
        .some(o => o.usuario === user.username);
      if (yaRegistrado) {
        return res.status(400).json({ error: "Ya has registrado una oferta automática en esta subasta." });
      }
  
      // guardamos la oferta en array de automáticas (si no está activa aún)
      if (anuncio.estadoSubasta !== "activa") {
        anuncio.ofertasAutomaticas.push({
          usuario:     user.username,
          precioMaximo,
          fecha:       new Date()
        });
      } else {
        // si por algún milagro llegase activa, la ejecutamos instantánea
        anuncio.pujas.push({
          usuario:     user.username,
          cantidad:    precioMaximo,
          fecha:       new Date(),
          automatica:  true
        });
      }
  
      await anuncio.save();
  
      // si ya está activa, avisamos a todos
      if (anuncio.estadoSubasta === "activa") {
        io.emit("actualizar_pujas", {
          anuncioId: req.params.id,
          pujas:     anuncio.pujas
        });
      }
  
      return res.json({ mensaje: "Oferta automática registrada correctamente." });
    }
    catch (err) {
      console.error("Error al programar oferta automática:", err);
      return res.status(500).json({ error: "Error interno al guardar la oferta automática." });
    }
  });
  


    
    
    // ✅ Modificar la lógica de pujas para aplicar oferta automática
    
    router.post("/pujar/:id", async (req, res) => {
        try {
            const { user } = req.session;
            if (!user) {
                return res.status(403).json({ error: "Debe estar autenticado para pujar." });
            }
    
            const anuncio = await Anuncio.findById(req.params.id);
            if (!anuncio || anuncio.estadoSubasta !== "activa") {
                return res.status(400).json({ error: "La subasta no está activa." });
            }
    
            let precioActual = anuncio.precioActual;
            let nuevoPujador = user.username;
            let pujaAutomaticaRealizada = false;
            let mejorOferta = null;
    
            // 🔎 Buscar la mejor oferta automática
            if (anuncio.ofertasAutomaticas.length > 0) {
                mejorOferta = anuncio.ofertasAutomaticas
                    .filter(oferta => oferta.precioMaximo > precioActual)
                    .sort((a, b) => b.precioMaximo - a.precioMaximo)[0];
            }
    
            if (mejorOferta) {
                // 🔥 Ejecutar puja automática
                precioActual = Math.min(mejorOferta.precioMaximo, precioActual + 100);
                nuevoPujador = mejorOferta.usuario;
                pujaAutomaticaRealizada = true;
    
                // 🔹 REGISTRAR LA PUJA AUTOMÁTICA EN `pujas`
                const nuevaPujaAutomatica = {
                    usuario: mejorOferta.usuario,
                    cantidad: precioActual,
                    fecha: new Date(),
                    automatica: true  // 🔥 Etiquetar como automática
                };
                anuncio.pujas.push(nuevaPujaAutomatica);
    
                // 🗑️ ELIMINAR LA OFERTA AUTOMÁTICA SI SE ALCANZA SU MÁXIMO
                if (precioActual >= mejorOferta.precioMaximo) {
                    anuncio.ofertasAutomaticas = anuncio.ofertasAutomaticas.filter(
                        oferta => oferta._id.toString() !== mejorOferta._id.toString()
                    );
                }
            }
    
            // 🔹 REGISTRAR LA PUJA MANUAL
            const nuevaPuja = {
                usuario: user.username,
                cantidad: precioActual,
                fecha: new Date(),
                automatica: pujaAutomaticaRealizada // ✅ Ahora se indica si fue automática o manual
            };
    
            anuncio.pujas.push(nuevaPuja);
            anuncio.precioActual = precioActual;
            anuncio.ultimoPujador = nuevoPujador;
            await anuncio.save();
    
            // 📢 Emitir evento para actualizar la interfaz
            io.emit("actualizar_pujas", {
                anuncioId: req.params.id,
                usuario: nuevoPujador,
                cantidad: precioActual,
                pujas: anuncio.pujas
            });
    
            res.json({ mensaje: "Puja realizada con éxito", anuncio });
    
        } catch (error) {
            console.error("Error en la puja:", error);
            res.status(500).json({ error: "Error al procesar la puja." });
        }
    });
    
    // DETALLE CON TODOS los datos auxiliares
  router.get("/:id", async (req, res) => {
    try {
      const a = await Anuncio.findById(req.params.id);
      if (!a) {
        return res.status(404).render("error",{ mensaje:"Anuncio no encontrado" });
      }
      const usuario = req.session.user?.username;

      // 1) chatIniciado
      let chatIniciado = false;
      if (usuario && a.inscritos.includes(usuario)) {
        chatIniciado = await Chat.exists({
          anuncioId: a._id,
          $or: [
            { remitente: a.autor, destinatario: usuario },
            { remitente: usuario, destinatario: a.autor }
          ]
        });
      }

      // 2) reseña al autor
      let resenaEnviadaAlAutor = false;
      if (usuario && a.autor!==usuario) {
        const autor = await Usuario.findOne({ username: a.autor });
        resenaEnviadaAlAutor = autor?.reseñas?.some(r => r.autor===usuario);
      }

      // 3) inscritosConResena
      const inscritosConResenaPorAnuncio = {};
      if (usuario===a.autor) {
        for (const u of a.inscritos) {
          const usr = await Usuario.findOne({ username:u });
          inscritosConResenaPorAnuncio[u] =
            usr?.reseñas?.some(r =>
              r.autor===usuario &&
              r.anuncioId?.toString()===a._id.toString()
            );
        }
      }

      // 4) sugerencias
      const sugerencias = await obtenerSugerencias(a.inscritos);
      // ** CÁLCULO DE esFavorito **
    let esFavorito = false;
    if (usuario) {
      const u = await Usuario.findOne({ username: usuario });
      esFavorito = u?.favoritos?.some(fav => fav.toString() === a._id.toString());
    }   
      // Montamos el objeto que tu EJS espera
      const anuncio = {
        _id:                        a._id.toString(),
        titulo:                     a.titulo,
        descripcion:                a.descripcion,
        imagen:                     a.imagen,
        precioInicial:              a.precioInicial,
        precioActual:               a.precioActual,
        autor:                      a.autor,
        ubicacion:                  a.ubicacion,
        inscritos:                  a.inscritos||[],
        estadoSubasta:              a.estadoSubasta,
        fechaInicioSubasta:         a.fechaInicioSubasta,
        fechaExpiracion:            a.fechaExpiracion,
        pujas:                      a.pujas||[],
        ofertasAutomaticas:         a.ofertasAutomaticas||[],
        chatIniciado,
        resenaEnviadaAlAutor,
        inscritosConResenaPorAnuncio,
        sugerencias,
        esFavorito
      };

      res.render("detalleAnuncio", {
        anuncio,
        user: req.session.user,
        title: anuncio.titulo
      });
    } catch(err) {
      console.error("Error al obtener el anuncio:",err);
      res.status(500).render("error",{ mensaje:"Error al cargar el anuncio" });
    }
  });


  return router;
};

