const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // proveedor
  auth: {
    user: process.env.EMAIL_FROM,        // correo (se define en .env)
    pass: process.env.EMAIL_PASSWORD     // contraseña o app-password
  }
});

async function enviarCorreo({ to, subject, html }) {
  const mailOptions = {
    from: `"LibrePost" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado:", info.response);
  } catch (error) {
    console.error(" Error enviando email:", error);
    throw error;
  }
}

module.exports = enviarCorreo;
