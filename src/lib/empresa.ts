import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmpresaGrupo } from "@/types";

export async function getProveedorIdsByEmpresa(
  supabase: SupabaseClient,
  empresaGrupo: EmpresaGrupo
): Promise<string[]> {
  const { data } = await supabase
    .from("proveedores")
    .select("id")
    .eq("empresa_grupo", empresaGrupo);
  return (data ?? []).map((p: { id: string }) => p.id);
}
