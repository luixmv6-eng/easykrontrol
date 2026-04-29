import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const { error } = await resend.emails.send({ from, to: [to], subject, html });
    return !error;
  } catch { return false; }
}

function htmlRevisionGrupal(
  provNombre: string,
  grupoNombre: string,
  aprobados: { nombres: string; cedula: string }[],
  rechazados: { nombres: string; cedula: string; motivo: string }[]
) {
  const fecha = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const filaAprobado = (p: { nombres: string; cedula: string }) =>
    `<tr><td style="padding:10px 14px;font-size:13px;color:#111827;font-weight:600">${p.nombres}</td><td style="padding:10px 14px;font-size:13px;color:#374151">${p.cedula}</td><td style="padding:10px 14px"><span style="background:#dcfce7;color:#15803d;font-size:12px;font-weight:700;padding:3px 8px;border-radius:999px">✅ Aprobado</span></td></tr>`;

  const filaRechazado = (p: { nombres: string; cedula: string; motivo: string }) =>
    `<tr><td style="padding:10px 14px;font-size:13px;color:#111827;font-weight:600">${p.nombres}</td><td style="padding:10px 14px;font-size:13px;color:#374151">${p.cedula}</td><td style="padding:10px 14px"><span style="background:#fee2e2;color:#dc2626;font-size:12px;font-weight:700;padding:3px 8px;border-radius:999px">❌ Rechazado</span></td></tr>
    <tr style="background:#fef2f2"><td colspan="3" style="padding:6px 14px 12px;font-size:12px;color:#991b1b"><strong>Motivo:</strong> ${p.motivo}</td></tr>`;

  return `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
<div style="max-width:660px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#7ab648;padding:28px 32px"><p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;text-transform:uppercase">Sistema de control de ingreso</p><h1 style="margin:6px 0 0;color:#fff;font-size:24px">Easy Kontrol</h1></div>
  <div style="padding:32px">
    <p style="margin:0 0 4px;font-size:15px;color:#374151">Estimado equipo de <strong>${provNombre}</strong>,</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280">${fecha}</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">Se completó la revisión del ingreso grupal <strong>"${grupoNombre}"</strong>. A continuación el detalle:</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <thead><tr style="background:#f3f4f6"><th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Nombre</th><th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Cédula</th><th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Resultado</th></tr></thead>
      <tbody>${aprobados.map(filaAprobado).join("")}${rechazados.map(filaRechazado).join("")}</tbody>
    </table>
    <div style="margin-top:24px;display:flex;gap:16px">
      <div style="flex:1;background:#dcfce7;border-radius:8px;padding:16px;text-align:center"><p style="margin:0;font-size:24px;font-weight:700;color:#15803d">${aprobados.length}</p><p style="margin:4px 0 0;font-size:12px;color:#166534">Aprobado(s)</p></div>
      <div style="flex:1;background:#fee2e2;border-radius:8px;padding:16px;text-align:center"><p style="margin:0;font-size:24px;font-weight:700;color:#dc2626">${rechazados.length}</p><p style="margin:4px 0 0;font-size:12px;color:#991b1b">Rechazado(s)</p></div>
    </div>
    ${rechazados.length > 0 ? `<div style="margin-top:20px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px"><p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e">Para el personal rechazado:</p><p style="margin:0;font-size:13px;color:#78350f;line-height:1.7">Corrija los documentos indicados en el sistema y reenvíe. El ingreso corregido quedará en estado <strong>Pendiente</strong> para una nueva revisión.</p></div>` : ""}
  </div>
  <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center"><p style="margin:0;font-size:12px;color:#9ca3af">Mensaje automático de <strong>Easy Kontrol</strong>. No responder.</p></div>
</div></body></html>`;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("rol").eq("id", session.user.id).single();
  if (profile?.rol !== "admin") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const body = await request.json();
  const { decisiones }: { decisiones: { personalId: string; accion: "aprobar" | "rechazar"; motivo?: string }[] } = body;

  if (!Array.isArray(decisiones) || decisiones.length === 0) {
    return NextResponse.json({ error: "Se requieren decisiones" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Obtener info del grupo
  const { data: grupo } = await admin
    .from("grupos_ingreso")
    .select(`*, proveedor:proveedores(id,nombre,email)`)
    .eq("id", params.id)
    .single();

  if (!grupo) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });

  const aprobados: { nombres: string; cedula: string }[] = [];
  const rechazados: { nombres: string; cedula: string; motivo: string }[] = [];

  for (const d of decisiones) {
    const updateData: Record<string, unknown> = {
      estado: d.accion === "aprobar" ? "aprobado" : "rechazado",
      en_correccion: false,
      updated_at: new Date().toISOString(),
    };
    if (d.accion === "aprobar") {
      updateData.aprobado_por = session.user.id;
      updateData.aprobado_at = new Date().toISOString();
      updateData.motivo_rechazo = null;
    } else {
      updateData.motivo_rechazo = d.motivo ?? null;
    }

    const { data: p } = await admin
      .from("personal")
      .update(updateData)
      .eq("id", d.personalId)
      .select("nombres, cedula")
      .single();

    if (p) {
      if (d.accion === "aprobar") aprobados.push(p);
      else rechazados.push({ ...p, motivo: d.motivo ?? "" });
    }
  }

  // Actualizar estado del grupo
  const nuevoEstado = rechazados.length === 0 ? "completado" : "completado";
  await admin.from("grupos_ingreso").update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq("id", params.id);

  // Enviar email al proveedor
  const destinatarios = new Set<string>();
  const { data: usuVinculado } = await admin.from("profiles").select("username").eq("proveedor_id", grupo.proveedor_id).not("username", "is", null).limit(1).single();
  if (usuVinculado?.username) destinatarios.add(usuVinculado.username);
  if (grupo.proveedor?.email) destinatarios.add(grupo.proveedor.email);

  if (destinatarios.size > 0) {
    const html = htmlRevisionGrupal(grupo.proveedor?.nombre ?? "Proveedor", grupo.nombre, aprobados, rechazados);
    const subject = `[Easy Kontrol] Revisión de ingreso grupal: ${grupo.nombre}`;
    for (const correo of Array.from(destinatarios)) {
      await sendEmail(correo, subject, html);
    }
  }

  return NextResponse.json({ data: { aprobados: aprobados.length, rechazados: rechazados.length } });
}
