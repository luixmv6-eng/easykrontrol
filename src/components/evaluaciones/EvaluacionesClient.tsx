"use client";

import { useState } from "react";
import { Plus, Star, ChevronDown, ChevronUp, CheckCircle, ClipboardList, Building2, Phone, Mail, AlertCircle } from "lucide-react";
import clsx from "clsx";
import type { Evaluacion, CriterioEvaluacion, Proveedor } from "@/types";

type ProveedorResumen = Pick<Proveedor, "id" | "nombre" | "nit" | "email" | "telefono" | "estado">;

interface Props {
  evaluaciones: Evaluacion[];
  proveedores: ProveedorResumen[];
  criterios: CriterioEvaluacion[];
  rol: string;
}

function getPuntajeColor(p: number) {
  if (p >= 80) return "text-green-600 bg-green-50";
  if (p >= 60) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

export function EvaluacionesClient({ evaluaciones, proveedores, criterios, rol }: Props) {
  const [lista, setLista] = useState<Evaluacion[]>(evaluaciones);
  const [showForm, setShowForm] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Formulario nueva evaluación
  const [proveedorId, setProveedorId] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [scores, setScores] = useState<Record<string, { puntaje: string; observacion: string }>>(
    Object.fromEntries(criterios.map((c) => [c.id, { puntaje: "", observacion: "" }]))
  );

  const proveedorSeleccionado = proveedores.find((p) => p.id === proveedorId) ?? null;

  const calcularTotal = () => {
    const totalPeso = criterios.reduce((a, c) => a + c.peso, 0);
    if (totalPeso === 0) return 0;
    return criterios.reduce((acc, c) => {
      const val = parseFloat(scores[c.id]?.puntaje ?? "0") || 0;
      return acc + (val * c.peso) / totalPeso;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!proveedorId || !periodo.trim()) {
      setError("Proveedor y periodo son obligatorios.");
      return;
    }

    const detalles = criterios.map((c) => ({
      criterio_id: c.id,
      puntaje: parseFloat(scores[c.id]?.puntaje ?? "0") || 0,
      peso: c.peso,
      observacion: scores[c.id]?.observacion || null,
    }));

    const invalidos = detalles.filter((d) => d.puntaje < 0 || d.puntaje > 100);
    if (invalidos.length > 0) {
      setError("Los puntajes deben estar entre 0 y 100.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/evaluaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedor_id: proveedorId, periodo, observaciones, detalles }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");

      // Recargar la página para obtener los datos actualizados con joins
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  };

  const totalPreview = calcularTotal();

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Evaluaciones de proveedores</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">{lista.length} evaluación(es) registrada(s)</p>
        </div>
        {rol === "admin" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-ek-500 text-white rounded-lg text-[13px] font-semibold hover:bg-ek-600 transition-colors"
          >
            <Plus size={15} />
            Nueva evaluación
          </button>
        )}
      </div>

      {/* Indicadores de conexión BD — útil para verificar que el sistema funciona */}
      <div className="flex flex-wrap gap-2">
        <span className={clsx(
          "flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium",
          proveedores.length > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
        )}>
          <Building2 size={12} />
          {proveedores.length > 0
            ? `${proveedores.length} proveedor(es) activo(s) en BD`
            : "Sin proveedores activos en BD"}
        </span>
        <span className={clsx(
          "flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium",
          criterios.length > 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"
        )}>
          <CheckCircle size={12} />
          {criterios.length > 0
            ? `${criterios.length} criterio(s) de evaluación cargado(s)`
            : "Sin criterios de evaluación"}
        </span>
      </div>

      {/* Formulario nueva evaluación */}
      {showForm && rol === "admin" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-[14px] font-semibold text-gray-700 mb-4">Nueva evaluación</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">
                  Empresa / Proveedor *
                </label>
                {proveedores.length === 0 ? (
                  <div className="flex items-center gap-2 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-[12px] text-amber-700">
                    <AlertCircle size={14} />
                    No hay proveedores activos registrados en el sistema.
                  </div>
                ) : (
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
                    required
                  >
                    <option value="">— Seleccionar empresa —</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.nit ? `· NIT ${p.nit}` : ""}
                      </option>
                    ))}
                  </select>
                )}

                {/* Tarjeta de datos del proveedor seleccionado */}
                {proveedorSeleccionado && (
                  <div className="mt-2 border border-ek-200 bg-ek-50 rounded-lg px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 size={13} className="text-ek-500 shrink-0" />
                      <span className="text-[13px] font-semibold text-gray-800">
                        {proveedorSeleccionado.nombre}
                      </span>
                    </div>
                    {proveedorSeleccionado.nit && (
                      <p className="text-[12px] text-gray-500 pl-5">NIT: {proveedorSeleccionado.nit}</p>
                    )}
                    {proveedorSeleccionado.email && (
                      <div className="flex items-center gap-1.5 pl-5">
                        <Mail size={11} className="text-gray-400" />
                        <span className="text-[12px] text-gray-500">{proveedorSeleccionado.email}</span>
                      </div>
                    )}
                    {proveedorSeleccionado.telefono && (
                      <div className="flex items-center gap-1.5 pl-5">
                        <Phone size={11} className="text-gray-400" />
                        <span className="text-[12px] text-gray-500">{proveedorSeleccionado.telefono}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Periodo *</label>
                <input
                  type="text"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  placeholder="Ej: Q1-2026, Enero 2026"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
                  required
                />
              </div>
            </div>

            {/* Criterios */}
            <div>
              <p className="text-[12px] font-semibold text-gray-500 mb-2">
                Puntaje por criterio (0 – 100)
              </p>
              <div className="space-y-3">
                {criterios.map((c) => (
                  <div key={c.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[13px] font-medium text-gray-700">{c.nombre}</p>
                        {c.descripcion && (
                          <p className="text-[11px] text-gray-400">{c.descripcion}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        Peso: {c.peso}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={scores[c.id]?.puntaje ?? ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [c.id]: { ...prev[c.id], puntaje: e.target.value },
                          }))
                        }
                        placeholder="0-100"
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-[13px] text-center focus:outline-none focus:ring-2 focus:ring-ek-400"
                      />
                      <input
                        type="text"
                        value={scores[c.id]?.observacion ?? ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [c.id]: { ...prev[c.id], observacion: e.target.value },
                          }))
                        }
                        placeholder="Observación (opcional)"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total preview */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <span className="text-[13px] font-medium text-gray-600">Puntaje total estimado</span>
              <span className={clsx("text-[20px] font-bold px-3 py-1 rounded-lg", getPuntajeColor(totalPreview))}>
                {totalPreview.toFixed(1)}
              </span>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Observaciones generales</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400 resize-none"
              />
            </div>

            {error && (
              <p className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-ek-500 text-white rounded-lg text-[13px] font-semibold hover:bg-ek-600 transition-colors disabled:opacity-60"
              >
                {loading ? "Guardando..." : "Guardar evaluación"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de evaluaciones */}
      <div className="space-y-3">
        {lista.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <ClipboardList size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-[13px] text-gray-400">No hay evaluaciones registradas.</p>
          </div>
        )}
        {lista.map((ev) => {
          const isOpen = expandido === ev.id;
          const puntaje = ev.puntaje_total ?? 0;
          return (
            <div key={ev.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandido(isOpen ? null : ev.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-ek-50 rounded-lg flex items-center justify-center">
                    <Star size={14} className="text-ek-500" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-gray-800">
                      {ev.proveedor?.nombre ?? "Proveedor"}
                    </p>
                    <p className="text-[12px] text-gray-400">
                      Periodo: {ev.periodo} · {new Date(ev.created_at).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx("text-[16px] font-bold px-3 py-1 rounded-lg", getPuntajeColor(puntaje))}>
                    {puntaje.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle size={11} /> {ev.estado}
                  </span>
                  {isOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                  {ev.detalles && ev.detalles.length > 0 && (
                    <div>
                      <p className="text-[12px] font-semibold text-gray-500 mb-2">Detalle por criterio</p>
                      <div className="space-y-2">
                        {ev.detalles.map((d) => (
                          <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-[12px] font-medium text-gray-700">
                                {d.criterio?.nombre ?? "Criterio"}
                              </p>
                              {d.observacion && (
                                <p className="text-[11px] text-gray-400">{d.observacion}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-gray-400">
                                Peso: {d.criterio?.peso ?? 0}%
                              </span>
                              <span className={clsx("text-[13px] font-bold px-2 py-0.5 rounded", getPuntajeColor(d.puntaje))}>
                                {d.puntaje}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {ev.observaciones && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[12px] font-medium text-gray-600 mb-0.5">Observaciones</p>
                      <p className="text-[12px] text-gray-500">{ev.observaciones}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
