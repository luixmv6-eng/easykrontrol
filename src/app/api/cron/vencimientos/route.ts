import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { NextResponse } from "next/server";

const TIPO_LABELS: Record<string, string> = {
  cedula: "Cédula",
  licencia: "Licencia de conducción",
  arl: "ARL",
  soat: "SOAT",
  tecnicomecanica: "Tecnomecánica",
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const hoy = new Date();
  const en60 = new Date(hoy); en60.setDate(hoy.getDate() + 60);
  const en30 = new Date(hoy); en30.setDate(hoy.getDate() + 30);
  const fecha60 = en60.toISOString().split("T")[0];
  const fecha30 = en30.toISOString().split("T")[0];

  const admin = createAdminClient();
  const { data: docs } = await admin
    .from("documentos_personal")
    .select("id, tipo, fecha_vencimiento, personal:personal(nombres, cedula, proveedor:proveedores(nombre, email))")
    .in("fecha_vencimiento", [fecha60, fecha30]);

  let enviados = 0;

  for (const doc of docs ?? []) {
    const personal = doc.personal as unknown as { nombres: string; cedula: string; proveedor: { nombre: string; email: string | null } | null } | null;
    const email = personal?.proveedor?.email;
    if (!email) continue;

    const dias = doc.fecha_vencimiento === fecha60 ? 60 : 30;
    const tipoLabel = TIPO_LABELS[doc.tipo] ?? doc.tipo;
    const fechaFormateada = new Date(doc.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-CO", {
      year: "numeric", month: "long", day: "numeric",
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#7ab648;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:20px">⚠️ Alerta de vencimiento</h1>
          <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px">Easy Kontrol — Gestión de Proveedores</p>
        </div>
        <div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p style="color:#374151;font-size:15px">Estimado proveedor,</p>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            El documento <strong>${tipoLabel}</strong> de <strong>${personal?.nombres}</strong>
            (C.C. ${personal?.cedula}) de la empresa <strong>${personal?.proveedor?.nombre}</strong>
            vencerá en <strong>${dias} días</strong>, el <strong>${fechaFormateada}</strong>.
          </p>
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;color:#92400e;font-size:13px">
              Por favor, actualice los documentos antes de la fecha de vencimiento para evitar interrupciones en el proceso de ingreso.
            </p>
          </div>
          <p style="color:#6b7280;font-size:12px;margin-top:24px">
            Este es un mensaje automático de Easy Kontrol. No responda este correo.
          </p>
        </div>
      </div>
    `;

    await sendEmail(email, `⚠️ Documento por vencer en ${dias} días — Easy Kontrol`, html);
    enviados++;
  }

  return NextResponse.json({ ok: true, procesados: docs?.length ?? 0, enviados });
}
