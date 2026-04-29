import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shield, Link2 } from "lucide-react";
import { MfaSetup } from "@/components/auth/MfaSetup";
import { AdminResetPanel } from "@/components/dashboard/AdminResetPanel";

export default async function SeguridadPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  const isAdmin = profile?.rol === "admin";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Seguridad</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Configura la verificación en dos pasos y gestiona el acceso.
        </p>
      </div>

      {/* MFA */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={15} className="text-ek-500" />
          <h2 className="text-[14px] font-semibold text-gray-700">
            Verificación en dos pasos (MFA)
          </h2>
        </div>
        <p className="text-[12px] text-gray-400 mb-5 leading-relaxed">
          Protege tu cuenta con Google Authenticator o Authy como segundo
          factor de autenticación.
        </p>
        <MfaSetup />
      </section>

      {/* Admin: generar enlace de reset */}
      {isAdmin && (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <Link2 size={15} className="text-ek-500" />
            <h2 className="text-[14px] font-semibold text-gray-700">
              Generar enlace de restablecimiento
            </h2>
          </div>
          <p className="text-[12px] text-gray-400 mb-5 leading-relaxed">
            Genera un enlace de restablecimiento de contraseña para cualquier
            usuario. El enlace expira en 1 hora y es de un solo uso.
          </p>
          <AdminResetPanel />
        </section>
      )}
    </div>
  );
}
