import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, AlertTriangle, UsersRound, Wrench } from "lucide-react";
import type { DashboardKPIs } from "@/types";
import { ChartBarEstados } from "@/components/dashboard/ChartBarEstados";
import { ChartAreaMes } from "@/components/dashboard/ChartAreaMes";
import { KPICardsGrid } from "@/components/dashboard/KPICardsGrid";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, empresa_grupo")
    .eq("id", session.user.id)
    .single();
  const esAdmin = profile?.rol === "admin";
  const empresaGrupo = profile?.empresa_grupo ?? null;

  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString();

  let kpisData: Omit<DashboardKPIs, "actividades_distintas"> | null;
  let mesData: { created_at: string }[] | null;
  let actividadesData: { actividad_a_realizar: string | null }[] | null;

  if (esAdmin && empresaGrupo) {
    // Admin con empresa específica: calcular KPIs filtrando por sus proveedores
    const { data: pData } = await supabase
      .from("proveedores")
      .select("id")
      .eq("empresa_grupo", empresaGrupo);
    const pIds = (pData ?? []).map((p: { id: string }) => p.id);

    if (pIds.length === 0) {
      kpisData = {
        total_personal: 0, personal_aprobado: 0, personal_pendiente: 0, personal_rechazado: 0,
        personal_en_correccion: 0, grupos_pendientes: 0, vehiculos_activos: 0,
        proveedores_activos: 0, documentos_por_vencer: 0, personal_historial: 0,
      };
      mesData = [];
      actividadesData = [];
    } else {
      const [
        totRes, aprobRes, pendRes, rechRes, corrRes,
        gruposRes, vehRes, provRes, docsRes, histRes,
        mesRes, activRes,
      ] = await Promise.all([
        supabase.from("personal").select("*", { count: "exact", head: true }).in("proveedor_id", pIds).neq("estado", "inactivo"),
        supabase.from("personal").select("*", { count: "exact", head: true }).in("proveedor_id", pIds).eq("estado", "aprobado"),
        supabase.from("personal").select("*", { count: "exact", head: true }).in("proveedor_id", pIds).eq("estado", "pendiente").eq("en_correccion", false).is("grupo_id", null),
        supabase.from("personal").select("*", { count: "exact", head: true }).in("proveedor_id", pIds).eq("estado", "rechazado"),
        supabase.from("personal").select("*", { count: "exact", head: true }).in("proveedor_id", pIds).eq("en_correccion", true),
        supabase.from("grupos_ingreso").select("*", { count: "exact", head: true }).in("proveedor_id", pIds).eq("estado", "pendiente"),
        supabase.from("vehiculos").select("*", { count: "exact", head: true }).in("proveedor_id", pIds).eq("estado", "activo"),
        supabase.from("proveedores").select("*", { count: "exact", head: true }).eq("empresa_grupo", empresaGrupo).eq("estado", "activo"),
        supabase.from("documentos_por_vencer").select("*", { count: "exact", head: true }).in("proveedor_id", pIds),
        supabase.from("personal").select("*", { count: "exact", head: true }).in("proveedor_id", pIds).eq("estado", "inactivo"),
        supabase.from("personal").select("created_at").in("proveedor_id", pIds).gte("created_at", sixMonthsAgo),
        supabase.from("personal").select("actividad_a_realizar").in("proveedor_id", pIds).neq("estado", "inactivo").not("actividad_a_realizar", "is", null),
      ]);
      kpisData = {
        total_personal: totRes.count ?? 0,
        personal_aprobado: aprobRes.count ?? 0,
        personal_pendiente: pendRes.count ?? 0,
        personal_rechazado: rechRes.count ?? 0,
        personal_en_correccion: corrRes.count ?? 0,
        grupos_pendientes: gruposRes.count ?? 0,
        vehiculos_activos: vehRes.count ?? 0,
        proveedores_activos: provRes.count ?? 0,
        documentos_por_vencer: docsRes.count ?? 0,
        personal_historial: histRes.count ?? 0,
      };
      mesData = mesRes.data ?? [];
      actividadesData = activRes.data ?? [];
    }
  } else {
    // Super admin (empresa_grupo=null) o proveedor: comportamiento existente
    const [kpisRes, mesRes, activRes] = await Promise.all([
      supabase.rpc("get_dashboard_kpis"),
      supabase.from("personal").select("created_at").gte("created_at", sixMonthsAgo),
      supabase.from("personal").select("actividad_a_realizar").neq("estado", "inactivo").not("actividad_a_realizar", "is", null),
    ]);
    kpisData = kpisRes.data;
    mesData = mesRes.data;
    actividadesData = activRes.data;
  }

  const actividadesDistintas = new Set(
    (actividadesData ?? []).map((p) => p.actividad_a_realizar).filter(Boolean)
  ).size;

  const kpis: DashboardKPIs = {
    ...(kpisData ?? {
      total_personal: 0, personal_aprobado: 0, personal_pendiente: 0, personal_rechazado: 0,
      personal_en_correccion: 0, grupos_pendientes: 0, vehiculos_activos: 0, proveedores_activos: 0,
      documentos_por_vencer: 0, personal_historial: 0,
    }),
    actividades_distintas: actividadesDistintas,
  };

  const datosMes = (() => {
    const conteo: Record<string, number> = {};
    const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    for (const p of mesData ?? []) {
      const d = new Date(p.created_at);
      const key = `${MESES[d.getMonth()]} ${d.getFullYear()}`;
      conteo[key] = (conteo[key] ?? 0) + 1;
    }
    return Object.entries(conteo).map(([mes, total]) => ({ mes, total }));
  })();

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Panel de control</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Resumen general del sistema</p>
      </div>

      <KPICardsGrid kpis={kpis} esAdmin={esAdmin} />

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Estado del personal
          </p>
          <ChartBarEstados
            aprobado={kpis.personal_aprobado}
            pendiente={kpis.personal_pendiente}
            rechazado={kpis.personal_rechazado}
            inactivo={kpis.personal_historial}
          />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Registros últimos 6 meses
          </p>
          <ChartAreaMes data={datosMes} />
        </div>
      </div>
    </div>
  );
}
