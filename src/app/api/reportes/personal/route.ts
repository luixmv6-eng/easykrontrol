import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, proveedor_id, empresa_grupo")
    .eq("id", session.user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });

  let query = supabase
    .from("personal")
    .select(`
      id, nombres, cedula, estado, en_correccion,
      actividad_a_realizar, cargo, municipio_residencia,
      arl, eps, afp, fecha_entrada, fecha_fin,
      aprobado_at, motivo_rechazo, created_at,
      proveedor:proveedores(id, nombre, nit, empresa_grupo),
      documentos:documentos_personal(tipo, fecha_vencimiento, verificado_auto),
      vehiculo:vehiculos(tipo, placa, marca, modelo, color)
    `)
    .order("created_at", { ascending: false });

  // Proveedor: solo ve su propio personal
  if (profile.rol === "proveedor" && profile.proveedor_id) {
    query = query.eq("proveedor_id", profile.proveedor_id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Admin con empresa_grupo: filtra por su tenant en memoria (proveedor.empresa_grupo)
  // Admin global (empresa_grupo = null): ve todo sin filtro
  let resultado = data ?? [];
  if (profile.rol === "admin" && profile.empresa_grupo) {
    resultado = resultado.filter(
      (p: any) => p.proveedor?.empresa_grupo === profile.empresa_grupo
    );
  }

  return NextResponse.json({ data: resultado, rol: profile.rol, empresa_grupo: profile.empresa_grupo });
}
