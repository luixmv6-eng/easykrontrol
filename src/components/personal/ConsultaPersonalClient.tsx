"use client";

import { useState } from "react";
import {
  CheckCircle, XCircle, AlertTriangle, FileText,
  Download, ChevronDown, ChevronUp, Search, Filter, Clock, Archive, Wrench,
  FileSpreadsheet, QrCode, Square, CheckSquare,
} from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import type { Personal, Proveedor, TipoDocumento } from "@/types";

const TIPO_LABELS: Record<TipoDocumento, string> = {
  cedula: "Cédula", licencia: "Licencia", arl: "ARL", soat: "SOAT", tecnicomecanica: "Tecnomecánica",
};

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  pendiente:  { label: "Pendiente",  cls: "bg-amber-100 text-amber-700" },
  aprobado:   { label: "Aprobado",   cls: "bg-green-100 text-green-700" },
  rechazado:  { label: "Rechazado",  cls: "bg-red-100 text-red-700" },
  inactivo:   { label: "Inactivo",   cls: "bg-gray-100 text-gray-500" },
};

function diasHastaVencer(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
}

function estaEnHistorial(p: Personal): boolean {
  if (p.estado === "inactivo") return true;
  if (p.fecha_fin && new Date(p.fecha_fin) <= new Date()) return true;
  return false;
}

type Tab = "activos" | "historial";

interface Props {
  personal: Personal[];
  proveedores: Pick<Proveedor, "id" | "nombre">[];
  rol: string;
  proveedorIdActual: string | null;
}

