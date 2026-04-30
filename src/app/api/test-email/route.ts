import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const destino = process.env.GMAIL_USER ?? "";

  const ok = await sendEmail(
    destino,
    "[Easy Kontrol] Prueba de correo",
    `<div style="font-family:Arial,sans-serif;padding:32px">
      <h2 style="color:#7ab648">✅ Easy Kontrol — Correo de prueba</h2>
      <p>Si recibes este mensaje, el sistema de email está funcionando correctamente.</p>
      <p style="color:#6b7280;font-size:13px">Enviado el ${new Date().toLocaleString("es-CO")}</p>
    </div>`
  );

  if (ok) {
    return NextResponse.json({ ok: true, message: `Correo enviado a ${destino}` });
  } else {
    return NextResponse.json({ ok: false, message: "Error al enviar. Revisa los logs del servidor." }, { status: 500 });
  }
}
