"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, FileText, Building2, Users, Send, Loader2 } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import type { GrupoIngreso, Personal, TipoDocumento } from "@/types";

const TIPO_LABELS: Record<TipoDocumento, string> = {
  cedula: "Cédula", licencia: "Licencia", arl: "ARL", soat: "SOAT", tecnicomecanica: "Tecnomecánica",
};

type Decision = { accion: "aprobar" | "rechazar"; motivo: string };

interface Props {
  grupos: GrupoIngreso[];
}

export function GruposIngresoClient({ grupos: initialGrupos }: Props) {
  const [grupos, setGrupos] = useState<GrupoIngreso[]>(initialGrupos);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [decisiones, setDecisiones] = useState<Record<string, Record<string, Decision>>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const supabase = createClient();

  const pendientes = grupos.filter((g) => g.estado === "pendiente");
  const completados = grupos.filter((g) => g.estado !== "pendiente");

  const setDecision = (grupoId: string, personalId: string, d: Partial<Decision>) => {
    setDecisiones((prev) => {
      const existing = prev[grupoId]?.[personalId] ?? { accion: "aprobar" as const, motivo: "" };
      return {
        ...prev,
        [grupoId]: { ...(prev[grupoId] ?? {}), [personalId]: { ...existing, ...d } },
      };
    });
  };

  const todasDecididas = (g: GrupoIngreso) => {
    const dec = decisiones[g.id] ?? {};
    return (g.personas ?? []).every((p) => dec[p.id]?.accion);
  };

  const handleSubmitGrupo = async (grupo: GrupoIngreso) => {
    const dec = decisiones[grupo.id] ?? {};
    setLoading(grupo.id);
    try {
      const payload = (grupo.personas ?? []).map((p) => ({
        personalId: p.id,
        accion: dec[p.id]?.accion ?? "aprobar",
        motivo: dec[p.id]?.motivo ?? undefined,
      }));

      const res = await fetch(`/api/grupos/${grupo.id}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisiones: payload }),
      });

      if (res.ok) {
        setDone((prev) => new Set(Array.from(prev).concat(grupo.id)));
        setGrupos((prev) => prev.map((g) => g.id === grupo.id ? { ...g, estado: "completado" } : g));
      }
    } finally { setLoading(null); }
  };

  const verDoc = async (url: string) => {
    if (url.startsWith("http")) { window.open(url, "_blank"); return; }
    const { data } = await supabase.storage.from("documentos").createSignedUrl(url, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const PersonaCard = ({ persona, grupoId }: { persona: Personal; grupoId: string }) => {
    const dec = decisiones[grupoId]?.[persona.id];
    const tiposRequeridos: TipoDocumento[] = ["cedula", "licencia", "arl"];
    const tiposVeh: TipoDocumento[] = ["soat", "tecnicomecanica"];
    const todos = [...tiposRequeridos, ...(persona.vehiculo_id ? tiposVeh : [])];
    const cargados = todos.filter((t) => persona.documentos?.some((d) => d.tipo === t)).length;

    return (
      <div className={clsx("border rounded-xl p-4 space-y-3", dec?.accion === "aprobar" ? "border-green-200 bg-green-50/40" : dec?.accion === "rechazar" ? "border-red-200 bg-red-50/40" : "border-gray-200 bg-white")}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[14px] font-semibold text-gray-800">{persona.nombres}</p>
            <p className="text-[12px] text-gray-500">C.C. {persona.cedula}{persona.vehiculo && ` · 🚗 ${persona.vehiculo.placa}`}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{cargados}/{todos.length} documentos cargados</p>
          </div>
          {/* Botones decisión */}
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setDecision(grupoId, persona.id, { accion: "aprobar" })}
              className={clsx("flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                dec?.accion === "aprobar" ? "bg-green-500 text-white border-green-500" : "border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-300"
              )}>
              <CheckCircle size={13} /> Aprobar
            </button>
            <button onClick={() => setDecision(grupoId, persona.id, { accion: "rechazar" })}
              className={clsx("flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                dec?.accion === "rechazar" ? "bg-red-500 text-white border-red-500" : "border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-300"
              )}>
              <XCircle size={13} /> Rechazar
            </button>
          </div>
        </div>

        {/* Motivo si rechazado */}
        {dec?.accion === "rechazar" && (
          <textarea value={dec.motivo ?? ""} onChange={(e) => setDecision(grupoId, persona.id, { motivo: e.target.value })}
            placeholder="Motivo del rechazo (obligatorio)..." rows={2}
            className="w-full border border-red-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-red-300 resize-none bg-white" />
        )}

        {/* Documentos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {todos.map((tipo) => {
            const doc = persona.documentos?.find((d) => d.tipo === tipo);
            return (
              <div key={tipo} className={clsx("rounded-lg border px-2.5 py-2 flex items-center justify-between gap-1",
                doc ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              )}>
                <span className={clsx("text-[11px] font-medium", doc ? "text-green-700" : "text-red-500")}>
                  {doc ? "✓" : "✗"} {TIPO_LABELS[tipo]}
                </span>
                {doc && (
                  <button onClick={() => verDoc(doc.url)} className="shrink-0 text-[10px] text-gray-500 hover:text-gray-700 underline">
                    Ver
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const GrupoCard = ({ grupo }: { grupo: GrupoIngreso }) => {
    const isOpen = expanded === grupo.id;
    const personas = grupo.personas ?? [];
    const dec = decisiones[grupo.id] ?? {};
    const nDecididas = Object.values(dec).filter((d) => d.accion).length;
    const isDone = Array.from(done).includes(grupo.id) || grupo.estado === "completado";

    return (
      <div className={clsx("bg-white rounded-xl border shadow-sm overflow-hidden", isDone ? "border-green-200" : "border-gray-100")}>
        <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setExpanded(isOpen ? null : grupo.id)}>
          <div className="flex items-start gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", isDone ? "bg-green-50" : "bg-amber-50")}>
              <Users size={17} className={isDone ? "text-green-500" : "text-amber-500"} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-gray-800">{grupo.nombre}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Building2 size={11} className="text-gray-400" />
                <span className="text-[12px] text-gray-500">{grupo.proveedor?.nombre ?? "-"}</span>
                <span className="text-[11px] text-gray-300">·</span>
                <span className="text-[12px] text-gray-500">{personas.length} persona(s)</span>
                <span className="text-[11px] text-gray-300">·</span>
                <span className="text-[11px] text-gray-400">{new Date(grupo.created_at).toLocaleDateString("es-CO")}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDone ? (
              <span className="text-[11px] font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Completado</span>
            ) : (
              <span className="text-[11px] text-gray-400">{nDecididas}/{personas.length} decididos</span>
            )}
            {isOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </div>
        </div>

        {isOpen && !isDone && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Personal del grupo</p>
              <div className="flex gap-2">
                <button onClick={() => personas.forEach((p) => setDecision(grupo.id, p.id, { accion: "aprobar" }))}
                  className="text-[12px] text-green-600 hover:text-green-700 font-medium">Aprobar todos</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => personas.forEach((p) => setDecision(grupo.id, p.id, { accion: "rechazar" }))}
                  className="text-[12px] text-red-500 hover:text-red-600 font-medium">Rechazar todos</button>
              </div>
            </div>

            <div className="space-y-3">
              {personas.map((p) => <PersonaCard key={p.id} persona={p} grupoId={grupo.id} />)}
            </div>

            {todasDecididas(grupo) && (
              <div className="pt-2">
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                  <Send size={14} className="text-blue-500 shrink-0" />
                  <p className="text-[12px] text-blue-700">
                    Todas las decisiones tomadas. Al confirmar se actualizarán los estados y se enviará un reporte por correo al proveedor.
                  </p>
                </div>
                <button onClick={() => handleSubmitGrupo(grupo)} disabled={loading === grupo.id}
                  className="w-full py-2.5 bg-ek-500 text-white rounded-lg text-[13px] font-semibold hover:bg-ek-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading === grupo.id ? <><Loader2 size={14} className="animate-spin" /> Procesando...</> : "Confirmar decisiones y enviar reporte"}
                </button>
              </div>
            )}
          </div>
        )}

        {isOpen && isDone && (
          <div className="border-t border-gray-100 px-5 py-4">
            <div className="space-y-2">
              {personas.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-[13px] font-semibold text-gray-700">{p.nombres}</p>
                    <p className="text-[11px] text-gray-400">C.C. {p.cedula}</p>
                  </div>
                  <span className={clsx("text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    p.estado === "aprobado" ? "bg-green-100 text-green-700" : p.estado === "rechazado" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  )}>{p.estado}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Ingresos grupales</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">{pendientes.length} grupo(s) pendiente(s) de revisión</p>
      </div>

      {pendientes.length > 0 && (
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Pendientes de revisión</p>
          {pendientes.map((g) => <GrupoCard key={g.id} grupo={g} />)}
        </div>
      )}

      {pendientes.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center space-y-2">
          <CheckCircle size={32} className="text-green-400 mx-auto" />
          <p className="text-[14px] font-semibold text-gray-600">Sin grupos pendientes</p>
          <p className="text-[13px] text-gray-400">Todos los ingresos grupales han sido revisados.</p>
        </div>
      )}

      {completados.length > 0 && (
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Completados</p>
          {completados.map((g) => <GrupoCard key={g.id} grupo={g} />)}
        </div>
      )}
    </div>
  );
}
