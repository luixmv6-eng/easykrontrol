"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Upload, CheckCircle, AlertCircle, Loader2, FileText,
  Building2, Car, User, Users, Plus, Trash2, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import clsx from "clsx";
import type { Proveedor, TipoDocumento } from "@/types";
import {
  ACTIVIDADES_CONTRATISTA,
  CARGOS_CONTRATISTA,
  ARL_OPTIONS,
  EPS_OPTIONS,
  AFP_OPTIONS,
  TIPOS_VEHICULO,
  CATEGORIAS_LICENCIA,
  VEHICULOS_SOPORTES,
} from "@/types";

// ─── Types ────────────────────────────────────────────
type DocEntry = { file: File | null; fecha_inicio_vigencia: string };
type PersonaDocState = Record<"cedula" | "licencia" | "arl", DocEntry>;
type VehiculoDocState = Record<"soat" | "tecnicomecanica", DocEntry>;
type VehiculoData = {
  placa: string; marca: string; modelo: string; tipo: string;
  color: string; categoria_licencia: string; fecha_vencimiento_licencia: string;
};

type PersonaGrupo = {
  tempId: string;
  nombres: string;
  cedula: string;
  actividad_a_realizar: string;
  cargo: string;
  municipio_residencia: string;
  arlNombre: string;
  epsNombre: string;
  afpNombre: string;
  conVehiculo: boolean;
  vehiculoData: VehiculoData;
  personaDocs: PersonaDocState;
  vehiculoDocs: VehiculoDocState;
};

// ─── Constants ───────────────────────────────────────
const MAX_MB = 10;
const DOCS_PERSONA = [
  { tipo: "cedula"   as const, label: "Cédula de ciudadanía",   tieneVigencia: false },
  { tipo: "licencia" as const, label: "Licencia de conducción", tieneVigencia: false },
  { tipo: "arl"      as const, label: "ARL (Afiliación)",       tieneVigencia: false },
];
const DOCS_VEHICULO = [
  { tipo: "soat"            as const, label: "SOAT",          tieneVigencia: true },
  { tipo: "tecnicomecanica" as const, label: "Tecnomecánica", tieneVigencia: true },
];

// ─── Helpers ─────────────────────────────────────────
async function validarPDF(file: File): Promise<string | null> {
  if (file.type !== "application/pdf") return `"${file.name}" no es PDF.`;
  if (file.size > MAX_MB * 1024 * 1024) return `"${file.name}" supera ${MAX_MB}MB.`;
  if (file.size === 0) return `"${file.name}" está vacío.`;
  const buf = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buf);
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (sig !== "%PDF") return `"${file.name}" no es un PDF válido.`;
  return null;
}

const emptyPersonaDocs = (): PersonaDocState => ({
  cedula:   { file: null, fecha_inicio_vigencia: "" },
  licencia: { file: null, fecha_inicio_vigencia: "" },
  arl:      { file: null, fecha_inicio_vigencia: "" },
});
const emptyVehiculoDocs = (): VehiculoDocState => ({
  soat:            { file: null, fecha_inicio_vigencia: "" },
  tecnicomecanica: { file: null, fecha_inicio_vigencia: "" },
});
const emptyVehiculoData = (): VehiculoData => ({
  placa: "", marca: "", modelo: "", tipo: "",
  color: "", categoria_licencia: "", fecha_vencimiento_licencia: "",
});

interface Props {
  proveedores: Proveedor[];
  rol: string;
  proveedorIdFijo: string | null;
}

