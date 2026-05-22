import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CorreccionesClient } from "@/components/personal/CorreccionesClient";
import { getProveedorIdsByEmpresa } from "@/lib/empresa";
import type { Personal } from "@/types";

export default async function CorreccionesPage() {
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

  let personalQuery = supabase
    .from("personal")
    .select(`*, proveedor:proveedores(id,nombre,nit,email), documentos:documentos_personal(*), vehiculo:vehiculos(*)`)
    .eq("en_correccion", true)
    .eq("estado", "pendiente")
    .order("updated_at", { ascending: false });

  if (empresaGrupo) {
    const provIds = await getProveedorIdsByEmpresa(supabase, empresaGrupo);
    personalQuery = personalQuery.in("proveedor_id", provIds);
  }

  const { data: personal } = await personalQuery;

  return <CorreccionesClient personal={(personal ?? []) as Personal[]} />;
}
