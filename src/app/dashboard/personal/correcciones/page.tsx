import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CorreccionesClient } from "@/components/personal/CorreccionesClient";
import type { Personal } from "@/types";

export default async function CorreccionesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("rol").eq("id", session.user.id).single();
  if (profile?.rol !== "admin") redirect("/dashboard");

  const { data: personal } = await supabase
    .from("personal")
    .select(`*, proveedor:proveedores(id,nombre,nit,email), documentos:documentos_personal(*), vehiculo:vehiculos(*)`)
    .eq("en_correccion", true)
    .eq("estado", "pendiente")
    .order("updated_at", { ascending: false });

  return <CorreccionesClient personal={(personal ?? []) as Personal[]} />;
}
