import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConsultaPersonalClient } from "@/components/personal/ConsultaPersonalClient";

export default async function ConsultaPersonalPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, proveedor_id")
    .eq("id", session.user.id)
    .single();

  const rol = profile?.rol ?? "proveedor";

  // RLS ya filtra por proveedor_id automáticamente para proveedores
  const { data: personal } = await supabase
    .from("personal")
    .select(`*, proveedor:proveedores(id,nombre,nit,email), documentos:documentos_personal(*), vehiculo:vehiculos(*)`)
    .is("grupo_id", null)
    .order("created_at", { ascending: false });

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id,nombre")
    .order("nombre");

  return (
    <ConsultaPersonalClient
      personal={personal ?? []}
      proveedores={proveedores ?? []}
      rol={rol}
      proveedorIdActual={profile?.proveedor_id ?? null}
    />
  );
}
