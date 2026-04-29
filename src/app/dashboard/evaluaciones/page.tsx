import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EvaluacionesClient } from "@/components/evaluaciones/EvaluacionesClient";

export default async function EvaluacionesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  const rol = profile?.rol ?? "proveedor";

  const { data: evaluaciones } = await supabase
    .from("evaluaciones")
    .select(`*, proveedor:proveedores(id,nombre,nit), detalles:detalle_evaluacion(*, criterio:criterios_evaluacion(*))`)
    .order("created_at", { ascending: false });

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id,nombre,nit,email,telefono,estado")
    .eq("estado", "activo")
    .order("nombre");

  const { data: criterios } = await supabase
    .from("criterios_evaluacion")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  return (
    <EvaluacionesClient
      evaluaciones={evaluaciones ?? []}
      proveedores={proveedores ?? []}
      criterios={criterios ?? []}
      rol={rol}
    />
  );
}
