import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generarExcelPersonal } from "@/lib/excel";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");
  const proveedor_id = searchParams.get("proveedor_id");
  const tab = searchParams.get("tab") ?? "activos";

  let query = supabase
    .from("personal")
    .select(`*, proveedor:proveedores(id,nombre,nit,email), documentos:documentos_personal(*), vehiculo:vehiculos(*)`)
    .is("grupo_id", null)
    .order("created_at", { ascending: false });

  if (estado) query = query.eq("estado", estado);
  if (proveedor_id) query = query.eq("proveedor_id", proveedor_id);

  const { data: personal, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const filtrado = (personal ?? []).filter((p) => {
    const enHistorial =
      p.estado === "inactivo" || (p.fecha_fin && new Date(p.fecha_fin) <= now);
    return tab === "historial" ? enHistorial : !enHistorial;
  });

  await logAudit({
    user_id: session.user.id,
    action: "export_excel",
    entity_type: "personal",
    metadata: { total: filtrado.length, tab, estado, proveedor_id },
  });

  const buffer = generarExcelPersonal(filtrado);
  const fecha = now.toISOString().split("T")[0];

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="personal_${tab}_${fecha}.xlsx"`,
    },
  });
}
