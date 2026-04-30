import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { crearNotificacion } from "@/lib/notifications";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (profile?.rol !== "admin") {
    return NextResponse.json({ error: "Solo admins pueden hacer aprobaciones masivas" }, { status: 403 });
  }

  const body = await request.json();
  const { ids, accion, motivo_rechazo } = body as {
    ids: string[];
    accion: "aprobar" | "rechazar";
    motivo_rechazo?: string;
  };

  if (!ids?.length || !accion) {
    return NextResponse.json({ error: "ids y accion son requeridos" }, { status: 400 });
  }
  if (accion === "rechazar" && !motivo_rechazo?.trim()) {
    return NextResponse.json({ error: "motivo_rechazo es requerido para rechazo" }, { status: 400 });
  }

  const admin = createAdminClient();
  const nuevoEstado = accion === "aprobar" ? "aprobado" : "rechazado";

  const { data, error } = await admin
    .from("personal")
    .update({
      estado: nuevoEstado,
      aprobado_por: session.user.id,
      aprobado_at: new Date().toISOString(),
      ...(accion === "rechazar" ? { motivo_rechazo: motivo_rechazo ?? "" } : {}),
    })
    .in("id", ids)
    .select("id, nombres, proveedor_id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    user_id: session.user.id,
    action: accion === "aprobar" ? "personal_bulk_aprobado" : "personal_bulk_rechazado",
    entity_type: "personal",
    metadata: { ids, total: ids.length, motivo_rechazo },
  });

  const proveedorIds = Array.from(new Set((data ?? []).map((p) => p.proveedor_id)));
  for (const proveedorId of proveedorIds) {
    const { data: provProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("proveedor_id", proveedorId)
      .single();

    if (provProfile) {
      await crearNotificacion(
        provProfile.id,
        accion === "aprobar" ? "personal_aprobado" : "personal_rechazado",
        `${ids.length} persona(s) fueron ${accion === "aprobar" ? "aprobadas" : "rechazadas"} por el administrador.`,
        { ids }
      );
    }
  }

  return NextResponse.json({ data, total: ids.length });
}
