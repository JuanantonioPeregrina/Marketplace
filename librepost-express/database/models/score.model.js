const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'scores.json');

const scores = {
    data: [],

    registerScore(username, score) {
        const date = new Date().toISOString();
        this.data.push({ username, score, date });

        // Ordenar por puntaje de mayor a menor
        this.data.sort((a, b) => b.score - a.score);

        // Limitar a los 10 mejores puntajes
        this.data = this.data.slice(0, 10);

        // Guardar los datos en un archivo JSON
        fs.writeFileSync(filePath, JSON.stringify(this.data, null, 2));
    },

    getTopScores() {
        return this.data;
    },

    loadScores() {
    //AÑADIR ESTO PERMITE PERSISTENCIA Leer los datos del archivo JSON al iniciar el servidor 
        if (fs.existsSync(filePath)) {
            this.data = JSON.parse(fs.readFileSync(filePath));
        }
    }
};

// Cargar los puntajes al inicio
scores.loadScores();

module.exports = scores;
