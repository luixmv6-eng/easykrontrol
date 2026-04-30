import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarioVencimientos } from "@/components/dashboard/CalendarioVencimientos";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const hoy = new Date().toISOString().split("T")[0];
  const en90 = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

  const { data: docs } = await supabase
    .from("documentos_personal")
    .select("id, tipo, fecha_vencimiento, personal:personal(id, nombres, cedula, proveedor:proveedores(nombre))")
    .gte("fecha_vencimiento", hoy)
    .lte("fecha_vencimiento", en90)
    .order("fecha_vencimiento");

  return <CalendarioVencimientos docs={(docs as unknown as Parameters<typeof CalendarioVencimientos>[0]["docs"]) ?? []} />;
}
