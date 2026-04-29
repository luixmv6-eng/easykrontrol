import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { proveedor_id, nombres, cedula, fecha_entrada, fecha_fin, grupo_id, vehiculo, en_correccion } = body;

  if (!proveedor_id || !nombres || !cedula) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Crear o reutilizar vehículo si se proporcionaron datos
  let vehiculo_id: string | null = null;
  if (vehiculo?.placa?.trim()) {
    const placa = vehiculo.placa.trim().toUpperCase();
    const { data: existing } = await admin
      .from("vehiculos")
      .select("id")
      .eq("proveedor_id", proveedor_id)
      .eq("placa", placa)
      .maybeSingle();

    if (existing) {
      vehiculo_id = existing.id;
    } else {
      const { data: nuevo, error: vErr } = await admin
        .from("vehiculos")
        .insert({
          proveedor_id,
          placa,
          marca: vehiculo.marca?.trim() || null,
          modelo: vehiculo.modelo?.trim() || null,
          tipo: vehiculo.tipo?.trim() || null,
        })
        .select("id")
        .single();
      if (vErr) return NextResponse.json({ error: `Error creando vehículo: ${vErr.message}` }, { status: 500 });
      vehiculo_id = nuevo.id;
    }
  }

  const { data, error } = await supabase
    .from("personal")
    .insert({
      proveedor_id,
      nombres: nombres.trim(),
      cedula: cedula.trim(),
      fecha_entrada: fecha_entrada || null,
      fecha_fin: fecha_fin || null,
      grupo_id: grupo_id || null,
      vehiculo_id,
      en_correccion: en_correccion ?? false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Esta cédula ya está registrada para este proveedor" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const proveedor_id = searchParams.get("proveedor_id");
  const estado = searchParams.get("estado");
  const en_correccion = searchParams.get("en_correccion");

  let query = supabase
    .from("personal")
    .select(`*, proveedor:proveedores(id,nombre,nit,email), documentos:documentos_personal(*), vehiculo:vehiculos(*)`)
    .order("created_at", { ascending: false });

  if (proveedor_id) query = query.eq("proveedor_id", proveedor_id);
  if (estado) query = query.eq("estado", estado);
  if (en_correccion === "true") query = query.eq("en_correccion", true);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
