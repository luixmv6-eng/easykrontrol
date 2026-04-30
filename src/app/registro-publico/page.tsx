import { createClient } from "@/lib/supabase/server";
import { RegistroPublicoForm } from "@/components/personal/RegistroPublicoForm";

export const metadata = {
  title: "Registro de personal — Easy Kontrol",
  description: "Portal público para registro de personal contratista",
};

export default async function RegistroPublicoPage() {
  const supabase = await createClient();
  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .eq("estado", "activo")
    .order("nombre");

  return <RegistroPublicoForm proveedores={proveedores ?? []} />;
}
