const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.render('about', { user:req.session.user, 
    title: 'About us',   
    message: 'Somos, Post Libre, una empresa dedicada a la venta de productos y servicios de calidad. ¡Conócenos!',
    player: 'Invitado'});
 }); 


module.exports = router;