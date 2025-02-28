const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'public'),
  path.join(__dirname, 'public', 'css'),
  path.join(__dirname, 'public', 'js'),
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Directorio creado: ${dir}`);
  }
});

// Crear archivos vacíos si no existen
const files = [
  path.join(__dirname, 'public', 'index.html'),
  path.join(__dirname, 'public', 'css', 'style.css'),
  path.join(__dirname, 'public', 'js', 'game.js'),
];

files.forEach((file) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '');
    console.log(`Archivo creado: ${file}`);
  }
});
