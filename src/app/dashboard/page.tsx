import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users, CheckCircle, Clock, AlertTriangle, Truck, Building2, UsersRound, Wrench, Archive,
} from "lucide-react";
import type { DashboardKPIs } from "@/types";

function KPICard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon size={15} /></div>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("rol").eq("id", session.user.id).single();
  const esAdmin = profile?.rol === "admin";

  const { data: kpisData } = await supabase.rpc("get_dashboard_kpis");
  const kpis: DashboardKPIs = kpisData ?? {
    total_personal: 0, personal_aprobado: 0, personal_pendiente: 0, personal_rechazado: 0,
    personal_en_correccion: 0, grupos_pendientes: 0, vehiculos_activos: 0, proveedores_activos: 0,
    documentos_por_vencer: 0, personal_historial: 0,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Panel de control</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Resumen general del sistema</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard label="Personal activo"            value={kpis.total_personal}          icon={Users}      color="bg-blue-50 text-blue-500" />
        <KPICard label="Personal aprobado"          value={kpis.personal_aprobado}        icon={CheckCircle} color="bg-green-50 text-green-500" />
        <KPICard label="Pendientes de aprobación"   value={kpis.personal_pendiente}       icon={Clock}      color="bg-amber-50 text-amber-500" />
        <KPICard label="Docs por vencer (60 días)"  value={kpis.documentos_por_vencer}    icon={AlertTriangle} color="bg-red-50 text-red-500" />
        <KPICard label="Vehículos activos"          value={kpis.vehiculos_activos}        icon={Truck}      color="bg-purple-50 text-purple-500" />
        <KPICard label="Proveedores activos"        value={kpis.proveedores_activos}      icon={Building2}  color="bg-ek-50 text-ek-600" />
        {esAdmin && <KPICard label="Ingresos grupales pendientes" value={kpis.grupos_pendientes} icon={UsersRound} color="bg-indigo-50 text-indigo-500" />}
        {esAdmin && <KPICard label="En corrección"  value={kpis.personal_en_correccion}   icon={Wrench}     color="bg-orange-50 text-orange-500" />}
        <KPICard label="En historial"               value={kpis.personal_historial}       icon={Archive}    color="bg-gray-100 text-gray-400" />
      </div>

      {/* Alertas */}
      {kpis.documentos_por_vencer > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={17} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-700 leading-relaxed">
            Hay <strong>{kpis.documentos_por_vencer}</strong> documento(s) próximos a vencer en los próximos 60 días. Revisa <strong>Consulta de personal</strong>.
          </p>
        </div>
      )}

      {kpis.personal_pendiente > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Clock size={17} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[13px] text-blue-700 leading-relaxed">
            <strong>{kpis.personal_pendiente}</strong> persona(s) esperando aprobación individual. Ve a <strong>Consulta de personal</strong>.
          </p>
        </div>
      )}

      {esAdmin && kpis.grupos_pendientes > 0 && (
        <Link href="/dashboard/personal/grupos"
          className="block bg-indigo-50 border border-indigo-200 rounded-xl p-4 hover:bg-indigo-100 transition-colors">
          <div className="flex items-start gap-3">
            <UsersRound size={17} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-indigo-700 leading-relaxed">
              <strong>{kpis.grupos_pendientes}</strong> ingreso(s) grupal(es) pendiente(s) de revisión. Haz clic aquí para revisar.
            </p>
          </div>
        </Link>
      )}

      {esAdmin && kpis.personal_en_correccion > 0 && (
        <Link href="/dashboard/personal/correcciones"
          className="block bg-orange-50 border border-orange-200 rounded-xl p-4 hover:bg-orange-100 transition-colors">
          <div className="flex items-start gap-3">
            <Wrench size={17} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-orange-700 leading-relaxed">
              <strong>{kpis.personal_en_correccion}</strong> persona(s) en corrección, esperando re-revisión. Haz clic aquí para revisar.
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}
