import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { crearNotificacion } from "@/lib/notifications";
import { NextResponse } from "next/server";

function htmlAprobacion(nombres: string, cedula: string, provNombre: string) {
  const fecha = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#7ab648;padding:28px 32px"><p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;text-transform:uppercase">Sistema de control de ingreso</p><h1 style="margin:6px 0 0;color:#fff;font-size:24px">Easy Kontrol</h1></div>
  <div style="background:#dcfce7;padding:16px 32px;border-bottom:2px solid #bbf7d0"><span style="font-size:28px">✅</span><div style="display:inline-block;margin-left:12px;vertical-align:middle"><p style="margin:0;font-size:18px;font-weight:700;color:#15803d">Ingreso Aprobado</p><p style="margin:2px 0 0;font-size:13px;color:#166534">${fecha}</p></div></div>
  <div style="padding:32px"><p style="margin:0 0 16px;font-size:15px;color:#374151">Estimado equipo de <strong>${provNombre}</strong>,</p><p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">El personal indicado ha sido <strong style="color:#15803d">aprobado</strong> para el ingreso.</p>
  <table style="width:100%;border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden"><tr><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;width:40%">Nombre</td><td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:600">${nombres}</td></tr><tr style="background:#f3f4f6"><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280">Cédula</td><td style="padding:12px 16px;font-size:14px;color:#111827">${cedula}</td></tr><tr><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280">Empresa</td><td style="padding:12px 16px;font-size:14px;color:#111827">${provNombre}</td></tr></table></div>
  <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center"><p style="margin:0;font-size:12px;color:#9ca3af">Mensaje automático de <strong>Easy Kontrol</strong>. No responder.</p></div>
</div></body></html>`;
}

function htmlRechazo(nombres: string, cedula: string, provNombre: string, motivo: string) {
  const fecha = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#7ab648;padding:28px 32px"><p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;text-transform:uppercase">Sistema de control de ingreso</p><h1 style="margin:6px 0 0;color:#fff;font-size:24px">Easy Kontrol</h1></div>
  <div style="background:#fee2e2;padding:16px 32px;border-bottom:2px solid #fecaca"><span style="font-size:28px">❌</span><div style="display:inline-block;margin-left:12px;vertical-align:middle"><p style="margin:0;font-size:18px;font-weight:700;color:#dc2626">Ingreso Rechazado</p><p style="margin:2px 0 0;font-size:13px;color:#991b1b">${fecha}</p></div></div>
  <div style="padding:32px"><p style="margin:0 0 16px;font-size:15px;color:#374151">Estimado equipo de <strong>${provNombre}</strong>,</p>
  <table style="width:100%;border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px"><tr><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;width:40%">Nombre</td><td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:600">${nombres}</td></tr><tr style="background:#f3f4f6"><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280">Cédula</td><td style="padding:12px 16px;font-size:14px;color:#111827">${cedula}</td></tr></table>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:8px;padding:20px;margin-bottom:24px"><p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase">Motivo del rechazo</p><p style="margin:0;font-size:15px;color:#7f1d1d;line-height:1.6">${motivo || "No especificado. Comuníquese con el área responsable."}</p></div>
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px"><p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase">¿Qué hacer?</p><ol style="margin:0;padding-left:20px;color:#78350f;font-size:14px;line-height:2"><li>Revise el motivo del rechazo.</li><li>Corrija los documentos señalados en el sistema.</li><li>El registro quedará en estado <strong>Pendiente</strong> para nueva revisión.</li></ol></div></div>
  <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center"><p style="margin:0;font-size:12px;color:#9ca3af">Mensaje automático de <strong>Easy Kontrol</strong>. No responder.</p></div>
</div></body></html>`;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, proveedor_id")
    .eq("id", session.user.id)
    .single();

  const body = await request.json();

  // ── Proveedor re-envía documentos de personal rechazado ──
  if (profile?.rol === "proveedor") {
    const admin = createAdminClient();
    const { data: persona } = await admin
      .from("personal")
      .select("id, proveedor_id, estado")
      .eq("id", params.id)
      .single();

    if (!persona) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (persona.proveedor_id !== profile.proveedor_id) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    }
    if (persona.estado !== "rechazado") {
      return NextResponse.json({ error: "Solo se puede corregir personal rechazado" }, { status: 400 });
    }

    const { data: updated, error } = await admin
      .from("personal")
      .update({ estado: "pendiente", en_correccion: true, motivo_rechazo: null, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: updated });
  }

  // ── Admin cambia estado ───────────────────────────────
  if (profile?.rol !== "admin") {
    return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
  }

  const { estado, motivo_rechazo, email_notificacion } = body;

  if (!["aprobado", "rechazado", "inactivo"].includes(estado)) {
    return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { estado, updated_at: new Date().toISOString() };

  if (estado === "aprobado") {
    updateData.aprobado_por = session.user.id;
    updateData.aprobado_at = new Date().toISOString();
    updateData.motivo_rechazo = null;
    updateData.en_correccion = false;
  }
  if (estado === "rechazado") {
    updateData.motivo_rechazo = motivo_rechazo ?? null;
    updateData.en_correccion = false;
  }

  const { data: current } = await supabase
    .from("personal")
    .select("estado")
    .eq("id", params.id)
    .single();

  if (current?.estado === estado) {
    return NextResponse.json({ error: "El personal ya se encuentra en ese estado" }, { status: 409 });
  }

  const { data: updated, error } = await supabase
    .from("personal")
    .update(updateData)
    .eq("id", params.id)
    .select(`*, proveedor:proveedores(id, nombre, email)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    user_id: session.user.id,
    action: estado === "aprobado" ? "personal_aprobado" : "personal_rechazado",
    entity_type: "personal",
    entity_id: params.id,
    metadata: { nombres: updated.nombres, cedula: updated.cedula, motivo_rechazo },
  });

  const { data: provProfile } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("proveedor_id", updated.proveedor_id)
    .single();

  if (provProfile) {
    await crearNotificacion(
      provProfile.id,
      estado === "aprobado" ? "personal_aprobado" : "personal_rechazado",
      `${updated.nombres} fue ${estado === "aprobado" ? "aprobado" : "rechazado"}.`,
      { personal_id: params.id }
    );
  }

  // ── Enviar email ──────────────────────────────────────
  const destinatarios = new Set<string>();

  // Obtener el email real del usuario vinculado al proveedor desde auth.users
  if (provProfile?.id) {
    const adminClient = createAdminClient();
    const { data: authData } = await adminClient.auth.admin.getUserById(provProfile.id);
    if (authData?.user?.email) destinatarios.add(authData.user.email);
  }
  if (email_notificacion?.trim()) destinatarios.add(email_notificacion.trim());

  if (destinatarios.size > 0) {
    const provNombre = updated.proveedor?.nombre ?? "Proveedor";
    const tipo = estado === "aprobado" ? "aprobacion" : "rechazo";
    const subject = estado === "aprobado"
      ? `[Easy Kontrol] Ingreso aprobado: ${updated.nombres}`
      : `[Easy Kontrol] Ingreso rechazado: ${updated.nombres}`;
    const html = estado === "aprobado"
      ? htmlAprobacion(updated.nombres, updated.cedula, provNombre)
      : htmlRechazo(updated.nombres, updated.cedula, provNombre, motivo_rechazo ?? "");

    for (const correo of Array.from(destinatarios)) {
      const enviado = await sendEmail(correo, subject, html);
      await supabase.from("email_logs").insert({
        personal_id: params.id, tipo, destinatario: correo, asunto: subject,
        estado: enviado ? "enviado" : "error",
      });
    }
  }

  return NextResponse.json({ data: updated });
}
