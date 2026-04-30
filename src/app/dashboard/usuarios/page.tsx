import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { UsuariosClient } from "@/components/usuarios/UsuariosClient";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("rol").eq("id", session.user.id).single();
  if (profile?.rol !== "admin") redirect("/dashboard");

  const admin = createAdminClient();

  const [{ data: usuarios }, { data: proveedores }] = await Promise.all([
    admin.from("profiles")
      .select("id, username, full_name, rol, proveedor_id, mfa_enabled, created_at, proveedor:proveedores(nombre)")
      .order("created_at", { ascending: false }),
    admin.from("proveedores").select("id, nombre").eq("estado", "activo").order("nombre"),
  ]);

  return (
    <UsuariosClient
      usuarios={(usuarios as unknown as Parameters<typeof UsuariosClient>[0]["usuarios"]) ?? []}
      proveedores={proveedores ?? []}
      currentUserId={session.user.id}
    />
  );
}
