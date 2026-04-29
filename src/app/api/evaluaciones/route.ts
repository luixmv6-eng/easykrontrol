import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (profile?.rol !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden crear evaluaciones" }, { status: 403 });
  }

  const body = await request.json();
  const { proveedor_id, periodo, observaciones, detalles } = body;

  if (!proveedor_id || !periodo) {
    return NextResponse.json({ error: "Proveedor y periodo son requeridos" }, { status: 400 });
  }

  // Calcular puntaje total ponderado
  let puntaje_total: number | null = null;
  if (Array.isArray(detalles) && detalles.length > 0) {
    // detalles: [{criterio_id, puntaje, peso, observacion}]
    const totalPeso = detalles.reduce((acc: number, d: { peso: number }) => acc + (d.peso ?? 0), 0);
    if (totalPeso > 0) {
      const raw = detalles.reduce(
        (acc: number, d: { puntaje: number; peso: number }) => acc + (d.puntaje * d.peso) / totalPeso,
        0
      );
      puntaje_total = Math.round(raw * 100) / 100;
    }
  }

  const { data: evaluacion, error } = await supabase
    .from("evaluaciones")
    .insert({
      proveedor_id,
      periodo,
      observaciones: observaciones ?? null,
      evaluado_por: session.user.id,
      puntaje_total,
      estado: "finalizado",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insertar detalles
  if (Array.isArray(detalles) && detalles.length > 0) {
    const detallesInsert = detalles.map((d: {
      criterio_id: string; puntaje: number; observacion?: string;
    }) => ({
      evaluacion_id: evaluacion.id,
      criterio_id: d.criterio_id,
      puntaje: d.puntaje,
      observacion: d.observacion ?? null,
    }));

    const { error: detError } = await supabase
      .from("detalle_evaluacion")
      .insert(detallesInsert);

    if (detError) {
      console.error("Error al insertar detalles:", detError);
    }
  }

  return NextResponse.json({ data: evaluacion }, { status: 201 });
}
