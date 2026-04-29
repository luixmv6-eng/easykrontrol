import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { tipo, url, nombre_archivo, fecha_inicio_vigencia } = body;

  const tiposValidos = ["cedula", "licencia", "arl", "soat", "tecnicomecanica"];
  if (!tipo || !tiposValidos.includes(tipo)) {
    return NextResponse.json({ error: "Tipo de documento no válido" }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ error: "URL del documento requerida" }, { status: 400 });
  }

  // Verificar que el personal existe usando admin client (evita falsos 404 por RLS)
  const admin = createAdminClient();
  const { data: personalRecord } = await admin
    .from("personal")
    .select("id, proveedor_id")
    .eq("id", params.id)
    .single();

  if (!personalRecord) {
    return NextResponse.json({ error: "Personal no encontrado" }, { status: 404 });
  }

  // Verificar que el usuario tiene acceso a este personal
  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, proveedor_id")
    .eq("id", session.user.id)
    .single();

  const esAdmin = perfil?.rol === "admin";
  const esProveedor = perfil?.proveedor_id === personalRecord.proveedor_id;

  if (!esAdmin && !esProveedor) {
    return NextResponse.json({ error: "No tienes acceso a este personal" }, { status: 403 });
  }

  // Buscar si ya existe un documento de ese tipo para este personal.
  // Se usa admin client + lógica manual en lugar de upsert({ onConflict })
  // para evitar dependencia en nombres de constraints de la BD.
  const { data: existente } = await admin
    .from("documentos_personal")
    .select("id")
    .eq("personal_id", params.id)
    .eq("tipo", tipo)
    .maybeSingle();

  let data, error;

  if (existente) {
    // Ya existe → actualizar
    ({ data, error } = await admin
      .from("documentos_personal")
      .update({
        url,
        nombre_archivo: nombre_archivo ?? null,
        fecha_inicio_vigencia: fecha_inicio_vigencia ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existente.id)
      .select()
      .single());
  } else {
    // No existe → insertar
    ({ data, error } = await admin
      .from("documentos_personal")
      .insert({
        personal_id: params.id,
        tipo,
        url,
        nombre_archivo: nombre_archivo ?? null,
        fecha_inicio_vigencia: fecha_inicio_vigencia ?? null,
      })
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
