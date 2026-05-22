"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Filter, X, Download, FileText, ChevronUp, ChevronDown,
  ChevronsUpDown, RefreshCw, BarChart2, Search, SlidersHorizontal,
} from "lucide-react";
import clsx from "clsx";
import {
  ACTIVIDADES_CONTRATISTA, ARL_OPTIONS, EPS_OPTIONS,
  AFP_OPTIONS, CARGOS_CONTRATISTA, TIPOS_VEHICULO,
} from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PersonalRow {
  id: string;
  nombres: string;
  cedula: string;
  estado: string;
  en_correccion: boolean;
  actividad_a_realizar: string | null;
  cargo: string | null;
  municipio_residencia: string | null;
  arl: string | null;
  eps: string | null;
  afp: string | null;
  fecha_entrada: string | null;
  fecha_fin: string | null;
  aprobado_at: string | null;
  motivo_rechazo: string | null;
  created_at: string;
  proveedor: { id: string; nombre: string; nit: string } | null;
  documentos: Array<{
    tipo: string;
    fecha_vencimiento: string | null;
    verificado_auto: boolean;
  }>;
  vehiculo: {
    tipo: string | null;
    placa: string | null;
    marca: string | null;
    modelo: string | null;
    color: string | null;
  } | null;
}

interface Filters {
  busqueda: string;
  estados: string[];
  proveedor_id: string;
  cargo: string;
  actividad: string;
  arl: string;
  eps: string;
  afp: string;
  municipio: string;
  en_correccion: boolean | null;
  con_vehiculo: boolean | null;
  fecha_entrada_desde: string;
  fecha_entrada_hasta: string;
  fecha_fin_desde: string;
  fecha_fin_hasta: string;
  docs_por_vencer: boolean;
}

const INITIAL_FILTERS: Filters = {
  busqueda: "",
  estados: [],
  proveedor_id: "",
  cargo: "",
  actividad: "",
  arl: "",
  eps: "",
  afp: "",
  municipio: "",
  en_correccion: null,
  con_vehiculo: null,
  fecha_entrada_desde: "",
  fecha_entrada_hasta: "",
  fecha_fin_desde: "",
  fecha_fin_hasta: "",
  docs_por_vencer: false,
};

const ESTADO_COLORS: Record<string, string> = {
  aprobado: "bg-green-100 text-green-700",
  pendiente: "bg-yellow-100 text-yellow-700",
  rechazado: "bg-red-100 text-red-700",
  inactivo: "bg-gray-100 text-gray-500",
};

const CHART_COLORS = ["#22c55e", "#eab308", "#ef4444", "#94a3b8", "#3b82f6", "#a855f7"];

type SortKey = keyof PersonalRow | "proveedor_nombre";
type SortDir = "asc" | "desc";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color,
}: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-1">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={clsx("text-2xl font-bold", color ?? "text-gray-800")}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Chip de filtro activo ────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-ek-50 text-ek-700 text-[11px] font-medium px-2 py-0.5 rounded-full border border-ek-100">
      {label}
      <button onClick={onRemove} className="hover:text-ek-900 ml-0.5">
        <X size={10} />
      </button>
    </span>
  );
}

// ─── Th ordenable ─────────────────────────────────────────────────────────────

