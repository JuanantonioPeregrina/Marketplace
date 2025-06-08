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
                auctionType: anuncio.auctionType, //tipo de subasta
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
                inscritosConResenaPorAnuncio,
                precioReserva:anuncio.precioReserva
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

const STEP = 100;     // tu STEP para inglesa
router.post("/oferta-automatica/:id", async (req, res) => {
  try {
    const { user } = req.session;
    if (!user) return res.status(403).json({ error: "Debes iniciar sesión." });

    const anuncio = await Anuncio.findById(req.params.id);
    if (!anuncio) return res.status(404).json({ error: "No encontrado." });

    if (!["inglesa", "holandesa"].includes(anuncio.auctionType)) {
      return res.status(400).json({ error: "Tipo de subasta no soportado." });
    }

    if (!anuncio.inscritos.includes(user.username)) {
      return res.status(403).json({ error: "Debes inscribirte primero." });
    }

    // 🔹 LÓGICA PARA SUBASTA INGLESA
    if (anuncio.auctionType === "inglesa") {
      const { precioMaximo, incrementoPaso } = req.body;
      const max = parseInt(precioMaximo, 10);
      const paso = parseInt(incrementoPaso, 10);

      if (isNaN(max) || max <= 0 || isNaN(paso) || paso <= 0) {
        return res.status(400).json({ error: "Valores inválidos." });
      }

      anuncio.ofertasAutomaticas.push({
        usuario: user.username,
        precioMaximo: max,
        incrementoPaso: paso,
        fecha: new Date(),
      });

      await anuncio.save();
      return res.json({ mensaje: "Oferta automática inglesa registrada." });
    }

    // 🔸 LÓGICA PARA SUBASTA HOLANDESA
    else if (anuncio.auctionType === "holandesa") {
      let { precioMaximo } = req.body;
      if (!precioMaximo) {
        return res.status(400).json({ error: "Envía al menos una oferta." });
      }
      if (!Array.isArray(precioMaximo)) {
        precioMaximo = [precioMaximo];
      }

      const validos = precioMaximo
        .map(x => parseInt(x, 10))
        .filter(x => !isNaN(x) && x > 0 && x % 100 === 0); // STEP clásico para holandesa

      if (validos.length === 0) {
        return res
          .status(400)
          .json({ error: `Cada oferta debe ser múltiplo de 100 €.` });
      }

      validos.forEach(precio => {
        anuncio.ofertasAutomaticas.push({
          usuario: user.username,
          precioMaximo: precio,
          fecha: new Date()
        });
      });

      await anuncio.save();
      return res.json({ mensaje: `Registradas ${validos.length} ofertas automáticas holandesas.` });
    }

  } catch (err) {
    console.error("Error oferta automática:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
    
    // Modificar la lógica de pujas para aplicar oferta automática
    
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

// Mapeamos cada username a { username, imagen_perfil }
const inscritosDetallados = await Promise.all(
  (a.inscritos || []).map(async username => {
    const usr = await Usuario.findOne(
      { username },
      'username imagen_perfil'
    );
    return {
      username: usr?.username,
      imagen_perfil: usr?.imagen_perfil || '/images/avatar.webp'
    };
  })
);

      // Montamos el objeto que tu EJS espera
      const anuncio = {
        _id:                        a._id.toString(),
        titulo:                     a.titulo,
        descripcion:                a.descripcion,
        imagen:                     a.imagen,
        precioInicial:              a.precioInicial,
        precioActual:               a.precioActual,
        auctionType:                a.auctionType,  //tipo de subasta 
        inglesaIncremento:          a.inglesaIncremento,
        inglesaIntervalo:           a.inglesaIntervalo,
        inglesaDuracion:            a.inglesaDuracion,
        precioReserva:              a.precioReserva,
        autor:                      a.autor,
        ubicacion:                  a.ubicacion,
        inscritos:                  a.inscritos||[],
        estadoSubasta:              a.estadoSubasta,
        fechaPublicacion:           a.fechaPublicacion,
        fechaInicioSubasta:         a.fechaInicioSubasta,
        fechaExpiracion:            a.fechaExpiracion,
        pujas:                      a.pujas||[],
        ofertasAutomaticas:         a.ofertasAutomaticas||[],
        chatIniciado,
        resenaEnviadaAlAutor,
        inscritosConResenaPorAnuncio,
        sugerencias,
        esFavorito,
        inscritosDetallados,
        inscritoGanador: a.inscritoGanador || null,
        confirmacion: a.confirmacion || { autor: false, inscrito: false },
        estado: a.estado
      
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

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  router.post("/confirmar-entrega/:id", async (req, res) => {
    try {
      const anuncio = await Anuncio.findById(req.params.id);
      if (!anuncio) return res.status(404).json({ success: false, error: "Anuncio no encontrado." });
  
      const usuario = req.body.usuario;
      if (!usuario) return res.status(400).json({ success: false, error: "Usuario no especificado." });
  
      const io = req.app.get("io");
  
      let redirigirAPago = false;
      let sessionId = null;
  
      if (usuario === anuncio.autor) {
        anuncio.confirmacion.autor = true;
        redirigirAPago = true;
      
        const clienteEmail = req.session.user?.email || null;
      
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          ...(clienteEmail && clienteEmail.includes('@') ? { customer_email: clienteEmail } : {}),
          line_items: [{
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Pago acompañamiento - Anuncio ${anuncio.titulo}`,
              },
              unit_amount: Math.round(Number(anuncio.precioActual) * 100),
            },
            quantity: 1,
          }],
          success_url: `${req.protocol}://${req.get("host")}/pago/exito?anuncio=${anuncio._id}`,
          cancel_url: `${req.protocol}://${req.get("host")}/pago/cancelado`,

        });
      
        sessionId = session.id;
      
      } else if (usuario === anuncio.inscritoGanador) {
        // Validar datos de cobro
        const user = await Usuario.findOne({ username: usuario });
        if (!user?.datosCobro?.metodo || !user?.datosCobro?.numero) {
          return res.status(400).json({ 
            success: false, 
            redirect: true, 
            redirectTo: "/perfil",
            error: "Debes añadir tu método de cobro en el perfil antes de confirmar."
          });
        }
  
        anuncio.confirmacion.inscrito = true;
      } else {
        return res.status(403).json({ success: false, error: "No tienes permiso para confirmar." });
      }
      //  Si ambos confirmaron, marcar como finalizado el anuncio
      if (anuncio.confirmacion.autor && anuncio.confirmacion.inscrito) {
        anuncio.estado = "finalizado";
      }
      await anuncio.save();
  
      io.to(`auction_${anuncio._id}`).emit("confirmacion_actualizada", {
        anuncioId: anuncio._id.toString(),
        confirmacion: anuncio.confirmacion
      });
  
      return res.json({ success: true, redirigirAPago, sessionId });
  
    } catch (err) {
      console.error("❌ Error en confirmar entrega:", err);
      return res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
  });

  router.post("/finalizar-ya/:id", async (req, res) => {
    try {
      const anuncio = await Anuncio.findById(req.params.id);
      if (!anuncio || anuncio.estadoSubasta !== "activa") {
        return res.status(400).send("Subasta no activa.");
      }
  
      const io = req.app.get("io");
      let ganador = null;
  
      // 🔵 Subasta INGLESA: Simular progreso completo de ofertas automáticas
      if (anuncio.auctionType === "inglesa") {
        const autos = [...anuncio.ofertasAutomaticas];
        if (autos.length === 0) {
          return res.redirect(`/anuncios/${anuncio._id}`);
        }
      
        // Ordenar de mayor a menor
        autos.sort((a, b) => b.precioMaximo - a.precioMaximo);
      
        const mejor = autos[0];
        const segundo = autos[1];
      
        const incremento = mejor.incrementoPaso || 100;
        const segundaPujaMax = segundo?.precioMaximo || anuncio.precioActual;
      
        // El precio justo es lo mínimo que necesita para ganar
        const precioGanador = Math.min(
          mejor.precioMaximo,
          segundaPujaMax + incremento
        );
      
        anuncio.pujas.push({
          usuario: mejor.usuario,
          cantidad: precioGanador,
          fecha: new Date(),
          automatica: true
        });
      
        anuncio.precioActual = precioGanador;
        ganador = mejor.usuario;
        anuncio.ofertasAutomaticas = []; // limpiar
      }
      
      
  
      // 🟠 Subasta HOLANDESA: Escoger mejor oferta
      else if (anuncio.auctionType === "holandesa") {
        const elegibles = anuncio.ofertasAutomaticas.filter(
          o => o.precioMaximo >= anuncio.precioActual
        );
  
        if (elegibles.length > 0) {
          const mejor = elegibles.reduce((min, o) =>
            o.precioMaximo < min.precioMaximo ? o : min, elegibles[0]);
  
          anuncio.pujas.push({
            usuario: mejor.usuario,
            cantidad: anuncio.precioActual,
            fecha: new Date(),
            automatica: true
          });
  
          ganador = mejor.usuario;
          anuncio.ofertasAutomaticas = [];
        }
      }
  
      // 🔚 Finalizar subasta
      anuncio.estadoSubasta = "finalizada";
      anuncio.estado = anuncio.inscritos.length ? "en_produccion" : "finalizado";
      if (ganador) anuncio.inscritoGanador = ganador;
      await anuncio.save();
  
      // Emitir eventos
      io.emit("actualizar_pujas", {
        anuncioId: anuncio._id.toString(),
        pujas: anuncio.pujas,
        precioActual: anuncio.precioActual
      });
  
      io.emit("subasta_finalizada", {
        anuncioId: anuncio._id.toString(),
        precioFinal: anuncio.precioActual,
        ganador
      });
  
      res.redirect(`/anuncios/${anuncio._id}`);
    } catch (err) {
      console.error("❌ Error en finalización anticipada:", err);
      res.status(500).send("Error interno.");
    }
  });
  
  
  
  
  return router;
};

