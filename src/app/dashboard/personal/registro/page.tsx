import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RegistroPersonalForm from "@/components/personal/RegistroPersonalForm";
import type { Proveedor } from "@/types";

export default async function RegistroPersonalPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, proveedor_id")
    .eq("id", session.user.id)
    .single();

  const rol = profile?.rol ?? "proveedor";

  let proveedores: Proveedor[] = [];

  if (rol === "admin") {
    const { data } = await supabase
      .from("proveedores")
      .select("*")
      .eq("estado", "activo")
      .order("nombre");
    proveedores = (data as Proveedor[]) ?? [];
  } else if (profile?.proveedor_id) {
    // El usuario proveedor solo ve su propia empresa
    const { data } = await supabase
      .from("proveedores")
      .select("*")
      .eq("id", profile.proveedor_id)
      .single();
    if (data) proveedores = [data as Proveedor];
  }

  return (
    <RegistroPersonalForm
      proveedores={proveedores}
      rol={rol}
      proveedorIdFijo={rol !== "admin" ? (profile?.proveedor_id ?? null) : null}
    />
  );
}
