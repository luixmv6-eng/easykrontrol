import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProveedoresClient } from "@/components/proveedores/ProveedoresClient";

export default async function ProveedoresPage() {
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

  let proveedoresQuery = supabase.from("proveedores").select("*").order("nombre");
  if (empresaGrupo) {
    proveedoresQuery = proveedoresQuery.eq("empresa_grupo", empresaGrupo);
  }

  const { data: proveedores } = await proveedoresQuery;

  return <ProveedoresClient proveedores={proveedores ?? []} />;
}
