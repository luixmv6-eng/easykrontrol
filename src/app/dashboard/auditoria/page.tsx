import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Shield } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  personal_aprobado: "Personal aprobado",
  personal_rechazado: "Personal rechazado",
  personal_registrado: "Personal registrado",
  personal_bulk_aprobado: "Aprobación masiva",
  personal_bulk_rechazado: "Rechazo masivo",
  personal_correccion: "Corrección enviada",
  export_excel: "Exportación Excel",
  export_pdf: "Exportación PDF",
  usuario_creado: "Usuario creado",
  proveedor_creado: "Empresa creada",
  proveedor_actualizado: "Empresa actualizada",
  evaluacion_creada: "Evaluación creada",
  evaluacion_actualizada: "Evaluación actualizada",
};

const ACTION_COLOR: Record<string, string> = {
  personal_aprobado: "bg-green-100 text-green-700",
  personal_bulk_aprobado: "bg-green-100 text-green-700",
  personal_rechazado: "bg-red-100 text-red-700",
  personal_bulk_rechazado: "bg-red-100 text-red-700",
  personal_registrado: "bg-blue-100 text-blue-700",
  personal_correccion: "bg-orange-100 text-orange-700",
  export_excel: "bg-purple-100 text-purple-700",
  export_pdf: "bg-purple-100 text-purple-700",
};

export default async function AuditoriaPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (profile?.rol !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  const { data: logs } = await admin
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at, user:profiles(username, full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <Shield size={20} className="text-ek-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-800">Registro de auditoría</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Últimas {logs?.length ?? 0} acciones del sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {(!logs || logs.length === 0) && (
          <div className="p-10 text-center text-[13px] text-gray-400">Sin registros de auditoría aún.</div>
        )}
        <div className="divide-y divide-gray-50">
          {(logs ?? []).map((log) => {
            const user = log.user as unknown as { username: string | null; full_name: string | null } | null;
            const actionLabel = ACTION_LABELS[log.action] ?? log.action;
            const actionColor = ACTION_COLOR[log.action] ?? "bg-gray-100 text-gray-600";
            const meta = log.metadata as Record<string, unknown> | null;

            return (
              <div key={log.id} className="flex items-start justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${actionColor}`}>
                    {actionLabel}
                  </span>
                  <div>
                    <p className="text-[13px] text-gray-700">
                      {user?.full_name ?? user?.username ?? "Sistema"}
                    </p>
                    {meta && Object.keys(meta).length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {Object.entries(meta)
                          .filter(([, v]) => v !== null && v !== undefined)
                          .map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${(v as unknown[]).length}]` : String(v)}`)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 shrink-0 ml-4">
                  {new Date(log.created_at).toLocaleString("es-CO", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
