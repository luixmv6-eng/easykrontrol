"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2, MinusCircle, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Save, Cpu, ShieldCheck,
} from "lucide-react";
import clsx from "clsx";
import {
  REQUISITOS_CHECKLIST,
  DOC_A_REQUISITO,
  TIPO_DOCUMENTO_LABEL,
  type EstadoRequisito,
  type ConceptoChecklist,
  type RevisionChecklist,
  type DocumentoPersonal,
} from "@/types";

interface PersonalParaChecklist {
  id: string;
  nombres: string;
  cedula: string;
  actividad_a_realizar?: string | null;
  vehiculo_id?: string | null;
  proveedor?: { nombre: string; nit: string } | null;
  documentos?: DocumentoPersonal[];
}

interface Props {
  persona: PersonalParaChecklist;
  adminNombre?: string;
  adminCargo?: string;
}

type EstadosMap = Record<string, EstadoRequisito>;
type ObsMap = Record<string, string>;

interface VerificacionResultado {
  verificados: number;
  total: number;
  resultados: { id: string; tipo: string; verificado: boolean; confianza: string; observacion: string }[];
}

function buildInitialEstados(
  docs: DocumentoPersonal[],
  tieneVehiculo: boolean
): EstadosMap {
  const docsVerificados = docs.filter((d) => d.verificado_auto);
  const docsSubidos = docs.map((d) => d.tipo);

  return Object.fromEntries(
    REQUISITOS_CHECKLIST.map((r) => {
      if (r.aplicaConVehiculo && !tieneVehiculo) return [r.key, "na" as EstadoRequisito];

      // Si el doc correspondiente fue verificado automáticamente → OK automático
      const reqKey = r.key;
      const tieneDocVerificado = docsVerificados.some((d) => DOC_A_REQUISITO[d.tipo] === reqKey);
      if (tieneDocVerificado) return [r.key, "ok" as EstadoRequisito];

      // req_soportes_vehiculos → ok solo si soat Y tecnicomecanica verificados
      if (r.key === "req_soportes_vehiculos") {
        const soatOk = docsVerificados.some((d) => d.tipo === "soat");
        const tecoOk = docsVerificados.some((d) => d.tipo === "tecnicomecanica");
        if (soatOk && tecoOk) return [r.key, "ok" as EstadoRequisito];
      }

      // Auto-detect por doc subido (sin verificar)
      if (r.key === "req_cedula" && docsSubidos.includes("cedula")) return [r.key, "ok" as EstadoRequisito];
      if (r.key === "req_licencia_conductor" && docsSubidos.includes("licencia")) return [r.key, "ok" as EstadoRequisito];
      if (r.key === "req_eps_arl_afp" && docsSubidos.includes("arl")) return [r.key, "ok" as EstadoRequisito];
      if (r.key === "req_soportes_vehiculos" && docsSubidos.includes("soat") && docsSubidos.includes("tecnicomecanica"))
        return [r.key, "ok" as EstadoRequisito];

      return [r.key, "pendiente" as EstadoRequisito];
    })
  );
}

function buildInitialObs(): ObsMap {
  return Object.fromEntries(REQUISITOS_CHECKLIST.map((r) => [r.obsKey, ""]));
}

function calcularConcepto(estados: EstadosMap): ConceptoChecklist {
  const vals = Object.values(estados);
  const activos = vals.filter((v) => v !== "na");
  if (activos.length === 0) return "pendiente";
  const pendientes = activos.filter((v) => v === "pendiente").length;
  if (pendientes === activos.length) return "pendiente";
  const noOk = activos.filter((v) => v !== "ok").length;
  if (noOk === 0) return "cumple";
  const okCount = activos.filter((v) => v === "ok").length;
  if (okCount / activos.length >= 0.5) return "cumple_parcial";
  return "no_cumple";
}

const CONCEPTO_LABELS: Record<ConceptoChecklist, string> = {
  cumple: "Cumple",
  cumple_parcial: "Cumple de Manera Parcial",
  no_cumple: "No Cumple",
  pendiente: "Sin revisar",
};

const CONCEPTO_BADGE: Record<ConceptoChecklist, string> = {
  cumple: "bg-green-100 text-green-700",
  cumple_parcial: "bg-yellow-100 text-yellow-700",
  no_cumple: "bg-red-100 text-red-700",
  pendiente: "bg-gray-100 text-gray-500",
};

