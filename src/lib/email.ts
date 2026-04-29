import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const from = process.env.GMAIL_USER;
  if (!from) {
    console.warn("[Email] GMAIL_USER no configurado.");
    return false;
  }
  try {
    await transporter.sendMail({ from: `Easy Kontrol <${from}>`, to, subject, html });
    return true;
  } catch (err) {
    console.error("[Email] Error al enviar:", err);
    return false;
  }
}
