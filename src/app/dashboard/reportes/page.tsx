import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportesClient } from "@/components/reportes/ReportesClient";

export const metadata = { title: "Reportes — Easy Kontrol" };

export default async function ReportesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, proveedor_id")
    .eq("id", session.user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.rol !== "admin") redirect("/dashboard");

  return <ReportesClient rol={profile.rol} />;
}
