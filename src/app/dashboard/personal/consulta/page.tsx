import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConsultaPersonalClient } from "@/components/personal/ConsultaPersonalClient";
import { getProveedorIdsByEmpresa } from "@/lib/empresa";

export default async function ConsultaPersonalPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, proveedor_id, full_name, empresa_grupo")
    .eq("id", session.user.id)
    .single();

  const rol = profile?.rol ?? "proveedor";
  const esAdmin = rol === "admin";
  const empresaGrupo = profile?.empresa_grupo ?? null;

  // Para admins con empresa_grupo asignada, filtrar por sus proveedores
  let provIds: string[] | null = null;
  if (esAdmin && empresaGrupo) {
    provIds = await getProveedorIdsByEmpresa(supabase, empresaGrupo);
  }

  // RLS ya filtra por proveedor_id automáticamente para proveedores
  let personalQuery = supabase
    .from("personal")
    .select(`*, proveedor:proveedores(id,nombre,nit,email,empresa_grupo), documentos:documentos_personal(*), vehiculo:vehiculos(*)`)
    .is("grupo_id", null)
    .order("created_at", { ascending: false });

  if (provIds !== null) {
    personalQuery = personalQuery.in("proveedor_id", provIds);
  }

  let proveedoresQuery = supabase.from("proveedores").select("id,nombre").order("nombre");
  if (esAdmin && empresaGrupo) {
    proveedoresQuery = proveedoresQuery.eq("empresa_grupo", empresaGrupo);
  }

  const [{ data: personal }, { data: proveedores }] = await Promise.all([
    personalQuery,
    proveedoresQuery,
  ]);

  return (
    <ConsultaPersonalClient
      personal={personal ?? []}
      proveedores={proveedores ?? []}
      rol={rol}
      proveedorIdActual={profile?.proveedor_id ?? null}
      adminNombre={profile?.full_name ?? ""}
    />
  );
}
