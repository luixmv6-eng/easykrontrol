import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EvaluacionesClient } from "@/components/evaluaciones/EvaluacionesClient";
import { getProveedorIdsByEmpresa } from "@/lib/empresa";

export default async function EvaluacionesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, empresa_grupo")
    .eq("id", session.user.id)
    .single();

  const rol = profile?.rol ?? "proveedor";
  const esAdmin = rol === "admin";
  const empresaGrupo = profile?.empresa_grupo ?? null;

  let provIds: string[] | null = null;
  if (esAdmin && empresaGrupo) {
    provIds = await getProveedorIdsByEmpresa(supabase, empresaGrupo);
  }

  let evaluacionesQuery = supabase
    .from("evaluaciones")
    .select(`*, proveedor:proveedores(id,nombre,nit), detalles:detalle_evaluacion(*, criterio:criterios_evaluacion(*))`)
    .order("created_at", { ascending: false });

  let proveedoresQuery = supabase
    .from("proveedores")
    .select("id,nombre,nit,email,telefono,estado")
    .eq("estado", "activo")
    .order("nombre");

  if (provIds !== null) {
    evaluacionesQuery = evaluacionesQuery.in("proveedor_id", provIds);
    proveedoresQuery = proveedoresQuery.in("id", provIds);
  }

  const [{ data: evaluaciones }, { data: proveedores }, { data: criterios }] = await Promise.all([
    evaluacionesQuery,
    proveedoresQuery,
    supabase.from("criterios_evaluacion").select("*").eq("activo", true).order("nombre"),
  ]);

  return (
    <EvaluacionesClient
      evaluaciones={evaluaciones ?? []}
      proveedores={proveedores ?? []}
      criterios={criterios ?? []}
      rol={rol}
    />
  );
}
