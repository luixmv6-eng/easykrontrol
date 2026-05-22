import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SessionTimeout } from "@/components/auth/SessionTimeout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, empresa_grupo")
    .eq("id", session.user.id)
    .single();

  const rol = profile?.rol ?? "proveedor";
  const empresaGrupo = profile?.empresa_grupo ?? null;

  return (
    <>
      <SessionTimeout />
      <DashboardShell
        email={session.user.email ?? session.user.user_metadata?.email ?? "Usuario"}
        rol={rol}
        empresaGrupo={empresaGrupo}
      >
        {children}
      </DashboardShell>
    </>
  );
}