export function ChecklistDocumentacion({ persona, adminNombre = "", adminCargo = "" }: Props) {
  const tieneVehiculo = !!persona.vehiculo_id;
  const docs = persona.documentos ?? [];

  const docsVerificados = docs.filter((d) => d.verificado_auto);
  const todosVerificados =
    docs.length > 0 &&
    docs.every((d) => d.verificado_auto) &&
    docsVerificados.every((d) => d.verificacion_confianza !== "baja");

  const [estados, setEstados] = useState<EstadosMap>(() => buildInitialEstados(docs, tieneVehiculo));
  const [observaciones, setObservaciones] = useState<ObsMap>(buildInitialObs);
  const [concepto, setConcepto] = useState<ConceptoChecklist>("pendiente");
  const [autoConcepto, setAutoConcepto] = useState(true);
  const [firmante1Nombre, setFirmante1Nombre] = useState(adminNombre);
  const [firmante1Cargo, setFirmante1Cargo] = useState(adminCargo);
  const [firmante2Nombre, setFirmante2Nombre] = useState("");
  const [firmante2Cargo, setFirmante2Cargo] = useState("");
  const [obsGenerales, setObsGenerales] = useState("");
  const [obsExpandidas, setObsExpandidas] = useState<Set<string>>(new Set());

  const [revision, setRevision] = useState<RevisionChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [verificacionResult, setVerificacionResult] = useState<VerificacionResultado | null>(null);
  const [error, setError] = useState("");
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    fetch(`/api/personal/${persona.id}/checklist`)
      .then((r) => r.json())
      .then(({ data }: { data: RevisionChecklist | null }) => {
        if (data) {
          setRevision(data);
          const newEstados: EstadosMap = {};
          const newObs: ObsMap = {};
          REQUISITOS_CHECKLIST.forEach((r) => {
            newEstados[r.key] = (data[r.key] as EstadoRequisito) ?? "pendiente";
            newObs[r.obsKey] = (data[r.obsKey as keyof RevisionChecklist] as string) ?? "";
          });
          setEstados(newEstados);
          setObservaciones(newObs);
          setConcepto(data.concepto ?? "pendiente");
          setAutoConcepto(false);
          setFirmante1Nombre(data.firmante1_nombre ?? adminNombre);
          setFirmante1Cargo(data.firmante1_cargo ?? adminCargo);
          setFirmante2Nombre(data.firmante2_nombre ?? "");
          setFirmante2Cargo(data.firmante2_cargo ?? "");
          setObsGenerales(data.observaciones_generales ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.id]);

  useEffect(() => {
    if (!autoConcepto) return;
    setConcepto(calcularConcepto(estados));
  }, [estados, autoConcepto]);

  const setEstado = (key: string, val: EstadoRequisito) => {
    setEstados((prev) => ({ ...prev, [key]: prev[key] === val ? "pendiente" : val }));
    setAutoConcepto(true);
  };

  const toggleObs = (key: string) => {
    setObsExpandidas((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleVerificar = async () => {
    setVerificando(true);
    setError("");
    setVerificacionResult(null);
    try {
      const res = await fetch(`/api/personal/${persona.id}/documentos/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error en verificación");

      const result: VerificacionResultado = json.data;
      setVerificacionResult(result);

      // Actualizar estados con resultados de verificación automática
      const newEstados = { ...estados };
      for (const r of result.resultados) {
        if (!r.verificado) continue;
        const reqKey = DOC_A_REQUISITO[r.tipo as keyof typeof DOC_A_REQUISITO];
        if (!reqKey) continue;

        if (r.tipo === "soat" || r.tipo === "tecnicomecanica") {
          const soatOk = result.resultados.find((x) => x.tipo === "soat")?.verificado;
          const tecoOk = result.resultados.find((x) => x.tipo === "tecnicomecanica")?.verificado;
          if (soatOk && tecoOk) newEstados["req_soportes_vehiculos"] = "ok";
        } else {
          newEstados[reqKey] = "ok";
        }
      }
      setEstados(newEstados);
      setAutoConcepto(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error en verificación automática");
    } finally {
      setVerificando(false);
    }
  };

  const handleGuardar = async () => {
    setSaving(true);
    setError("");
    setSavedOk(false);
    try {
      const body = {
        ...estados,
        ...observaciones,
        concepto,
        firmante1_nombre: firmante1Nombre,
        firmante1_cargo: firmante1Cargo,
        firmante2_nombre: firmante2Nombre,
        firmante2_cargo: firmante2Cargo,
        observaciones_generales: obsGenerales,
      };
      const res = await fetch(`/api/personal/${persona.id}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      setRevision(json.data);
      setSavedOk(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  const cumplidos = Object.values(estados).filter((v) => v === "ok").length;
  const totalActivos = REQUISITOS_CHECKLIST.filter(
    (r) => !(r.aplicaConVehiculo && !tieneVehiculo)
  ).length;
  const todoCumple = cumplidos === totalActivos;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-gray-400">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-[12px]">Cargando revisión...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-3">
      {/* Banner: todos los documentos verificados automáticamente */}
      {todosVerificados && todoCumple && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck size={20} className="text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-green-800">
              ✓ Todos los documentos han sido verificados correctamente
            </p>
            <p className="text-[12px] text-green-600 mt-0.5">
              La verificación automática confirmó que los documentos son válidos y corresponden
              al tipo esperado. El checklist se marcó automáticamente.
            </p>
          </div>
        </div>
      )}

      {/* Resumen verificación automática */}
      {verificacionResult && (
        <div className={clsx(
          "border rounded-xl p-4 space-y-2",
          verificacionResult.verificados === verificacionResult.total
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        )}>
          <p className="text-[12px] font-semibold text-gray-700 flex items-center gap-2">
            <Cpu size={13} className="text-ek-500" />
            Verificación automática: {verificacionResult.verificados}/{verificacionResult.total} documentos correctos
          </p>
          <div className="space-y-1">
            {verificacionResult.resultados.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-[11px]">
                <span className={r.verificado ? "text-green-600" : "text-red-500"}>
                  {r.verificado ? "✓" : "✗"}
                </span>
                <span className="text-gray-600">{TIPO_DOCUMENTO_LABEL[r.tipo as keyof typeof TIPO_DOCUMENTO_LABEL] ?? r.tipo}</span>
                <span className="text-gray-400">— {r.observacion}</span>
                <span className={clsx(
                  "ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium",
                  r.confianza === "alta" ? "bg-green-100 text-green-700"
                    : r.confianza === "media" ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                )}>
                  {r.confianza}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón verificación automática */}
      {docs.length > 0 && (
        <button
          type="button"
          onClick={handleVerificar}
          disabled={verificando}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-ek-200 text-ek-700 rounded-xl text-[13px] font-semibold hover:bg-ek-50 transition-colors disabled:opacity-60"
        >
          {verificando ? (
            <><Loader2 size={14} className="animate-spin" /> Verificando documentos...</>
          ) : (
            <><Cpu size={14} /> Verificar documentos automáticamente</>
          )}
        </button>
      )}
      {docs.length === 0 && (
        <div className="text-[12px] text-gray-400 bg-gray-50 rounded-lg p-3 text-center">
          No hay documentos cargados para verificar.
        </div>
      )}

      {/* Encabezado del formulario oficial */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              Código: F-P-ECC-001-05 · Edición: 02
            </p>
            <p className="text-[11px] text-gray-500">Proceso: Gestionar Control Contratista</p>
          </div>
          {revision && (
            <span className={clsx("text-[11px] font-semibold px-2.5 py-1 rounded-full", CONCEPTO_BADGE[revision.concepto])}>
              {CONCEPTO_LABELS[revision.concepto]}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div>
            <span className="text-gray-400">Razón Social:</span>{" "}
            <span className="font-medium text-gray-700">{persona.proveedor?.nombre ?? "—"}</span>
          </div>
          <div>
            <span className="text-gray-400">NIT:</span>{" "}
            <span className="font-medium text-gray-700">{persona.proveedor?.nit ?? "—"}</span>
          </div>
          <div>
            <span className="text-gray-400">Actividad:</span>{" "}
            <span className="font-medium text-gray-700">{persona.actividad_a_realizar ?? "—"}</span>
          </div>
          <div>
            <span className="text-gray-400">Fecha revisión:</span>{" "}
            <span className="font-medium text-gray-700">
              {revision
                ? new Date(revision.fecha_revision).toLocaleDateString("es-CO")
                : "Sin revisar"}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-300",
              todoCumple ? "bg-green-400" : "bg-ek-400"
            )}
            style={{ width: `${totalActivos > 0 ? (cumplidos / totalActivos) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[11px] text-gray-500 shrink-0">{cumplidos}/{totalActivos} OK</span>
      </div>

      {/* Tabla de requisitos */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] bg-gray-50 border-b border-gray-200 px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide gap-2">
          <span>Requisito</span>
          <span className="w-8 text-center">OK</span>
          <span className="w-8 text-center">N/A</span>
          <span className="w-14 text-center">Obs.</span>
        </div>

        {REQUISITOS_CHECKLIST.map((req) => {
          const estado = estados[req.key];
          const esAutoNA = req.aplicaConVehiculo && !tieneVehiculo;
          const obsExpandida = obsExpandidas.has(req.key);
          const obsVal = observaciones[req.obsKey];

          // Buscar si hay doc verificado automáticamente para este requisito
          const docVerificado = docs.find(
            (d) => d.verificado_auto && DOC_A_REQUISITO[d.tipo] === req.key
          );

          return (
            <div
              key={req.key}
              className={clsx(
                "border-b border-gray-100 last:border-0",
                esAutoNA && "opacity-50"
              )}
            >
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center px-3 py-2.5 gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] text-gray-700 leading-snug">{req.label}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {esAutoNA && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        Sin vehículo
                      </span>
                    )}
                    {docVerificado && (
                      <span className="text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Cpu size={9} /> Verificado · {docVerificado.verificacion_confianza}
                      </span>
                    )}
                  </div>
                  {obsVal && !obsExpandida && (
                    <p className="text-[11px] text-gray-400 italic mt-0.5 truncate">
                      &ldquo;{obsVal}&rdquo;
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={esAutoNA}
                  onClick={() => setEstado(req.key, "ok")}
                  className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    estado === "ok"
                      ? "bg-green-100 text-green-600"
                      : "text-gray-300 hover:text-green-400 hover:bg-green-50"
                  )}
                >
                  <CheckCircle2 size={16} />
                </button>

                <button
                  type="button"
                  disabled={esAutoNA}
                  onClick={() => setEstado(req.key, "na")}
                  className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    estado === "na"
                      ? "bg-gray-200 text-gray-500"
                      : "text-gray-300 hover:text-gray-400 hover:bg-gray-50"
                  )}
                >
                  <MinusCircle size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => toggleObs(req.key)}
                  className="w-14 text-[11px] text-gray-400 hover:text-ek-500 flex items-center justify-center gap-0.5 transition-colors"
                >
                  {obsExpandida ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Obs.
                </button>
              </div>

              {obsExpandida && (
                <div className="px-3 pb-2.5">
                  <input
                    type="text"
                    value={obsVal}
                    onChange={(e) =>
                      setObservaciones((prev) => ({ ...prev, [req.obsKey]: e.target.value }))
                    }
                    placeholder="Observación sobre este requisito..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Concepto final */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide">Concepto final</p>
        <div className="flex gap-2">
          {(
            [
              { val: "cumple" as const, label: "Cumple", active: "border-green-400 bg-green-50 text-green-700" },
              { val: "cumple_parcial" as const, label: "Cumple Parcial", active: "border-yellow-400 bg-yellow-50 text-yellow-700" },
              { val: "no_cumple" as const, label: "No Cumple", active: "border-red-400 bg-red-50 text-red-700" },
            ] as const
          ).map(({ val, label, active }) => (
            <button
              key={val}
              type="button"
              onClick={() => { setConcepto(val); setAutoConcepto(false); }}
              className={clsx(
                "flex-1 py-2 rounded-lg text-[12px] font-semibold border-2 transition-colors",
                concepto === val ? active : "border-gray-200 text-gray-400 hover:border-gray-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {autoConcepto && concepto !== "pendiente" && (
          <p className="text-[11px] text-gray-400">Calculado automáticamente · Puedes ajustarlo</p>
        )}
      </div>

      {/* Firmantes */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide">Revisa Gestión Contratista</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <input type="text" value={firmante1Nombre} onChange={(e) => setFirmante1Nombre(e.target.value)}
              placeholder="Nombre firmante 1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
            <input type="text" value={firmante1Cargo} onChange={(e) => setFirmante1Cargo(e.target.value)}
              placeholder="Cargo firmante 1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
          </div>
          <div className="space-y-2">
            <input type="text" value={firmante2Nombre} onChange={(e) => setFirmante2Nombre(e.target.value)}
              placeholder="Nombre firmante 2"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
            <input type="text" value={firmante2Cargo} onChange={(e) => setFirmante2Cargo(e.target.value)}
              placeholder="Cargo firmante 2"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
          </div>
        </div>
      </div>

      {/* Observaciones generales */}
      <div>
        <label className="block text-[12px] font-medium text-gray-600 mb-1">Observaciones generales</label>
        <textarea value={obsGenerales} onChange={(e) => setObsGenerales(e.target.value)} rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400 resize-none" />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-[12px] text-red-600">{error}</p>
        </div>
      )}
      {savedOk && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle2 size={14} className="text-green-500 shrink-0" />
          <p className="text-[12px] text-green-600">Revisión guardada correctamente.</p>
        </div>
      )}

      <button type="button" onClick={handleGuardar} disabled={saving}
        className="w-full py-2.5 bg-ek-500 text-white rounded-xl text-[13px] font-semibold hover:bg-ek-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
        {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><Save size={14} /> Guardar revisión</>}
      </button>
    </div>
  );
}
