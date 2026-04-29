import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SessionTimeout } from "@/components/auth/SessionTimeout";
import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  const rol = profile?.rol ?? "proveedor";

  return (
    <div className="min-h-screen bg-ek-50 flex flex-col">
      <SessionTimeout />
      <DashboardNavbar email={session.user.email!} />
      <div className="flex flex-1">
        <DashboardSidebar rol={rol} />
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
