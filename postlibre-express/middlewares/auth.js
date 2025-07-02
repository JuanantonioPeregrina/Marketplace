function soloAdmins(req, res, next) {
    if (!req.session.user || req.session.user.rol !== 'admin') {
        return res.status(403).send("Acceso denegado");
    }
    next();
}

module.exports = { soloAdmins };