function Th({
  label, sortKey, currentKey, dir, onSort, className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={clsx(
        "px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-gray-50 group",
        className
      )}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ChevronsUpDown size={12} className="opacity-30 group-hover:opacity-60" />
        )}
      </span>
    </th>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportesClient({ rol }: { rol: string }) {
  const [allData, setAllData] = useState<PersonalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showCharts, setShowCharts] = useState(false);
  const [incluirGraficas, setIncluirGraficas] = useState(false);
  const [exportando, setExportando] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reportes/personal");
      const json = await res.json();
      setAllData(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Proveedores únicos ────────────────────────────────────────────────────
  const proveedores = useMemo(() => {
    const map = new Map<string, string>();
    allData.forEach(p => {
      if (p.proveedor) map.set(p.proveedor.id, p.proveedor.nombre);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allData]);

  // ── Municipios únicos ─────────────────────────────────────────────────────
  const municipios = useMemo(() => {
    const s = new Set<string>();
    allData.forEach(p => { if (p.municipio_residencia) s.add(p.municipio_residencia); });
    return Array.from(s).sort();
  }, [allData]);

  // ── Filtered & sorted data ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const today = new Date();
    const in60Days = new Date(today);
    in60Days.setDate(today.getDate() + 60);

    let rows = allData.filter(p => {
      const q = filters.busqueda.toLowerCase();
      if (q && !p.nombres.toLowerCase().includes(q) && !p.cedula.includes(q)) return false;
      if (filters.estados.length && !filters.estados.includes(p.estado)) return false;
      if (filters.proveedor_id && p.proveedor?.id !== filters.proveedor_id) return false;
      if (filters.cargo && p.cargo !== filters.cargo) return false;
      if (filters.actividad && p.actividad_a_realizar !== filters.actividad) return false;
      if (filters.arl && p.arl !== filters.arl) return false;
      if (filters.eps && p.eps !== filters.eps) return false;
      if (filters.afp && p.afp !== filters.afp) return false;
      if (filters.municipio && p.municipio_residencia !== filters.municipio) return false;
      if (filters.en_correccion !== null && p.en_correccion !== filters.en_correccion) return false;
      if (filters.con_vehiculo !== null) {
        const tiene = !!p.vehiculo;
        if (tiene !== filters.con_vehiculo) return false;
      }
      if (filters.fecha_entrada_desde && p.fecha_entrada && p.fecha_entrada < filters.fecha_entrada_desde) return false;
      if (filters.fecha_entrada_hasta && p.fecha_entrada && p.fecha_entrada > filters.fecha_entrada_hasta) return false;
      if (filters.fecha_fin_desde && p.fecha_fin && p.fecha_fin < filters.fecha_fin_desde) return false;
      if (filters.fecha_fin_hasta && p.fecha_fin && p.fecha_fin > filters.fecha_fin_hasta) return false;
      if (filters.docs_por_vencer) {
        const vence = p.documentos.some(d => {
          if (!d.fecha_vencimiento) return false;
          const fv = new Date(d.fecha_vencimiento);
          return fv >= today && fv <= in60Days;
        });
        if (!vence) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "proveedor_nombre") {
        av = a.proveedor?.nombre ?? "";
        bv = b.proveedor?.nombre ?? "";
      } else {
        av = (a[sortKey as keyof PersonalRow] as string) ?? "";
        bv = (b[sortKey as keyof PersonalRow] as string) ?? "";
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [allData, filters, sortKey, sortDir]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = filtered.length;
    const aprobados = filtered.filter(p => p.estado === "aprobado").length;
    const pendientes = filtered.filter(p => p.estado === "pendiente").length;
    const rechazados = filtered.filter(p => p.estado === "rechazado").length;
    const inactivos = filtered.filter(p => p.estado === "inactivo").length;
    const enCorreccion = filtered.filter(p => p.en_correccion).length;
    const conVehiculo = filtered.filter(p => !!p.vehiculo).length;
    const today = new Date();
    const in60 = new Date(today);
    in60.setDate(today.getDate() + 60);
    const docsPorVencer = filtered.filter(p =>
      p.documentos.some(d => {
        if (!d.fecha_vencimiento) return false;
        const fv = new Date(d.fecha_vencimiento);
        return fv >= today && fv <= in60;
      })
    ).length;
    const pct = (n: number) => total ? `${Math.round((n / total) * 100)}%` : "0%";
    return { total, aprobados, pendientes, rechazados, inactivos, enCorreccion, conVehiculo, docsPorVencer, pct };
  }, [filtered]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartEstados = useMemo(() => [
    { name: "Aprobados", value: kpis.aprobados },
    { name: "Pendientes", value: kpis.pendientes },
    { name: "Rechazados", value: kpis.rechazados },
    { name: "Inactivos", value: kpis.inactivos },
  ], [kpis]);

  const chartEmpresas = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(p => {
      const n = p.proveedor?.nombre ?? "Sin empresa";
      map.set(n, (map.get(n) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const chartCargos = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(p => {
      const n = p.cargo ?? "Sin cargo";
      map.set(n, (map.get(n) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const setF = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters(f => ({ ...f, [key]: val }));

  const toggleEstado = (e: string) =>
    setFilters(f => ({
      ...f,
      estados: f.estados.includes(e) ? f.estados.filter(x => x !== e) : [...f.estados, e],
    }));

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.busqueda) n++;
    if (filters.estados.length) n++;
    if (filters.proveedor_id) n++;
    if (filters.cargo) n++;
    if (filters.actividad) n++;
    if (filters.arl) n++;
    if (filters.eps) n++;
    if (filters.afp) n++;
    if (filters.municipio) n++;
    if (filters.en_correccion !== null) n++;
    if (filters.con_vehiculo !== null) n++;
    if (filters.fecha_entrada_desde || filters.fecha_entrada_hasta) n++;
    if (filters.fecha_fin_desde || filters.fecha_fin_hasta) n++;
    if (filters.docs_por_vencer) n++;
    return n;
  }, [filters]);

  // ── PDF Export ────────────────────────────────────────────────────────────
  const exportarPDF = async () => {
    setExportando(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const today = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

      // ── Portada ─────────────────────────────────────────────────────────
      doc.setFillColor(16, 150, 90);
      doc.rect(0, 0, pageW, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("EASY KONTROL — Reporte de Personal", 14, 13);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generado: ${today}  |  Total registros: ${filtered.length}`, 14, 22);

      // ── Filtros aplicados ───────────────────────────────────────────────
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      let yPos = 36;
      if (activeCount > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Filtros aplicados:", 14, yPos);
        doc.setFont("helvetica", "normal");
        yPos += 5;
        const chips: string[] = [];
        if (filters.busqueda) chips.push(`Búsqueda: "${filters.busqueda}"`);
        if (filters.estados.length) chips.push(`Estado: ${filters.estados.join(", ")}`);
        if (filters.proveedor_id) chips.push(`Empresa: ${proveedores.find(p => p[0] === filters.proveedor_id)?.[1] ?? ""}`);
        if (filters.cargo) chips.push(`Cargo: ${filters.cargo}`);
        if (filters.actividad) chips.push(`Actividad: ${filters.actividad}`);
        if (filters.arl) chips.push(`ARL: ${filters.arl}`);
        if (filters.eps) chips.push(`EPS: ${filters.eps}`);
        if (filters.afp) chips.push(`AFP: ${filters.afp}`);
        if (filters.municipio) chips.push(`Municipio: ${filters.municipio}`);
        if (filters.en_correccion !== null) chips.push(`En corrección: ${filters.en_correccion ? "Sí" : "No"}`);
        if (filters.con_vehiculo !== null) chips.push(`Con vehículo: ${filters.con_vehiculo ? "Sí" : "No"}`);
        if (filters.docs_por_vencer) chips.push("Docs por vencer (<60 días)");
        const lines = doc.splitTextToSize(chips.join("  •  "), pageW - 28);
        doc.text(lines, 14, yPos);
        yPos += lines.length * 5 + 4;
      }

      // ── KPIs ────────────────────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Indicadores clave", 14, yPos + 2);
      yPos += 7;

      const kpiItems = [
        { l: "Total", v: kpis.total },
        { l: "Aprobados", v: kpis.aprobados },
        { l: "Pendientes", v: kpis.pendientes },
        { l: "Rechazados", v: kpis.rechazados },
        { l: "Inactivos", v: kpis.inactivos },
        { l: "En corrección", v: kpis.enCorreccion },
        { l: "Con vehículo", v: kpis.conVehiculo },
        { l: "Docs por vencer", v: kpis.docsPorVencer },
      ];

      const cardW = (pageW - 28) / kpiItems.length;
      kpiItems.forEach((k, i) => {
        const x = 14 + i * cardW;
        doc.setFillColor(245, 250, 248);
        doc.roundedRect(x, yPos, cardW - 2, 16, 2, 2, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(k.l, x + (cardW - 2) / 2, yPos + 5, { align: "center" });
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(String(k.v), x + (cardW - 2) / 2, yPos + 12, { align: "center" });
      });
      yPos += 22;

      // ── Gráficas en PDF ─────────────────────────────────────────────────
      if (incluirGraficas) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text("Distribución por estado", 14, yPos + 4);

        const barW = 40;
        const maxVal = Math.max(...chartEstados.map(d => d.value), 1);
        const barColors: Record<string, [number, number, number]> = {
          Aprobados: [34, 197, 94],
          Pendientes: [234, 179, 8],
          Rechazados: [239, 68, 68],
          Inactivos: [148, 163, 184],
        };
        chartEstados.forEach((d, i) => {
          const x = 14 + i * (barW + 8);
          const barH = Math.max(2, (d.value / maxVal) * 25);
          const [r, g, b] = barColors[d.name] ?? [100, 100, 200];
          doc.setFillColor(r, g, b);
          doc.rect(x, yPos + 35 - barH, barW, barH, "F");
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 30, 30);
          doc.text(String(d.value), x + barW / 2, yPos + 33 - barH, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.text(d.name, x + barW / 2, yPos + 40, { align: "center" });
        });
        yPos += 46;

        if (chartEmpresas.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text("Personal por empresa (Top 8)", 14, yPos + 4);
          const maxE = Math.max(...chartEmpresas.map(d => d.value), 1);
          chartEmpresas.forEach((d, i) => {
            const y2 = yPos + 10 + i * 7;
            const barLen = Math.max(3, (d.value / maxE) * 100);
            doc.setFillColor(59, 130, 246);
            doc.rect(14, y2, barLen, 4, "F");
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 30, 30);
            const lbl = d.name.length > 35 ? d.name.slice(0, 32) + "…" : d.name;
            doc.text(`${lbl} (${d.value})`, barLen + 16, y2 + 3.5);
          });
          yPos += 10 + chartEmpresas.length * 7 + 4;
        }
      }

      // ── Tabla de datos ──────────────────────────────────────────────────
      autoTable(doc, {
        startY: yPos + 2,
        head: [[
          "#", "Nombre", "Cédula", "Empresa", "NIT", "Cargo", "Actividad",
          "Estado", "Municipio", "ARL", "EPS", "AFP",
          "F. Entrada", "F. Fin", "Vehículo", "Placa",
          "En Corr.", "Docs", "F. Registro",
        ]],
        body: filtered.map((p, i) => [
          i + 1,
          p.nombres,
          p.cedula,
          p.proveedor?.nombre ?? "",
          p.proveedor?.nit ?? "",
          p.cargo ?? "",
          p.actividad_a_realizar ?? "",
          p.estado,
          p.municipio_residencia ?? "",
          p.arl ?? "",
          p.eps ?? "",
          p.afp ?? "",
          p.fecha_entrada ? new Date(p.fecha_entrada + "T00:00:00").toLocaleDateString("es-CO") : "",
          p.fecha_fin ? new Date(p.fecha_fin + "T00:00:00").toLocaleDateString("es-CO") : "",
          p.vehiculo?.tipo ?? "",
          p.vehiculo?.placa ?? "",
          p.en_correccion ? "Sí" : "No",
          `${p.documentos.length} doc${p.documentos.length !== 1 ? "s" : ""}`,
          new Date(p.created_at).toLocaleDateString("es-CO"),
        ]),
        styles: { fontSize: 6.5, cellPadding: 1.5 },
        headStyles: { fillColor: [16, 150, 90], textColor: 255, fontStyle: "bold", fontSize: 6.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 6 },
          1: { cellWidth: 28 },
          2: { cellWidth: 18 },
          3: { cellWidth: 28 },
          4: { cellWidth: 16 },
          7: { cellWidth: 16 },
          17: { cellWidth: 10 },
        },
        didParseCell(data) {
          if (data.section === "body" && data.column.index === 7) {
            const v = String(data.cell.raw);
            if (v === "aprobado") data.cell.styles.textColor = [21, 128, 61];
            else if (v === "pendiente") data.cell.styles.textColor = [161, 98, 7];
            else if (v === "rechazado") data.cell.styles.textColor = [185, 28, 28];
          }
        },
      });

      // ── Footer en cada página ───────────────────────────────────────────
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`Easy Kontrol  |  Pág. ${i} de ${totalPages}  |  ${today}`, pageW / 2, pageH - 5, { align: "center" });
      }

      doc.save(`reporte-personal-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExportando(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const fmtFecha = (d: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  const fmtFechaHora = (d: string) =>
    new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

  const docsVencenProximos = (docs: PersonalRow["documentos"]) => {
    const today = new Date();
    const in60 = new Date(today);
    in60.setDate(today.getDate() + 60);
    return docs.some(d => {
      if (!d.fecha_vencimiento) return false;
      const fv = new Date(d.fecha_vencimiento);
      return fv >= today && fv <= in60;
    });
  };

  // ── Chips resumen de filtros activos ──────────────────────────────────────
  const activeChips: Array<{ label: string; onRemove: () => void }> = [];
  if (filters.busqueda) activeChips.push({ label: `"${filters.busqueda}"`, onRemove: () => setF("busqueda", "") });
  filters.estados.forEach(e => activeChips.push({ label: e, onRemove: () => toggleEstado(e) }));
  if (filters.proveedor_id) activeChips.push({ label: proveedores.find(p => p[0] === filters.proveedor_id)?.[1] ?? "", onRemove: () => setF("proveedor_id", "") });
  if (filters.cargo) activeChips.push({ label: filters.cargo, onRemove: () => setF("cargo", "") });
  if (filters.actividad) activeChips.push({ label: filters.actividad, onRemove: () => setF("actividad", "") });
  if (filters.arl) activeChips.push({ label: `ARL: ${filters.arl}`, onRemove: () => setF("arl", "") });
  if (filters.eps) activeChips.push({ label: `EPS: ${filters.eps}`, onRemove: () => setF("eps", "") });
  if (filters.afp) activeChips.push({ label: `AFP: ${filters.afp}`, onRemove: () => setF("afp", "") });
  if (filters.municipio) activeChips.push({ label: `Municipio: ${filters.municipio}`, onRemove: () => setF("municipio", "") });
  if (filters.en_correccion !== null) activeChips.push({ label: filters.en_correccion ? "En corrección" : "Sin corrección", onRemove: () => setF("en_correccion", null) });
  if (filters.con_vehiculo !== null) activeChips.push({ label: filters.con_vehiculo ? "Con vehículo" : "Sin vehículo", onRemove: () => setF("con_vehiculo", null) });
  if (filters.fecha_entrada_desde || filters.fecha_entrada_hasta) activeChips.push({ label: `Entrada: ${filters.fecha_entrada_desde || "…"} – ${filters.fecha_entrada_hasta || "…"}`, onRemove: () => setFilters(f => ({ ...f, fecha_entrada_desde: "", fecha_entrada_hasta: "" })) });
  if (filters.fecha_fin_desde || filters.fecha_fin_hasta) activeChips.push({ label: `Fin: ${filters.fecha_fin_desde || "…"} – ${filters.fecha_fin_hasta || "…"}`, onRemove: () => setFilters(f => ({ ...f, fecha_fin_desde: "", fecha_fin_hasta: "" })) });
  if (filters.docs_por_vencer) activeChips.push({ label: "Docs por vencer", onRemove: () => setF("docs_por_vencer", false) });

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Reporte global de personal</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {loading ? "Cargando datos…" : `${filtered.length} de ${allData.length} registros`}
              {activeCount > 0 && <span className="ml-2 text-ek-600 font-medium">• {activeCount} filtro{activeCount !== 1 ? "s" : ""} activo{activeCount !== 1 ? "s" : ""}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={13} /> Actualizar
            </button>
            <button
              onClick={() => setShowCharts(s => !s)}
              className={clsx(
                "flex items-center gap-1.5 text-[12px] border rounded-lg px-3 py-1.5 transition-colors",
                showCharts
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "text-gray-500 hover:text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              <BarChart2 size={13} /> {showCharts ? "Ocultar gráficas" : "Ver gráficas"}
            </button>
            <button
              onClick={() => setShowFilters(s => !s)}
              className={clsx(
                "flex items-center gap-1.5 text-[12px] border rounded-lg px-3 py-1.5 transition-colors",
                activeCount > 0
                  ? "bg-ek-50 text-ek-700 border-ek-200"
                  : "text-gray-500 hover:text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              <SlidersHorizontal size={13} />
              Filtros {activeCount > 0 && <span className="bg-ek-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>}
            </button>
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
              <input
                type="checkbox"
                id="inc-graficas"
                checked={incluirGraficas}
                onChange={e => setIncluirGraficas(e.target.checked)}
                className="accent-ek-500 w-3.5 h-3.5"
              />
              <label htmlFor="inc-graficas" className="text-[12px] text-gray-600 cursor-pointer whitespace-nowrap">
                Incluir gráficas en informe
              </label>
            </div>
            <button
              onClick={exportarPDF}
              disabled={exportando || filtered.length === 0}
              className="flex items-center gap-1.5 text-[12px] bg-ek-500 hover:bg-ek-600 text-white border border-ek-600 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {exportando ? <RefreshCw size={13} className="animate-spin" /> : <FileText size={13} />}
              Descargar PDF
            </button>
          </div>
        </div>

        {/* Chips de filtros activos */}
        {activeChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-400">Activos:</span>
            {activeChips.map((c, i) => (
              <FilterChip key={i} label={c.label} onRemove={c.onRemove} />
            ))}
            <button
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="text-[11px] text-red-500 hover:text-red-700 font-medium ml-1"
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* ── Panel de filtros (colapsable) ── */}
      {showFilters && (
        <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">

            {/* Búsqueda */}
            <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Búsqueda</label>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nombre o cédula…"
                  value={filters.busqueda}
                  onChange={e => setF("busqueda", e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-ek-400"
                />
              </div>
            </div>

            {/* Estado */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Estado</label>
              <div className="flex flex-wrap gap-1">
                {["aprobado", "pendiente", "rechazado", "inactivo"].map(e => (
                  <button
                    key={e}
                    onClick={() => toggleEstado(e)}
                    className={clsx(
                      "text-[10px] px-2 py-1 rounded-full border font-medium capitalize transition-colors",
                      filters.estados.includes(e)
                        ? ESTADO_COLORS[e] + " border-current"
                        : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Empresa */}
            {rol === "admin" && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Empresa</label>
                <select
                  value={filters.proveedor_id}
                  onChange={e => setF("proveedor_id", e.target.value)}
                  className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400 bg-white"
                >
                  <option value="">Todas</option>
                  {proveedores.map(([id, nombre]) => (
                    <option key={id} value={id}>{nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Cargo */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cargo</label>
              <select
                value={filters.cargo}
                onChange={e => setF("cargo", e.target.value)}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400 bg-white"
              >
                <option value="">Todos</option>
                {CARGOS_CONTRATISTA.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Actividad */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Actividad</label>
              <select
                value={filters.actividad}
                onChange={e => setF("actividad", e.target.value)}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400 bg-white"
              >
                <option value="">Todas</option>
                {ACTIVIDADES_CONTRATISTA.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>

            {/* ARL */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">ARL</label>
              <select
                value={filters.arl}
                onChange={e => setF("arl", e.target.value)}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400 bg-white"
              >
                <option value="">Todas</option>
                {ARL_OPTIONS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>

            {/* EPS */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">EPS</label>
              <select
                value={filters.eps}
                onChange={e => setF("eps", e.target.value)}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400 bg-white"
              >
                <option value="">Todas</option>
                {EPS_OPTIONS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>

            {/* AFP */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">AFP</label>
              <select
                value={filters.afp}
                onChange={e => setF("afp", e.target.value)}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400 bg-white"
              >
                <option value="">Todas</option>
                {AFP_OPTIONS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>

            {/* Municipio */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Municipio</label>
              <select
                value={filters.municipio}
                onChange={e => setF("municipio", e.target.value)}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400 bg-white"
              >
                <option value="">Todos</option>
                {municipios.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            {/* Fecha entrada */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Fecha entrada (desde – hasta)</label>
              <div className="flex gap-1">
                <input type="date" value={filters.fecha_entrada_desde} onChange={e => setF("fecha_entrada_desde", e.target.value)}
                  className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400" />
                <input type="date" value={filters.fecha_entrada_hasta} onChange={e => setF("fecha_entrada_hasta", e.target.value)}
                  className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400" />
              </div>
            </div>

            {/* Fecha fin */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Fecha fin (desde – hasta)</label>
              <div className="flex gap-1">
                <input type="date" value={filters.fecha_fin_desde} onChange={e => setF("fecha_fin_desde", e.target.value)}
                  className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400" />
                <input type="date" value={filters.fecha_fin_hasta} onChange={e => setF("fecha_fin_hasta", e.target.value)}
                  className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ek-400" />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2 justify-end">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Opciones</label>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: "En corrección", val: filters.en_correccion, key: "en_correccion" as const },
                  { label: "Con vehículo", val: filters.con_vehiculo, key: "con_vehiculo" as const },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center gap-1.5">
                    <select
                      value={opt.val === null ? "" : String(opt.val)}
                      onChange={e => setF(opt.key, e.target.value === "" ? null : e.target.value === "true")}
                      className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ek-400 bg-white"
                    >
                      <option value="">Todos</option>
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                    <span className="text-[11px] text-gray-500">{opt.label}</span>
                  </div>
                ))}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.docs_por_vencer}
                    onChange={e => setF("docs_por_vencer", e.target.checked)}
                    className="accent-ek-500 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] text-gray-500">Docs por vencer (&lt;60 días)</span>
                </label>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 shrink-0">
        <KpiCard label="Total" value={kpis.total} />
        <KpiCard label="Aprobados" value={kpis.aprobados} sub={kpis.pct(kpis.aprobados)} color="text-green-600" />
        <KpiCard label="Pendientes" value={kpis.pendientes} sub={kpis.pct(kpis.pendientes)} color="text-yellow-600" />
        <KpiCard label="Rechazados" value={kpis.rechazados} sub={kpis.pct(kpis.rechazados)} color="text-red-600" />
        <KpiCard label="Inactivos" value={kpis.inactivos} sub={kpis.pct(kpis.inactivos)} color="text-gray-500" />
        <KpiCard label="En corrección" value={kpis.enCorreccion} color="text-orange-500" />
        <KpiCard label="Con vehículo" value={kpis.conVehiculo} color="text-blue-600" />
        <KpiCard label="Docs por vencer" value={kpis.docsPorVencer} color="text-purple-600" />
      </div>

      {/* ── Gráficas ── */}
      {showCharts && (
        <div ref={chartRef} className="px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Distribución por estado</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartEstados} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartEstados.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal por empresa (Top 8)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartEmpresas} layout="vertical" barSize={12}>
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Top 10 cargos</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartCargos} layout="vertical" barSize={10}>
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Tabla estilo Excel ── */}
      <div className="flex-1 min-h-0 mx-6 mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <RefreshCw size={24} className="animate-spin" />
              <p className="text-[13px]">Cargando datos…</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Filter size={28} />
              <p className="text-[13px]">Sin resultados con los filtros actuales</p>
              <button onClick={() => setFilters(INITIAL_FILTERS)} className="text-ek-500 text-[12px] hover:underline">
                Limpiar filtros
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full border-collapse text-[12px]" style={{ minWidth: 1400 }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                  <Th label="Nombre" sortKey="nombres" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                  <Th label="Cédula" sortKey="cedula" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="Empresa" sortKey="proveedor_nombre" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="min-w-[160px]" />
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">NIT</th>
                  <Th label="Cargo" sortKey="cargo" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="min-w-[140px]" />
                  <Th label="Actividad" sortKey="actividad_a_realizar" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="min-w-[160px]" />
                  <Th label="Estado" sortKey="estado" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="Municipio" sortKey="municipio_residencia" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="ARL" sortKey="arl" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="EPS" sortKey="eps" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="AFP" sortKey="afp" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="F. Entrada" sortKey="fecha_entrada" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="F. Fin" sortKey="fecha_fin" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Vehículo</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Placa</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Corr.</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Docs</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Verif.</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">⚠ Vence</th>
                  <Th label="Registro" sortKey="created_at" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const porVencer = docsVencenProximos(p.documentos);
                  const verificados = p.documentos.filter(d => d.verificado_auto).length;
                  return (
                    <tr
                      key={p.id}
                      className={clsx(
                        "border-b border-gray-100 hover:bg-ek-50/40 transition-colors",
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                        porVencer && "bg-orange-50/60 hover:bg-orange-50"
                      )}
                    >
                      <td className="px-3 py-2 text-gray-400 text-[11px] tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{p.nombres}</td>
                      <td className="px-3 py-2 text-gray-600 tabular-nums whitespace-nowrap">{p.cedula}</td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[180px] truncate" title={p.proveedor?.nombre}>{p.proveedor?.nombre ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-500 tabular-nums text-[11px] whitespace-nowrap">{p.proveedor?.nit ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[150px] truncate" title={p.cargo ?? ""}>{p.cargo ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[160px] truncate" title={p.actividad_a_realizar ?? ""}>{p.actividad_a_realizar ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", ESTADO_COLORS[p.estado] ?? "bg-gray-100 text-gray-500")}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.municipio_residencia ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-[11px]">{p.arl ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-[11px]">{p.eps ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-[11px]">{p.afp ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-[11px] tabular-nums">{fmtFecha(p.fecha_entrada)}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-[11px] tabular-nums">{fmtFecha(p.fecha_fin)}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-[11px]">{p.vehiculo?.tipo ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-[11px] font-mono">{p.vehiculo?.placa ?? "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {p.en_correccion && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">Sí</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-[11px] text-gray-600">{p.documentos.length}</td>
                      <td className="px-3 py-2 text-center text-[11px] text-gray-600">{verificados}</td>
                      <td className="px-3 py-2 text-center">
                        {porVencer && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">Pronto</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-[11px] tabular-nums">{fmtFechaHora(p.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer de tabla */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-400 flex items-center justify-between shrink-0">
            <span>{filtered.length} registro{filtered.length !== 1 ? "s" : ""} mostrado{filtered.length !== 1 ? "s" : ""}</span>
            <span>Haz clic en los encabezados para ordenar</span>
          </div>
        )}
      </div>
    </div>
  );
}