export function ConsultaPersonalClient({ personal, proveedores, rol, proveedorIdActual }: Props) {
  const [tab, setTab] = useState<Tab>("activos");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: string; accion: "aprobar" | "rechazar"; proveedorEmail?: string | null } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [emailNotif, setEmailNotif] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [lista, setLista] = useState<Personal[]>(personal);
  // Corrección: modal para re-subir docs
  const [corrModal, setCorrModal] = useState<Personal | null>(null);
  const [corrLoading, setCorrLoading] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<"aprobar" | "rechazar" | null>(null);
  const [bulkMotivo, setBulkMotivo] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const supabase = createClient();

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    const ids = filtrado.filter((p) => p.estado === "pendiente").map((p) => p.id);
    const todosSeleccionados = ids.every((id) => seleccionados.has(id));
    setSeleccionados((prev) => {
      const next = new Set(prev);
      todosSeleccionados ? ids.forEach((id) => next.delete(id)) : ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleBulk = async () => {
    if (!bulkModal || !seleccionados.size) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/personal/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(seleccionados), accion: bulkModal, motivo_rechazo: bulkMotivo }),
      });
      if (res.ok) {
        const nuevoEstado = bulkModal === "aprobar" ? "aprobado" : "rechazado";
        setLista((prev) => prev.map((p) => seleccionados.has(p.id) ? { ...p, estado: nuevoEstado as Personal["estado"] } : p));
        setSeleccionados(new Set());
      }
    } finally { setBulkModal(null); setBulkMotivo(""); setBulkLoading(false); }
  };

  const exportarExcel = async () => {
    setExportandoExcel(true);
    try {
      const params = new URLSearchParams({ tab });
      if (filtroProveedor) params.set("proveedor_id", filtroProveedor);
      if (filtroEstado) params.set("estado", filtroEstado);
      const res = await fetch(`/api/export/personal?${params}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `personal_${tab}_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExportandoExcel(false); }
  };

  const verDoc = async (url: string) => {
    if (url.startsWith("http")) { window.open(url, "_blank"); return; }
    const { data } = await supabase.storage.from("documentos").createSignedUrl(url, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  // Separar activos e historial
  const activos = lista.filter((p) => !estaEnHistorial(p));
  const historial = lista.filter((p) => estaEnHistorial(p));
  const base = tab === "activos" ? activos : historial;

  const filtrado = base.filter((p) => {
    if (filtroProveedor && p.proveedor_id !== filtroProveedor) return false;
    if (filtroEstado && p.estado !== filtroEstado) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!p.nombres.toLowerCase().includes(q) && !p.cedula.includes(q)) return false;
    }
    return true;
  });

  const exportarQR = async (p: Personal) => {
    const QRCode = (await import("qrcode")).default;
    const info = [
      `Nombre: ${p.nombres}`,
      `C.C.: ${p.cedula}`,
      `Empresa: ${p.proveedor?.nombre ?? "-"}`,
      `Estado: ${p.estado}`,
      `Easy Kontrol`,
    ].join("\n");
    const dataUrl = await QRCode.toDataURL(info, { width: 300, margin: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR_${p.cedula}.png`;
    a.click();
  };

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
          email_notificacion: emailNotif.trim() || undefined,
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setLista((prev) => prev.map((p) => (p.id === data.id ? { ...p, ...data } : p)));
      }
    } finally { setModal(null); setMotivo(""); setEmailNotif(""); setLoadingId(null); }
  };

  const handleCorreccion = async () => {
    if (!corrModal) return;
    setCorrLoading(true);
    try {
      const res = await fetch(`/api/personal/${corrModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const { data } = await res.json();
        setLista((prev) => prev.map((p) => (p.id === data.id ? { ...p, ...data } : p)));
        setCorrModal(null);
      }
    } finally { setCorrLoading(false); }
  };

  const exportarPDF = async (p: Personal) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFillColor(122, 182, 72);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("EASY KONTROL", 14, 12);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Reporte de Personal Contratista", 14, 20);
    doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Información del personal", 14, 38);
    autoTable(doc, {
      startY: 42, head: [],
      body: [
        ["Nombre", p.nombres], ["Cédula", p.cedula],
        ["Empresa", p.proveedor?.nombre ?? "-"], ["NIT", p.proveedor?.nit ?? "-"],
        ["Estado", ESTADO_BADGE[p.estado]?.label ?? p.estado],
        ["Fecha registro", new Date(p.created_at).toLocaleDateString("es-CO")],
        ...(p.fecha_entrada ? [["Fecha entrada", new Date(p.fecha_entrada).toLocaleString("es-CO")]] : []),
        ...(p.fecha_fin ? [["Fecha fin", new Date(p.fecha_fin).toLocaleString("es-CO")]] : []),
        ...(p.vehiculo ? [["Vehículo", `${p.vehiculo.placa} — ${p.vehiculo.marca ?? ""} ${p.vehiculo.modelo ?? ""}`]] : []),
      ],
      styles: { fontSize: 10 }, columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } }, theme: "grid",
    });
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold"); doc.text("Documentos", 14, finalY);
    const docsRows = (["cedula", "licencia", "arl", "soat", "tecnicomecanica"] as TipoDocumento[]).map((tipo) => {
      const d = p.documentos?.find((x) => x.tipo === tipo);
      const dias = diasHastaVencer(d?.fecha_vencimiento ?? null);
      return [TIPO_LABELS[tipo], d ? "✓ Cargado" : "✗ Faltante",
        d?.fecha_vencimiento ? new Date(d.fecha_vencimiento).toLocaleDateString("es-CO") : "-",
        dias !== null ? (dias <= 0 ? "VENCIDO" : `${dias} días`) : "-"];
    });
    autoTable(doc, { startY: finalY + 4, head: [["Documento", "Estado", "Vence", "Días restantes"]], body: docsRows, styles: { fontSize: 9 }, headStyles: { fillColor: [122, 182, 72] }, theme: "striped" });
    doc.setFontSize(8); doc.setTextColor(150); doc.text(`Generado el ${new Date().toLocaleString("es-CO")}`, 14, 285);
    doc.save(`${p.cedula}_${p.nombres.replace(/\s/g, "_")}.pdf`);
  };

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Consulta de personal</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">{activos.length} activo(s) · {historial.length} en historial</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
        {([["activos", "Activos", activos.length], ["historial", "Historial", historial.length]] as const).map(([t, label, count]) => (
          <button key={t} onClick={() => { setTab(t); setFiltroEstado(""); setBusqueda(""); }}
            className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors",
              tab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            {t === "activos" ? <CheckCircle size={13} /> : <Archive size={13} />}
            {label}
            <span className={clsx("text-[11px] px-1.5 py-0.5 rounded-full", tab === t ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-500")}>{count}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Buscar por nombre o cédula..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 text-[13px] border-none outline-none placeholder:text-gray-300" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-gray-400" />
          {rol === "admin" && (
            <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}
              className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400">
              <option value="">Todas las empresas</option>
              {proveedores.map((pv) => <option key={pv.id} value={pv.id}>{pv.nombre}</option>)}
            </select>
          )}
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <button onClick={exportarExcel} disabled={exportandoExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <FileSpreadsheet size={13} className="text-green-600" />
            {exportandoExcel ? "Exportando..." : "Excel"}
          </button>
        </div>
      </div>

      {/* Barra de acciones masivas */}
      {rol === "admin" && seleccionados.size > 0 && (
        <div className="bg-ek-50 border border-ek-200 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <span className="text-[13px] text-ek-700 font-medium">{seleccionados.size} persona(s) seleccionada(s)</span>
          <div className="flex gap-2">
            <button onClick={() => setBulkModal("aprobar")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[12px] font-medium hover:bg-green-600 transition-colors">
              <CheckCircle size={13} /> Aprobar todas
            </button>
            <button onClick={() => setBulkModal("rechazar")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-[12px] font-medium hover:bg-red-600 transition-colors">
              <XCircle size={13} /> Rechazar todas
            </button>
            <button onClick={() => setSeleccionados(new Set())}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-white transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {filtrado.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-[13px] text-gray-400">
            No se encontraron resultados.
          </div>
        )}
        {filtrado.map((p) => {
          const isOpen = expandido === p.id;
          const tiposRequeridos: TipoDocumento[] = ["cedula", "licencia", "arl"];
          const tiposVehiculo: TipoDocumento[] = ["soat", "tecnicomecanica"];
          const docsSubidos = tiposRequeridos.filter((t) => p.documentos?.some((d) => d.tipo === t)).length;
          const docsVeh = tiposVehiculo.filter((t) => p.documentos?.some((d) => d.tipo === t)).length;
          const badge = ESTADO_BADGE[p.estado] ?? { label: p.estado, cls: "bg-gray-100 text-gray-500" };
          const docsPorVencer = p.documentos?.filter((d) => { const dias = diasHastaVencer(d.fecha_vencimiento); return dias !== null && dias <= 60 && dias > 0; });
          const todos = [...tiposRequeridos, ...(p.vehiculo_id ? tiposVehiculo : [])];
          const totalDocs = todos.length;
          const cargados = todos.filter((t) => p.documentos?.some((d) => d.tipo === t)).length;

          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              {rol === "admin" && p.estado === "pendiente" && (
                <button onClick={() => toggleSeleccion(p.id)} className="mr-3 shrink-0 text-gray-400 hover:text-ek-600 transition-colors">
                  {seleccionados.has(p.id) ? <CheckSquare size={16} className="text-ek-600" /> : <Square size={16} />}
                </button>
              )}
              <div className="flex-1 cursor-pointer" onClick={() => setExpandido(isOpen ? null : p.id)}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-gray-800">{p.nombres}</p>
                    {p.en_correccion && (
                      <span className="flex items-center gap-1 text-[11px] text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                        <Wrench size={10} /> En corrección
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-400">C.C. {p.cedula} · {p.proveedor?.nombre ?? "-"}
                    {p.vehiculo && <span className="ml-1">· 🚗 {p.vehiculo.placa}</span>}
                  </p>
                  {p.fecha_entrada && (
                    <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      Entrada: {new Date(p.fecha_entrada).toLocaleString("es-CO")}
                      {p.fecha_fin && ` — Fin: ${new Date(p.fecha_fin).toLocaleString("es-CO")}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {docsPorVencer && docsPorVencer.length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={11} /> {docsPorVencer.length} por vencer
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">{cargados}/{totalDocs} docs</span>
                  <span className={clsx("text-[11px] font-medium px-2 py-0.5 rounded-full", badge.cls)}>{badge.label}</span>
                  {isOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </div>
              </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                  {/* Docs persona */}
                  <DocSection title="Documentos del personal" tipos={tiposRequeridos} docs={p.documentos ?? []} onVer={verDoc} />
                  {/* Docs vehículo */}
                  {p.vehiculo_id && <DocSection title={`Documentos del vehículo (${p.vehiculo?.placa ?? ""})`} tipos={tiposVehiculo} docs={p.documentos ?? []} onVer={verDoc} />}

                  {p.motivo_rechazo && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                      <p className="text-[12px] text-red-600"><strong>Motivo de rechazo:</strong> {p.motivo_rechazo}</p>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => exportarPDF(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 transition-colors">
                      <Download size={13} /> PDF
                    </button>
                    <button onClick={() => exportarQR(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 transition-colors">
                      <QrCode size={13} /> QR
                    </button>

                    {rol === "admin" && p.estado === "pendiente" && (
                      <>
                        <button disabled={!!loadingId} onClick={() => { setModal({ id: p.id, accion: "aprobar" }); setEmailNotif(""); setMotivo(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[12px] font-medium hover:bg-green-600 transition-colors disabled:opacity-50">
                          <CheckCircle size={13} /> Aprobar
                        </button>
                        <button disabled={!!loadingId} onClick={() => { setModal({ id: p.id, accion: "rechazar", proveedorEmail: p.proveedor?.email }); setMotivo(""); setEmailNotif(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-[12px] font-medium hover:bg-red-600 transition-colors disabled:opacity-50">
                          <XCircle size={13} /> Rechazar
                        </button>
                      </>
                    )}

                    {rol === "proveedor" && p.estado === "rechazado" && (
                      <button onClick={() => setCorrModal(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[12px] font-medium hover:bg-orange-600 transition-colors">
                        <Wrench size={13} /> Corregir documentos
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal aprobar/rechazar */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-[15px] font-bold text-gray-800">
              {modal.accion === "aprobar" ? "Confirmar aprobación" : "Confirmar rechazo"}
            </h3>
            <p className="text-[13px] text-gray-500">
              {modal.accion === "aprobar"
                ? "¿Aprobar el ingreso? Se enviará notificación al proveedor."
                : "Indica el motivo para notificar al proveedor."}
            </p>
            <div className="space-y-3">
              {modal.accion === "rechazar" && (
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1">Motivo *</label>
                  <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Describe el motivo..." rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                </div>
              )}
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Correo adicional (opcional)</label>
                <input type="email" value={emailNotif} onChange={(e) => setEmailNotif(e.target.value)} placeholder="Copia a otro correo..."
                  className={clsx("w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2",
                    modal.accion === "rechazar" ? "focus:ring-red-300" : "focus:ring-green-300"
                  )} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setModal(null); setMotivo(""); }} className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAprobarRechazar} disabled={!!loadingId || (modal.accion === "rechazar" && !motivo.trim())}
                className={clsx("flex-1 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50",
                  modal.accion === "aprobar" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                )}>
                {modal.accion === "aprobar" ? "Aprobar" : "Rechazar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal aprobación/rechazo masivo */}
      {bulkModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-[15px] font-bold text-gray-800">
              {bulkModal === "aprobar" ? `Aprobar ${seleccionados.size} persona(s)` : `Rechazar ${seleccionados.size} persona(s)`}
            </h3>
            {bulkModal === "rechazar" && (
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Motivo *</label>
                <textarea value={bulkMotivo} onChange={(e) => setBulkMotivo(e.target.value)}
                  placeholder="Motivo del rechazo..." rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setBulkModal(null); setBulkMotivo(""); }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleBulk} disabled={bulkLoading || (bulkModal === "rechazar" && !bulkMotivo.trim())}
                className={clsx("flex-1 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50",
                  bulkModal === "aprobar" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                )}>
                {bulkLoading ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal corrección proveedor */}
      {corrModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-[15px] font-bold text-gray-800">Corregir documentos</h3>
            <p className="text-[13px] text-gray-500">
              Al confirmar, el registro de <strong>{corrModal.nombres}</strong> regresará a estado <strong>Pendiente</strong> para una nueva revisión del administrador.
            </p>
            {corrModal.motivo_rechazo && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-[12px] text-red-600"><strong>Motivo de rechazo anterior:</strong> {corrModal.motivo_rechazo}</p>
              </div>
            )}
            <p className="text-[12px] text-gray-400">
              Después de confirmar, ve a la sección de <strong>Registrar personal</strong> para subir los documentos corregidos con la misma cédula, o sube los archivos individualmente si el sistema lo permite.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCorrModal(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCorreccion} disabled={corrLoading}
                className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[13px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {corrLoading ? <><span className="animate-spin">⟳</span> Enviando...</> : "Enviar corrección"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DocSection helper ────────────────────────────────
function DocSection({ title, tipos, docs, onVer }: {
  title: string;
  tipos: TipoDocumento[];
  docs: { tipo: TipoDocumento; url: string; nombre_archivo: string | null; fecha_vencimiento: string | null }[];
  onVer: (url: string) => void;
}) {
  const diasHastaVencer = (fecha: string | null) => fecha ? Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000) : null;

  return (
    <div>
      <p className="text-[12px] font-semibold text-gray-500 mb-2">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {tipos.map((tipo) => {
          const doc = docs.find((d) => d.tipo === tipo);
          const dias = diasHastaVencer(doc?.fecha_vencimiento ?? null);
          const vencido = dias !== null && dias <= 0;
          const alerta = dias !== null && dias > 0 && dias <= 60;
          return (
            <div key={tipo} className={clsx("rounded-lg border p-3 flex items-start justify-between gap-2",
              doc ? (vencido ? "border-red-200 bg-red-50" : alerta ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50") : "border-red-200 bg-red-50"
            )}>
              <div className="flex items-start gap-2 min-w-0">
                {doc ? (vencido || alerta ? <AlertTriangle size={14} className={vencido ? "text-red-500 shrink-0 mt-0.5" : "text-amber-500 shrink-0 mt-0.5"} /> : <CheckCircle size={14} className="text-green-600 shrink-0 mt-0.5" />) : <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className={clsx("text-[13px] font-semibold", doc ? (vencido ? "text-red-700" : alerta ? "text-amber-700" : "text-green-700") : "text-red-500")}>{TIPO_LABELS[tipo]}</p>
                  {doc?.nombre_archivo && <p className="text-[10px] text-gray-400 truncate">{doc.nombre_archivo}</p>}
                  {doc?.fecha_vencimiento && (
                    <p className={clsx("text-[11px] mt-0.5", vencido ? "text-red-600 font-semibold" : alerta ? "text-amber-600" : "text-gray-500")}>
                      {vencido ? "VENCIDO · " : "Vence: "}{new Date(doc.fecha_vencimiento).toLocaleDateString("es-CO")}{dias !== null && !vencido && ` (${dias}d)`}
                    </p>
                  )}
                  {!doc && <p className="text-[11px] text-red-400 mt-0.5">No cargado</p>}
                </div>
              </div>
              {doc && (
                <button onClick={(e) => { e.stopPropagation(); onVer(doc.url); }}
                  className={clsx("shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors",
                    vencido || alerta ? "border-amber-300 bg-white text-amber-700 hover:bg-amber-50" : "border-green-300 bg-white text-green-700 hover:bg-green-50"
                  )}>
                  <FileText size={12} /> Ver PDF
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
