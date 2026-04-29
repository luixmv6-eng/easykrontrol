import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GruposIngresoClient } from "@/components/personal/GruposIngresoClient";
import type { GrupoIngreso } from "@/types";

export default async function GruposPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("rol").eq("id", session.user.id).single();
  if (profile?.rol !== "admin") redirect("/dashboard");

  const { data: grupos } = await supabase
    .from("grupos_ingreso")
    .select(`*, proveedor:proveedores(id,nombre,nit,email), personas:personal(*, documentos:documentos_personal(*), vehiculo:vehiculos(*))`)
    .order("created_at", { ascending: false });

  return <GruposIngresoClient grupos={(grupos ?? []) as GrupoIngreso[]} />;
}
