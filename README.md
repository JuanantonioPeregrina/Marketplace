# 📦 PostLibre

**PostLibre** es una plataforma web tipo marketplace que permite a usuarios publicar anuncios, participar en subastas competitivas (inglesas y holandesas), chatear en tiempo real y gestionar su actividad desde un panel personalizado. La plataforma también incluye un panel de administración para validación de usuarios, métricas del sistema y control de reportes.

---

## 🌐 Proyecto en producción

🔗 https://postlibre.es

---

## ⚙️ Tecnologías utilizadas

- **Backend**: Node.js + Express
- **Frontend**: EJS + HTML + TailwindCSS + JavaScript
- **Base de datos**: MongoDB (Mongosh)
- **Sockets**: Socket.io (subastas y chat)
- **Autenticación**: express-session + validación de email
- **Subida de imágenes**: Multer
- **Envío de emails**: Nodemailer
- **Despliegue**: AWS (EC2 + MongoDB Atlas)

---

## 🧰 Requisitos previos

### ✅ Instalar Node.js

**Windows/macOS**

1. Descargar desde: https://nodejs.org  
2. Instalar la versión **LTS (recomendada)**  
3. Durante la instalación, asegúrate de marcar la opción:  
   ✅ “Add to PATH”  
4. Verifica instalación:

```bash
node -v
npm -v
```

---

### ✅ Instalar MongoDB y Mongosh

#### 🔹 Windows

1. Descargar MongoDB Community Edition:  
   https://www.mongodb.com/try/download/community

2. Instalar con la opción completa.

3. Añadir `mongosh` al PATH manualmente:
   - Abre **Panel de Control → Sistema → Variables de Entorno**
   - Edita la variable `PATH` y añade:

     ```
     C:\Program Files\MongoDB\Tools\<version>\bin
     ```

   *(Reemplaza `<version>` por la que tengas instalada)*

4. Verifica:

```bash
mongosh --version
```

---

#### 🔹 macOS

```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew install mongosh
```

---

## 🛠️ Instalación del proyecto (local)

### 1. Clonar el repositorio

```bash
git clone https://github.com/JuanantonioPeregrina/Marketplace.git
cd Marketplace
```

---

### 2. Instalar dependencias

```bash
npm install
```

> ℹ️ El archivo `.env` ya viene incluido para facilitar las pruebas al jurado.

---

### 3. Ejecutar el servidor

```bash
npm start
```

Abre el navegador en:  
http://localhost:4000

---

## 👨‍💻 Autor

**Juan Antonio Peregrina**  
📧 juanantonioperegrinaperegrina@usp.ceu.es  
🎓 Trabajo de Fin de Grado – Ingeniería Informática (CEU)  
🗓️ Año académico: 2025
