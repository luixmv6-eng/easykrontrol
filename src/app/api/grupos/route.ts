import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");

  let query = supabase
    .from("grupos_ingreso")
    .select(`*, proveedor:proveedores(id,nombre,nit,email), personas:personal(*, documentos:documentos_personal(*), vehiculo:vehiculos(*))`)
    .order("created_at", { ascending: false });

  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { proveedor_id, nombre, descripcion, fecha_entrada, fecha_fin, personas } = body;

  if (!proveedor_id || !nombre?.trim() || !Array.isArray(personas) || personas.length === 0) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Crear grupo
  const { data: grupo, error: grupoErr } = await supabase
    .from("grupos_ingreso")
    .insert({ proveedor_id, nombre: nombre.trim(), descripcion: descripcion?.trim() || null, creado_por: session.user.id })
    .select()
    .single();

  if (grupoErr) return NextResponse.json({ error: grupoErr.message }, { status: 500 });

  const resultPersonas: { id: string; nombres: string; cedula: string }[] = [];

  for (const persona of personas) {
    const { nombres, cedula, vehiculo } = persona;
    if (!nombres?.trim() || !cedula?.trim()) continue;

    // Crear vehículo si aplica
    let vehiculo_id: string | null = null;
    if (vehiculo?.placa?.trim()) {
      const placa = vehiculo.placa.trim().toUpperCase();
      const { data: existing } = await admin.from("vehiculos").select("id").eq("proveedor_id", proveedor_id).eq("placa", placa).maybeSingle();
      if (existing) {
        vehiculo_id = existing.id;
      } else {
        const { data: nuevo } = await admin.from("vehiculos").insert({
          proveedor_id, placa,
          marca: vehiculo.marca?.trim() || null,
          modelo: vehiculo.modelo?.trim() || null,
          tipo: vehiculo.tipo?.trim() || null,
        }).select("id").single();
        vehiculo_id = nuevo?.id ?? null;
      }
    }

    const { data: p, error: pErr } = await supabase
      .from("personal")
      .insert({
        proveedor_id,
        nombres: nombres.trim(),
        cedula: cedula.trim(),
        fecha_entrada: fecha_entrada || null,
        fecha_fin: fecha_fin || null,
        grupo_id: grupo.id,
        vehiculo_id,
      })
      .select("id, nombres, cedula")
      .single();

    if (!pErr && p) resultPersonas.push(p);
  }

  return NextResponse.json({ data: { grupo, personas: resultPersonas } }, { status: 201 });
}