// ─── DocUploadItem ────────────────────────────────────
function DocItem({
  tipo, label, tieneVigencia, entry, onFile, onFecha, inputRef, onError,
}: {
  tipo: TipoDocumento; label: string; tieneVigencia: boolean;
  entry: DocEntry;
  onFile: (f: File | null) => void;
  onFecha: (v: string) => void;
  inputRef: (el: HTMLInputElement | null) => void;
  onError: (msg: string) => void;
}) {
  return (
    <div className="border border-gray-100 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-gray-400" />
          <span className="text-[13px] font-medium text-gray-700">{label}</span>
        </div>
        {entry.file && <span className="text-[11px] text-green-600 font-medium flex items-center gap-1"><CheckCircle size={11} /> Listo</span>}
      </div>
      <div
        onClick={() => { const el = document.getElementById(`input-${tipo}`) as HTMLInputElement; el?.click(); }}
        className={clsx(
          "border-2 border-dashed rounded-lg p-3 flex items-center gap-2 cursor-pointer transition-colors",
          entry.file ? "border-green-200 bg-green-50" : "border-gray-200 hover:border-ek-300 hover:bg-ek-50"
        )}
      >
        <Upload size={14} className={entry.file ? "text-green-500" : "text-gray-400"} />
        <span className={clsx("text-[12px]", entry.file ? "text-green-600" : "text-gray-400")}>
          {entry.file ? entry.file.name : "Clic para seleccionar PDF"}
        </span>
      </div>
      <input id={`input-${tipo}`} ref={inputRef} type="file" accept="application/pdf" className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0] ?? null;
          if (f) { const err = await validarPDF(f); if (err) { onError(err); e.target.value = ""; return; } }
          onFile(f);
        }}
      />
      {tieneVigencia && (
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Fecha inicio vigencia *</label>
          <input type="date" value={entry.fecha_inicio_vigencia} onChange={(e) => onFecha(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400"
          />
          {entry.fecha_inicio_vigencia && (
            <p className="text-[11px] text-gray-400 mt-1">Vence: <strong>{new Date(new Date(entry.fecha_inicio_vigencia).setFullYear(new Date(entry.fecha_inicio_vigencia).getFullYear() + 1)).toLocaleDateString("es-CO")}</strong></p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────
export default function RegistroPersonalForm({ proveedores, rol, proveedorIdFijo }: Props) {
  const supabase = createClient();
  const [modo, setModo] = useState<"individual" | "grupal">("individual");

  // ── Estado individual ──────────────────────────────
  const [proveedor_id, setProveedorId] = useState(proveedorIdFijo ?? "");
  const [nombres, setNombres] = useState("");
  const [cedula, setCedula] = useState("");
  const [actividad_a_realizar, setActividadARealizar] = useState("");
  const [cargo, setCargo] = useState("");
  const [municipio_residencia, setMunicipioResidencia] = useState("");
  const [arlNombre, setArlNombre] = useState("");
  const [epsNombre, setEpsNombre] = useState("");
  const [afpNombre, setAfpNombre] = useState("");
  const [fecha_entrada, setFechaEntrada] = useState("");
  const [fecha_fin, setFechaFin] = useState("");
  const [conVehiculo, setConVehiculo] = useState(false);
  const [vehiculoData, setVehiculoData] = useState<VehiculoData>(emptyVehiculoData);
  const [personaDocs, setPersonaDocs] = useState<PersonaDocState>(emptyPersonaDocs);
  const [vehiculoDocs, setVehiculoDocs] = useState<VehiculoDocState>(emptyVehiculoDocs);

  // ── Estado grupal ──────────────────────────────────
  const [grupoNombre, setGrupoNombre] = useState("");
  const [grupoProv, setGrupoProv] = useState(proveedorIdFijo ?? "");
  const [grupoFechaEntrada, setGrupoFechaEntrada] = useState("");
  const [grupoFechaFin, setGrupoFechaFin] = useState("");
  const [personas, setPersonas] = useState<PersonaGrupo[]>([]);
  const [addKey, setAddKey] = useState(0);
  // Persona actual en construcción (grupal)
  const [curNombres, setCurNombres] = useState("");
  const [curCedula, setCurCedula] = useState("");
  const [curActividad, setCurActividad] = useState("");
  const [curCargo, setCurCargo] = useState("");
  const [curMunicipio, setCurMunicipio] = useState("");
  const [curArlNombre, setCurArlNombre] = useState("");
  const [curEpsNombre, setCurEpsNombre] = useState("");
  const [curAfpNombre, setCurAfpNombre] = useState("");
  const [curConVehiculo, setCurConVehiculo] = useState(false);
  const [curVehiculo, setCurVehiculo] = useState<VehiculoData>(emptyVehiculoData);
  const [curPersonaDocs, setCurPersonaDocs] = useState<PersonaDocState>(emptyPersonaDocs);
  const [curVehiculoDocs, setCurVehiculoDocs] = useState<VehiculoDocState>(emptyVehiculoDocs);
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);

  // ── UI state ───────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  const indFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Upload helper ──────────────────────────────────
  async function uploadDocsPersona(
    personalId: string,
    pDocs: PersonaDocState,
    vDocs: VehiculoDocState,
    tieneVehiculo: boolean
  ) {
    for (const { tipo, tieneVigencia } of DOCS_PERSONA) {
      const entry = pDocs[tipo];
      if (!entry.file) continue;
      const path = `${personalId}/${tipo}.pdf`;
      await supabase.storage.from("documentos").upload(path, entry.file, { upsert: true, contentType: "application/pdf" });
      await fetch(`/api/personal/${personalId}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, url: path, nombre_archivo: entry.file.name,
          fecha_inicio_vigencia: tieneVigencia ? entry.fecha_inicio_vigencia : null }),
      });
    }
    if (tieneVehiculo) {
      for (const { tipo, tieneVigencia } of DOCS_VEHICULO) {
        const entry = vDocs[tipo as keyof VehiculoDocState];
        if (!entry.file) continue;
        const path = `${personalId}/${tipo}.pdf`;
        await supabase.storage.from("documentos").upload(path, entry.file, { upsert: true, contentType: "application/pdf" });
        await fetch(`/api/personal/${personalId}/documentos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo, url: path, nombre_archivo: entry.file.name,
            fecha_inicio_vigencia: tieneVigencia ? entry.fecha_inicio_vigencia : null }),
        });
      }
    }
  }

  // ── Validar docs ───────────────────────────────────
  function validarDocsPersona(pDocs: PersonaDocState, vDocs: VehiculoDocState, tieneVehiculo: boolean): string | null {
    const faltantesP = DOCS_PERSONA.filter((d) => !pDocs[d.tipo].file);
    if (faltantesP.length > 0) return `Faltan documentos: ${faltantesP.map((d) => d.label).join(", ")}`;
    if (tieneVehiculo) {
      const faltantesV = DOCS_VEHICULO.filter((d) => !vDocs[d.tipo as keyof VehiculoDocState].file);
      if (faltantesV.length > 0) return `Faltan documentos del vehículo: ${faltantesV.map((d) => d.label).join(", ")}`;
      const sinFecha = DOCS_VEHICULO.filter((d) => !vDocs[d.tipo as keyof VehiculoDocState].fecha_inicio_vigencia);
      if (sinFecha.length > 0) return `Falta fecha de vigencia para: ${sinFecha.map((d) => d.label).join(", ")}`;
    }
    return null;
  }

  // ── Submit individual ──────────────────────────────
  const handleSubmitIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!proveedor_id || !nombres.trim() || !cedula.trim()) {
      setError("Empresa, nombres y cédula son obligatorios."); return;
    }
    if (!fecha_entrada) { setError("La fecha de entrada es obligatoria."); return; }
    if (!actividad_a_realizar) { setError("La actividad a realizar es obligatoria."); return; }
    const docsErr = validarDocsPersona(personaDocs, vehiculoDocs, conVehiculo);
    if (docsErr) { setError(docsErr); return; }
    if (conVehiculo && !vehiculoData.placa.trim()) { setError("Ingresa la placa del vehículo."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedor_id, nombres: nombres.trim(), cedula: cedula.trim(),
          actividad_a_realizar: actividad_a_realizar || null,
          cargo: cargo || null,
          municipio_residencia: municipio_residencia || null,
          arl: arlNombre || null,
          eps: epsNombre || null,
          afp: afpNombre || null,
          fecha_entrada, fecha_fin: fecha_fin || null,
          vehiculo: conVehiculo ? vehiculoData : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al crear personal");
      await uploadDocsPersona(json.data.id, personaDocs, vehiculoDocs, conVehiculo);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally { setLoading(false); }
  };

  // ── Agregar persona al grupo ───────────────────────
  const handleAgregarPersona = async () => {
    setError("");
    if (!curNombres.trim() || !curCedula.trim()) { setError("Nombre y cédula son obligatorios."); return; }
    if (!curActividad) { setError("La actividad a realizar es obligatoria."); return; }
    const docsErr = validarDocsPersona(curPersonaDocs, curVehiculoDocs, curConVehiculo);
    if (docsErr) { setError(docsErr); return; }
    if (curConVehiculo && !curVehiculo.placa.trim()) { setError("Ingresa la placa del vehículo."); return; }

    setPersonas((prev) => [...prev, {
      tempId: crypto.randomUUID(),
      nombres: curNombres.trim(), cedula: curCedula.trim(),
      actividad_a_realizar: curActividad, cargo: curCargo,
      municipio_residencia: curMunicipio,
      arlNombre: curArlNombre, epsNombre: curEpsNombre, afpNombre: curAfpNombre,
      conVehiculo: curConVehiculo, vehiculoData: { ...curVehiculo },
      personaDocs: curPersonaDocs, vehiculoDocs: curVehiculoDocs,
    }]);
    setCurNombres(""); setCurCedula(""); setCurActividad(""); setCurCargo(""); setCurMunicipio("");
    setCurArlNombre(""); setCurEpsNombre(""); setCurAfpNombre("");
    setCurConVehiculo(false); setCurVehiculo(emptyVehiculoData());
    setCurPersonaDocs(emptyPersonaDocs()); setCurVehiculoDocs(emptyVehiculoDocs());
    setAddKey((k) => k + 1);
  };

  // ── Submit grupal ──────────────────────────────────
  const handleSubmitGrupal = async () => {
    setError("");
    if (!grupoProv) { setError("Selecciona la empresa."); return; }
    if (!grupoNombre.trim()) { setError("El nombre del grupo es obligatorio."); return; }
    if (!grupoFechaEntrada) { setError("La fecha de entrada es obligatoria."); return; }
    if (personas.length === 0) { setError("Agrega al menos una persona al grupo."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedor_id: grupoProv, nombre: grupoNombre.trim(),
          fecha_entrada: grupoFechaEntrada, fecha_fin: grupoFechaFin || null,
          personas: personas.map((p) => ({
            nombres: p.nombres, cedula: p.cedula,
            actividad_a_realizar: p.actividad_a_realizar || null,
            cargo: p.cargo || null,
            municipio_residencia: p.municipio_residencia || null,
            arl: p.arlNombre || null,
            eps: p.epsNombre || null,
            afp: p.afpNombre || null,
            vehiculo: p.conVehiculo ? p.vehiculoData : null,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al crear grupo");

      const created: { id: string; nombres: string }[] = json.data.personas;
      for (let i = 0; i < created.length; i++) {
        const { id, nombres: n } = created[i];
        const persona = personas.find((p) => p.nombres === n);
        if (!persona) continue;
        setProgress(`Subiendo documentos: ${i + 1}/${created.length} — ${n}`);
        await uploadDocsPersona(id, persona.personaDocs, persona.vehiculoDocs, persona.conVehiculo);
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally { setLoading(false); setProgress(""); }
  };

  // ── Selector empresa ───────────────────────────────
  function EmpresaSelector({ value, onChange, fijo }: { value: string; onChange: (v: string) => void; fijo: boolean }) {
    const emp = proveedores.find((p) => p.id === value) ?? null;
    if (proveedores.length === 0)
      return <div className="flex items-center gap-2 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-[12px] text-amber-700"><AlertCircle size={14} />{rol === "admin" ? "No hay empresas activas." : "Sin empresa vinculada."}</div>;
    if (fijo && emp)
      return <div className="flex items-center gap-3 border border-ek-200 bg-ek-50 rounded-lg px-4 py-3"><Building2 size={15} className="text-ek-500 shrink-0" /><div><p className="text-[13px] font-semibold text-gray-800">{emp.nombre}</p><p className="text-[12px] text-gray-500">NIT: {emp.nit}</p></div></div>;
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-ek-400" required>
        <option value="">— Seleccionar empresa —</option>
        {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre} · NIT {p.nit}</option>)}
      </select>
    );
  }

  // ── Seguridad social (reutilizable) ────────────────
  function SeguridadSocialFields({
    cargoVal, municipioVal, arlVal, epsVal, afpVal,
    onCargo, onMunicipio, onArl, onEps, onAfp,
  }: {
    cargoVal: string; municipioVal: string; arlVal: string; epsVal: string; afpVal: string;
    onCargo: (v: string) => void; onMunicipio: (v: string) => void;
    onArl: (v: string) => void; onEps: (v: string) => void; onAfp: (v: string) => void;
  }) {
    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Cargo</label>
            <select value={cargoVal} onChange={(e) => onCargo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400">
              <option value="">— Seleccionar cargo —</option>
              {CARGOS_CONTRATISTA.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Municipio de residencia</label>
            <input type="text" value={municipioVal} onChange={(e) => onMunicipio(e.target.value)}
              placeholder="Ej: Cali, Valle del Cauca"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">ARL</label>
            <select value={arlVal} onChange={(e) => onArl(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400">
              <option value="">— ARL —</option>
              {ARL_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">EPS</label>
            <select value={epsVal} onChange={(e) => onEps(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400">
              <option value="">— EPS —</option>
              {EPS_OPTIONS.map((ep) => <option key={ep} value={ep}>{ep}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">AFP</label>
            <select value={afpVal} onChange={(e) => onAfp(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400">
              <option value="">— AFP —</option>
              {AFP_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </>
    );
  }

  // ── Sección vehículo (reutilizable) ────────────────
  function VehiculoFields({
    vData, vDocs, prefix, tieneVehiculo, onToggle,
    onSetVData, onSetVDoc, onError,
  }: {
    vData: VehiculoData; vDocs: VehiculoDocState; prefix: string;
    tieneVehiculo: boolean; onToggle: () => void;
    onSetVData: (p: Partial<VehiculoData>) => void;
    onSetVDoc: (tipo: "soat" | "tecnicomecanica", p: Partial<DocEntry>) => void;
    onError: (msg: string) => void;
  }) {
    const soportes = vData.tipo ? VEHICULOS_SOPORTES[vData.tipo] : null;
    return (
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <button type="button" onClick={onToggle}
          className="w-full flex items-center justify-between text-[14px] font-semibold text-gray-700">
          <span className="flex items-center gap-2"><Car size={14} className="text-ek-500" /> Vehículo / Maquinaria (opcional)</span>
          {tieneVehiculo ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </button>
        {tieneVehiculo && (
          <>
            <p className="text-[12px] text-gray-400">Si el personal ingresa con vehículo o maquinaria, completa estos datos.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Tipo de vehículo / maquinaria</label>
                <select value={vData.tipo} onChange={(e) => onSetVData({ tipo: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400">
                  <option value="">— Seleccionar —</option>
                  {TIPOS_VEHICULO.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Placa *</label>
                <input type="text" value={vData.placa} onChange={(e) => onSetVData({ placa: e.target.value.toUpperCase() })}
                  placeholder="ABC123"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Marca</label>
                <input type="text" value={vData.marca} onChange={(e) => onSetVData({ marca: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Modelo</label>
                <input type="text" value={vData.modelo} onChange={(e) => onSetVData({ modelo: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Color</label>
                <input type="text" value={vData.color} onChange={(e) => onSetVData({ color: e.target.value })}
                  placeholder="Ej: Blanco"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Categoría licencia</label>
                <select value={vData.categoria_licencia} onChange={(e) => onSetVData({ categoria_licencia: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400">
                  <option value="">— Categoría —</option>
                  {CATEGORIAS_LICENCIA.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Vencimiento de licencia</label>
                <input type="date" value={vData.fecha_vencimiento_licencia}
                  onChange={(e) => onSetVData({ fecha_vencimiento_licencia: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
              </div>
            </div>

            {soportes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Info size={13} className="text-blue-500 shrink-0" />
                  <p className="text-[12px] font-semibold text-blue-800">Documentos requeridos para {vData.tipo}:</p>
                </div>
                <ul className="text-[12px] text-blue-700 list-disc ml-5 space-y-0.5">
                  {soportes.soportes.map((s) => <li key={s}>{s}</li>)}
                </ul>
                <p className="text-[11px] text-blue-600 mt-1.5">Licencia requerida: <strong>{soportes.licencia}</strong></p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Documentos del vehículo</p>
              {DOCS_VEHICULO.map(({ tipo, label, tieneVigencia }) => (
                <DocItem key={`${prefix}-${tipo}`} tipo={tipo} label={label} tieneVigencia={tieneVigencia}
                  entry={vDocs[tipo as keyof VehiculoDocState]}
                  onFile={(f) => onSetVDoc(tipo as "soat" | "tecnicomecanica", { file: f })}
                  onFecha={(v) => onSetVDoc(tipo as "soat" | "tecnicomecanica", { fecha_inicio_vigencia: v })}
                  inputRef={(el) => { if (prefix === "ind") indFileRefs.current[tipo] = el; }}
                  onError={onError}
                />
              ))}
            </div>
            <p className="text-[11px] text-gray-400">
              La vigencia del vehículo se tomará de las fechas de entrada y fin del personal asociado.
            </p>
          </>
        )}
      </section>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">
          {modo === "individual" ? "Personal registrado" : "Grupo enviado al administrador"}
        </h2>
        <p className="text-[13px] text-gray-400">
          {modo === "individual"
            ? "El registro quedó en estado Pendiente hasta que el administrador lo apruebe."
            : `Se enviaron ${personas.length} persona(s) para revisión agrupada.`}
        </p>
        <button onClick={() => {
          setSuccess(false); setNombres(""); setCedula(""); setActividadARealizar(""); setCargo("");
          setMunicipioResidencia(""); setArlNombre(""); setEpsNombre(""); setAfpNombre("");
          setFechaEntrada(""); setFechaFin(""); setConVehiculo(false);
          setVehiculoData(emptyVehiculoData()); setPersonaDocs(emptyPersonaDocs()); setVehiculoDocs(emptyVehiculoDocs());
          setGrupoNombre(""); setGrupoFechaEntrada(""); setGrupoFechaFin(""); setPersonas([]);
          setCurNombres(""); setCurCedula(""); setCurActividad(""); setCurCargo(""); setCurMunicipio("");
          setCurArlNombre(""); setCurEpsNombre(""); setCurAfpNombre("");
          if (!proveedorIdFijo) { setProveedorId(""); setGrupoProv(""); }
        }} className="mt-4 px-6 py-2.5 bg-ek-500 text-white rounded-lg text-[13px] font-semibold hover:bg-ek-600 transition-colors">
          Registrar {modo === "individual" ? "otro" : "nuevo grupo"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Registrar personal</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Registro individual o grupal de personal contratista.</p>
      </div>

      {/* Modo toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {(["individual", "grupal"] as const).map((m) => (
          <button key={m} onClick={() => { setModo(m); setError(""); }}
            className={clsx("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold transition-colors",
              modo === m ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            {m === "individual" ? <User size={14} /> : <Users size={14} />}
            {m === "individual" ? "Registro individual" : "Registro grupal"}
          </button>
        ))}
      </div>

      {/* ── Individual ────────────────────────────────── */}
      {modo === "individual" && (
        <form onSubmit={handleSubmitIndividual} className="space-y-4">
          {/* Empresa, actividad y fechas */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-[14px] font-semibold text-gray-700 flex items-center gap-2">
              <Building2 size={14} className="text-ek-500" /> Empresa y período de acceso
            </h2>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Empresa / Proveedor *</label>
              <EmpresaSelector value={proveedor_id} onChange={setProveedorId} fijo={!!proveedorIdFijo} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Actividad a realizar *</label>
              <select value={actividad_a_realizar} onChange={(e) => setActividadARealizar(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-ek-400">
                <option value="">— Seleccionar actividad —</option>
                {ACTIVIDADES_CONTRATISTA.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Fecha de entrada *</label>
                <input type="datetime-local" value={fecha_entrada} onChange={(e) => setFechaEntrada(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" required />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Fecha de finalización</label>
                <input type="datetime-local" value={fecha_fin} onChange={(e) => setFechaFin(e.target.value)}
                  min={fecha_entrada}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
              </div>
            </div>
          </section>

          {/* Datos persona + seguridad social */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-[14px] font-semibold text-gray-700 flex items-center gap-2">
              <User size={14} className="text-ek-500" /> Datos del personal
            </h2>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Nombres completos *</label>
              <input type="text" value={nombres} onChange={(e) => setNombres(e.target.value)} placeholder="Ej: Juan Carlos Pérez Gómez"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" required />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Número de cédula *</label>
              <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))} placeholder="Ej: 1234567890"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" required />
            </div>
            <SeguridadSocialFields
              cargoVal={cargo} municipioVal={municipio_residencia}
              arlVal={arlNombre} epsVal={epsNombre} afpVal={afpNombre}
              onCargo={setCargo} onMunicipio={setMunicipioResidencia}
              onArl={setArlNombre} onEps={setEpsNombre} onAfp={setAfpNombre}
            />
          </section>

          {/* Documentos persona */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-[14px] font-semibold text-gray-700 flex items-center gap-2">
              <FileText size={14} className="text-ek-500" /> Documentos del personal
            </h2>
            <p className="text-[12px] text-gray-400">Todos los documentos son obligatorios en formato PDF.</p>
            {DOCS_PERSONA.map(({ tipo, label, tieneVigencia }) => (
              <DocItem key={tipo} tipo={tipo} label={label} tieneVigencia={tieneVigencia}
                entry={personaDocs[tipo]}
                onFile={(f) => setPersonaDocs((prev) => ({ ...prev, [tipo]: { ...prev[tipo], file: f } }))}
                onFecha={(v) => setPersonaDocs((prev) => ({ ...prev, [tipo]: { ...prev[tipo], fecha_inicio_vigencia: v } }))}
                inputRef={(el) => { indFileRefs.current[tipo] = el; }}
                onError={setError}
              />
            ))}
          </section>

          {/* Vehículo */}
          <VehiculoFields
            vData={vehiculoData} vDocs={vehiculoDocs} prefix="ind"
            tieneVehiculo={conVehiculo} onToggle={() => setConVehiculo(!conVehiculo)}
            onSetVData={(p) => setVehiculoData((prev) => ({ ...prev, ...p }))}
            onSetVDoc={(tipo, p) => setVehiculoDocs((prev) => ({ ...prev, [tipo]: { ...prev[tipo], ...p } }))}
            onError={setError}
          />

          {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3"><AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" /><p className="text-[12.5px] text-red-600">{error}</p></div>}
          <button type="submit" disabled={loading || proveedores.length === 0}
            className="w-full py-3 bg-ek-500 text-white rounded-lg text-[13px] font-semibold hover:bg-ek-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : "Registrar personal"}
          </button>
        </form>
      )}

      {/* ── Grupal ────────────────────────────────────── */}
      {modo === "grupal" && (
        <div className="space-y-4">
          {/* Datos del grupo */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-[14px] font-semibold text-gray-700 flex items-center gap-2">
              <Users size={14} className="text-ek-500" /> Datos del grupo
            </h2>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Empresa *</label>
              <EmpresaSelector value={grupoProv} onChange={setGrupoProv} fijo={!!proveedorIdFijo} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Nombre del grupo / referencia *</label>
              <input type="text" value={grupoNombre} onChange={(e) => setGrupoNombre(e.target.value)}
                placeholder="Ej: Mantenimiento julio 2025 — Turno A"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Fecha de entrada *</label>
                <input type="datetime-local" value={grupoFechaEntrada} onChange={(e) => setGrupoFechaEntrada(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Fecha de finalización</label>
                <input type="datetime-local" value={grupoFechaFin} onChange={(e) => setGrupoFechaFin(e.target.value)}
                  min={grupoFechaEntrada}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
              </div>
            </div>
          </section>

          {/* Lista de personas añadidas */}
          {personas.length > 0 && (
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-gray-700">{personas.length} persona(s) añadida(s)</span>
                <span className="text-[11px] text-gray-400">Clic para expandir</span>
              </div>
              {personas.map((p) => (
                <div key={p.tempId} className="border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedPersona(expandedPersona === p.tempId ? null : p.tempId)}>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800">{p.nombres}</p>
                      <p className="text-[11px] text-gray-400">C.C. {p.cedula}{p.conVehiculo ? ` · 🚗 ${p.vehiculoData.placa}` : ""}{p.actividad_a_realizar ? ` · ${p.actividad_a_realizar}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">
                        {DOCS_PERSONA.filter((d) => p.personaDocs[d.tipo].file).length + (p.conVehiculo ? DOCS_VEHICULO.filter((d) => p.vehiculoDocs[d.tipo as keyof VehiculoDocState].file).length : 0)}/{DOCS_PERSONA.length + (p.conVehiculo ? DOCS_VEHICULO.length : 0)} docs
                      </span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPersonas((prev) => prev.filter((x) => x.tempId !== p.tempId)); }}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} className="text-red-400" /></button>
                    </div>
                  </div>
                  {expandedPersona === p.tempId && (
                    <div className="px-5 pb-3 text-[12px] text-gray-500 grid grid-cols-2 gap-1">
                      {DOCS_PERSONA.map((d) => <span key={d.tipo} className={p.personaDocs[d.tipo].file ? "text-green-600" : "text-red-500"}>
                        {p.personaDocs[d.tipo].file ? "✓" : "✗"} {d.label}
                      </span>)}
                      {p.conVehiculo && DOCS_VEHICULO.map((d) => <span key={d.tipo} className={p.vehiculoDocs[d.tipo as keyof VehiculoDocState].file ? "text-green-600" : "text-red-500"}>
                        {p.vehiculoDocs[d.tipo as keyof VehiculoDocState].file ? "✓" : "✗"} {d.label}
                      </span>)}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Añadir persona */}
          <section key={`add-${addKey}`} className="bg-white rounded-xl border border-ek-200 shadow-sm p-5 space-y-4">
            <h2 className="text-[14px] font-semibold text-gray-700 flex items-center gap-2">
              <Plus size={14} className="text-ek-500" /> Añadir persona al grupo
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Nombres completos *</label>
                <input type="text" value={curNombres} onChange={(e) => setCurNombres(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Cédula *</label>
                <input type="text" value={curCedula} onChange={(e) => setCurCedula(e.target.value.replace(/\D/g, ""))}
                  placeholder="1234567890"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Actividad a realizar *</label>
              <select value={curActividad} onChange={(e) => setCurActividad(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400">
                <option value="">— Seleccionar actividad —</option>
                {ACTIVIDADES_CONTRATISTA.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <SeguridadSocialFields
              cargoVal={curCargo} municipioVal={curMunicipio}
              arlVal={curArlNombre} epsVal={curEpsNombre} afpVal={curAfpNombre}
              onCargo={setCurCargo} onMunicipio={setCurMunicipio}
              onArl={setCurArlNombre} onEps={setCurEpsNombre} onAfp={setCurAfpNombre}
            />
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Documentos del personal</p>
              {DOCS_PERSONA.map(({ tipo, label, tieneVigencia }) => (
                <DocItem key={`cur-${tipo}-${addKey}`} tipo={`cur-${tipo}` as TipoDocumento} label={label} tieneVigencia={tieneVigencia}
                  entry={curPersonaDocs[tipo]}
                  onFile={(f) => setCurPersonaDocs((prev) => ({ ...prev, [tipo]: { ...prev[tipo], file: f } }))}
                  onFecha={(v) => setCurPersonaDocs((prev) => ({ ...prev, [tipo]: { ...prev[tipo], fecha_inicio_vigencia: v } }))}
                  inputRef={() => {}}
                  onError={setError}
                />
              ))}
            </div>

            {/* Vehículo dentro de persona grupal */}
            <div>
              <button type="button" onClick={() => setCurConVehiculo(!curConVehiculo)}
                className="flex items-center gap-2 text-[13px] font-semibold text-gray-600 hover:text-gray-800 transition-colors">
                <Car size={13} className="text-ek-500" />
                {curConVehiculo ? "▼" : "▶"} Ingresa con vehículo / maquinaria
              </button>
              {curConVehiculo && (
                <div className="mt-3 space-y-3 pl-4 border-l-2 border-ek-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[12px] font-medium text-gray-600 mb-1">Tipo</label>
                      <select value={curVehiculo.tipo} onChange={(e) => setCurVehiculo((prev) => ({ ...prev, tipo: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400">
                        <option value="">— Seleccionar —</option>
                        {TIPOS_VEHICULO.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-gray-600 mb-1">Placa *</label>
                      <input type="text" value={curVehiculo.placa}
                        onChange={(e) => setCurVehiculo((prev) => ({ ...prev, placa: e.target.value.toUpperCase() }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-gray-600 mb-1">Marca</label>
                      <input type="text" value={curVehiculo.marca}
                        onChange={(e) => setCurVehiculo((prev) => ({ ...prev, marca: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-gray-600 mb-1">Modelo</label>
                      <input type="text" value={curVehiculo.modelo}
                        onChange={(e) => setCurVehiculo((prev) => ({ ...prev, modelo: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-gray-600 mb-1">Color</label>
                      <input type="text" value={curVehiculo.color}
                        onChange={(e) => setCurVehiculo((prev) => ({ ...prev, color: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-gray-600 mb-1">Cat. licencia</label>
                      <select value={curVehiculo.categoria_licencia}
                        onChange={(e) => setCurVehiculo((prev) => ({ ...prev, categoria_licencia: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400">
                        <option value="">— Categoría —</option>
                        {CATEGORIAS_LICENCIA.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[12px] font-medium text-gray-600 mb-1">Vencimiento licencia</label>
                      <input type="date" value={curVehiculo.fecha_vencimiento_licencia}
                        onChange={(e) => setCurVehiculo((prev) => ({ ...prev, fecha_vencimiento_licencia: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400" />
                    </div>
                  </div>
                  {curVehiculo.tipo && VEHICULOS_SOPORTES[curVehiculo.tipo] && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <p className="text-[11px] font-semibold text-blue-800 mb-1">Docs requeridos para {curVehiculo.tipo}:</p>
                      <ul className="text-[11px] text-blue-700 list-disc ml-4">
                        {VEHICULOS_SOPORTES[curVehiculo.tipo].soportes.map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Documentos del vehículo</p>
                    {DOCS_VEHICULO.map(({ tipo, label, tieneVigencia }) => (
                      <DocItem key={`cur-v-${tipo}-${addKey}`} tipo={`cur-v-${tipo}` as TipoDocumento} label={label} tieneVigencia={tieneVigencia}
                        entry={curVehiculoDocs[tipo as keyof VehiculoDocState]}
                        onFile={(f) => setCurVehiculoDocs((prev) => ({ ...prev, [tipo]: { ...prev[tipo], file: f } }))}
                        onFecha={(v) => setCurVehiculoDocs((prev) => ({ ...prev, [tipo]: { ...prev[tipo], fecha_inicio_vigencia: v } }))}
                        inputRef={() => {}}
                        onError={setError}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3"><AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" /><p className="text-[12.5px] text-red-600">{error}</p></div>}

            <button type="button" onClick={handleAgregarPersona}
              className="w-full py-2.5 border-2 border-dashed border-ek-300 text-ek-600 rounded-lg text-[13px] font-semibold hover:bg-ek-50 transition-colors flex items-center justify-center gap-2">
              <Plus size={15} /> Agregar al grupo
            </button>
          </section>

          {/* Submit grupal */}
          {personas.length > 0 && (
            <div className="space-y-3">
              {loading && progress && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <Loader2 size={14} className="text-blue-500 animate-spin" />
                  <p className="text-[12.5px] text-blue-600">{progress}</p>
                </div>
              )}
              <button type="button" onClick={handleSubmitGrupal} disabled={loading}
                className="w-full py-3 bg-ek-500 text-white rounded-lg text-[13px] font-semibold hover:bg-ek-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={15} className="animate-spin" /> Enviando...</> : `Enviar grupo (${personas.length} persona(s)) al administrador`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
