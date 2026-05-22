import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GruposIngresoClient } from "@/components/personal/GruposIngresoClient";
import { getProveedorIdsByEmpresa } from "@/lib/empresa";
import type { GrupoIngreso } from "@/types";

export default async function GruposPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, empresa_grupo")
    .eq("id", session.user.id)
    .single();
  if (profile?.rol !== "admin") redirect("/dashboard");

  const empresaGrupo = profile?.empresa_grupo ?? null;

  let gruposQuery = supabase
    .from("grupos_ingreso")
    .select(`*, proveedor:proveedores(id,nombre,nit,email), personas:personal(*, documentos:documentos_personal(*), vehiculo:vehiculos(*))`)
    .order("created_at", { ascending: false });

  if (empresaGrupo) {
    const provIds = await getProveedorIdsByEmpresa(supabase, empresaGrupo);
    gruposQuery = gruposQuery.in("proveedor_id", provIds);
  }

  const { data: grupos } = await gruposQuery;

  return <GruposIngresoClient grupos={(grupos ?? []) as GrupoIngreso[]} />;
}
