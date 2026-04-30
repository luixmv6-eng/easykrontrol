import nodemailer from "nodemailer";

function crearTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.error("[Email] GMAIL_USER o GMAIL_APP_PASSWORD no configurados.");
    return false;
  }

  try {
    const transporter = crearTransporter();
    const info = await transporter.sendMail({
      from: `"Easy Kontrol" <${user}>`,
      to,
      subject,
      html,
    });
    console.log("[Email] Enviado OK →", to, "| MessageId:", info.messageId);
    return true;
  } catch (err) {
    console.error("[Email] Error al enviar a", to, "→", err);
    return false;
  }
}
