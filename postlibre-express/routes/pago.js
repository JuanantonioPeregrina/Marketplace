const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.get('/', (req, res) => {
    res.render('pago', {
      title: "Realizar pago",
      anuncio: { _id: "123ABC" }, // Solo de prueba
      user: req.session.user,
    });
  });
  
// POST /pago/confirmar
router.post('/confirmar', async (req, res) => {
  const { amount, currency, clienteEmail, anuncioId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: clienteEmail,
      line_items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: `Pago por acompañamiento - Anuncio ${anuncioId}`,
          },
          unit_amount: amount * 100, // en céntimos
        },
        quantity: 1,
      }],
      success_url: `http://localhost:4000/pago/exito?anuncio=${anuncioId}`,
      cancel_url: `http://localhost:4000/pago/cancelado`,
    });

    res.json({ id: session.id });
  } catch (err) {
    console.error("Error al crear sesión de Stripe:", err);
    res.status(500).send("Error en el pago");
  }
});

router.get('/exito', (req, res) => {
    const anuncioId = req.query.anuncio;
    res.render('pago-exito', {
      title: "Pago realizado",
      anuncioId
    });
  });
  
  // GET /pago/cancelado
  router.get('/cancelado', (req, res) => {
    res.render('pago-cancelado', {
      title: "Pago cancelado"
    });
  });
module.exports = router;