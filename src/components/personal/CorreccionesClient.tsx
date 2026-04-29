"use client";

import { useState } from "react";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, FileText, Wrench, Building2 } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import type { Personal, Proveedor, TipoDocumento } from "@/types";

const TIPO_LABELS: Record<TipoDocumento, string> = {
  cedula: "Cédula", licencia: "Licencia", arl: "ARL", soat: "SOAT", tecnicomecanica: "Tecnomecánica",
};

interface Props {
  personal: Personal[];
}

export function CorreccionesClient({ personal: initialPersonal }: Props) {
  const [lista, setLista] = useState<Personal[]>(initialPersonal);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: string; accion: "aprobar" | "rechazar" } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const supabase = createClient();

  const verDoc = async (url: string) => {
    if (url.startsWith("http")) { window.open(url, "_blank"); return; }
    const { data } = await supabase.storage.from("documentos").createSignedUrl(url, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  // Agrupar por empresa
  const porEmpresa = lista.reduce<Record<string, { proveedor: Proveedor; personas: Personal[] }>>((acc, p) => {
    const id = p.proveedor_id;
    if (!acc[id]) acc[id] = { proveedor: p.proveedor!, personas: [] };
    acc[id].personas.push(p);
    return acc;
  }, {});

  const handleAprobarRechazar = async () => {
    if (!modal) return;
    setLoadingId(modal.id);
    try {
      const res = await fetch(`/api/personal/${modal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: modal.accion === "aprobar" ? "aprobado" : "rechazado",
          motivo_rechazo: modal.accion === "rechazar" ? motivo : undefined,
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setLista((prev) => prev.filter((p) => p.id !== data.id));
      }
    } finally { setModal(null); setMotivo(""); setLoadingId(null); }
  };

  if (lista.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Personal en corrección</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Personal rechazado que el proveedor ha corregido y re-enviado.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center space-y-2">
          <CheckCircle size={32} className="text-green-400 mx-auto" />
          <p className="text-[14px] font-semibold text-gray-600">Sin correcciones pendientes</p>
          <p className="text-[13px] text-gray-400">No hay personal en estado de corrección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Personal en corrección</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">{lista.length} persona(s) re-enviadas por proveedores para revisión</p>
      </div>

      {Object.entries(porEmpresa).map(([provId, { proveedor, personas }]) => (
        <div key={provId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header empresa */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Building2 size={15} className="text-orange-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800">{proveedor.nombre}</p>
              <p className="text-[11px] text-gray-400">NIT {proveedor.nit} · {personas.length} persona(s) en corrección</p>
            </div>
          </div>

          {personas.map((p) => {
            const isOpen = expanded === p.id;
            const tiposP: TipoDocumento[] = ["cedula", "licencia", "arl"];
            const tiposV: TipoDocumento[] = ["soat", "tecnicomecanica"];
            const todos = [...tiposP, ...(p.vehiculo_id ? tiposV : [])];
            const cargados = todos.filter((t) => p.documentos?.some((d) => d.tipo === t)).length;

            return (
              <div key={p.id} className="border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : p.id)}>
                  <div className="flex items-center gap-2">
                    <Wrench size={14} className="text-orange-500 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800">{p.nombres}</p>
                      <p className="text-[11px] text-gray-400">C.C. {p.cedula} · {cargados}/{todos.length} docs cargados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Pendiente revisión</span>
                    {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="px-5 pb-4 space-y-3 bg-gray-50/50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
                      {todos.map((tipo) => {
                        const doc = p.documentos?.find((d) => d.tipo === tipo);
                        return (
                          <div key={tipo} className={clsx("rounded-lg border p-2.5 flex items-center justify-between gap-1",
                            doc ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                          )}>
                            <span className={clsx("text-[11px] font-medium", doc ? "text-green-700" : "text-red-500")}>
                              {doc ? "✓" : "✗"} {TIPO_LABELS[tipo]}
                            </span>
                            {doc && (
                              <button onClick={() => verDoc(doc.url)} className="text-[10px] text-gray-500 hover:text-gray-700 underline flex items-center gap-0.5">
                                <FileText size={10} /> Ver
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button disabled={!!loadingId} onClick={() => setModal({ id: p.id, accion: "aprobar" })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[12px] font-medium hover:bg-green-600 transition-colors disabled:opacity-50">
                        <CheckCircle size={13} /> Aprobar
                      </button>
                      <button disabled={!!loadingId} onClick={() => { setModal({ id: p.id, accion: "rechazar" }); setMotivo(""); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-[12px] font-medium hover:bg-red-600 transition-colors disabled:opacity-50">
                        <XCircle size={13} /> Rechazar de nuevo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-[15px] font-bold text-gray-800">
              {modal.accion === "aprobar" ? "Confirmar aprobación" : "Rechazar corrección"}
            </h3>
            <p className="text-[13px] text-gray-500">
              {modal.accion === "aprobar" ? "¿Aprobar el ingreso con los documentos corregidos?" : "Indica el motivo del rechazo."}
            </p>
            {modal.accion === "rechazar" && (
              <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo del rechazo..." rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            )}
            <div className="flex gap-3">
              <button onClick={() => { setModal(null); setMotivo(""); }} className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAprobarRechazar} disabled={modal.accion === "rechazar" && !motivo.trim()}
                className={clsx("flex-1 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50",
                  modal.accion === "aprobar" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                )}>
                {modal.accion === "aprobar" ? "Aprobar" : "Rechazar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
