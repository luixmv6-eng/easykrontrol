"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Plus, Building2, Edit2, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Phone, Mail, MapPin, Hash,
  Users, UserPlus, UserX, Loader2, ShieldCheck,
} from "lucide-react";
import clsx from "clsx";
import type { Proveedor } from "@/types";

interface UsuarioVinculado {
  id: string;
  username: string | null;
  full_name: string | null;
  rol: string;
  proveedor_id: string | null;
  mfa_enabled: boolean;
}

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  activo:     { label: "Activo",     cls: "bg-green-100 text-green-700" },
  inactivo:   { label: "Inactivo",   cls: "bg-gray-100 text-gray-500" },
  suspendido: { label: "Suspendido", cls: "bg-red-100 text-red-600" },
};

const emptyForm = { nombre: "", nit: "", email: "", telefono: "", direccion: "" };

// ── Panel de usuarios de una empresa ──────────────────
function UsuariosPanel({ empresa }: { empresa: Proveedor }) {
  const [usuarios, setUsuarios] = useState<UsuarioVinculado[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [emailBuscar, setEmailBuscar] = useState("");
  const [resultadoBusqueda, setResultadoBusqueda] = useState<UsuarioVinculado | null | "no-encontrado">(null);
  const [buscando, setBuscando] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const [errorPanel, setErrorPanel] = useState("");

  const cargarUsuarios = useCallback(async () => {
    if (cargado) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/usuarios?proveedor_id=${empresa.id}`);
      const json = await res.json();
      setUsuarios(json.data ?? []);
      setCargado(true);
    } finally {
      setCargando(false);
    }
  }, [empresa.id, cargado]);

  // Se llama al montar el panel (cuando se expande la empresa)
  const iniciar = useCallback(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // Buscar usuario por email para vincular
  const buscarUsuario = async () => {
    if (!emailBuscar.trim()) return;
    setBuscando(true);
    setResultadoBusqueda(null);
    setErrorPanel("");
    try {
      const res = await fetch(`/api/usuarios`);
      const json = await res.json();
      const todos: UsuarioVinculado[] = json.data ?? [];
      const encontrado = todos.find(
        (u) => u.username?.toLowerCase() === emailBuscar.trim().toLowerCase()
      );
      setResultadoBusqueda(encontrado ?? "no-encontrado");
    } finally {
      setBuscando(false);
    }
  };

  const vincularUsuario = async (usuario: UsuarioVinculado) => {
    setVinculando(true);
    setErrorPanel("");
    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedor_id: empresa.id, rol: "proveedor" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUsuarios((prev) => [...(prev ?? []), { ...usuario, proveedor_id: empresa.id, rol: "proveedor" }]);
      setResultadoBusqueda(null);
      setEmailBuscar("");
    } catch (err: unknown) {
      setErrorPanel(err instanceof Error ? err.message : "Error al vincular");
    } finally {
      setVinculando(false);
    }
  };

  const desvincularUsuario = async (usuario: UsuarioVinculado) => {
    if (!confirm(`¿Desvincular a ${usuario.username ?? usuario.id} de esta empresa?`)) return;
    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedor_id: null }),
      });
      if (!res.ok) throw new Error("Error al desvincular");
      setUsuarios((prev) => (prev ?? []).filter((u) => u.id !== usuario.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al desvincular");
    }
  };

  // Cargar al montar el panel (cuando se expande la empresa)
  useEffect(() => { iniciar(); }, [iniciar]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users size={13} className="text-gray-400" />
        <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
          Usuarios vinculados
        </p>
      </div>

      {/* Lista de usuarios actuales */}
      {cargando && (
        <div className="flex items-center gap-2 text-[12px] text-gray-400">
          <Loader2 size={13} className="animate-spin" /> Cargando usuarios...
        </div>
      )}

      {!cargando && usuarios !== null && (
        <div className="space-y-1.5">
          {usuarios.length === 0 && (
            <p className="text-[12px] text-gray-400 italic">
              Ningún usuario vinculado aún.
            </p>
          )}
          {usuarios.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-ek-100 rounded-full flex items-center justify-center text-[10px] font-bold text-ek-600">
                  {(u.username ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-700">
                    {u.username ?? u.id}
                  </p>
                  {u.full_name && (
                    <p className="text-[11px] text-gray-400">{u.full_name}</p>
                  )}
                </div>
                {u.mfa_enabled && (
                  <span title="MFA activo">
                    <ShieldCheck size={12} className="text-green-500" />
                  </span>
                )}
              </div>
              <button
                onClick={() => desvincularUsuario(u)}
                className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 transition-colors"
              >
                <UserX size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario para vincular un usuario */}
      <div className="border-t border-gray-100 pt-3 space-y-2">
        <p className="text-[12px] font-medium text-gray-600 flex items-center gap-1.5">
          <UserPlus size={13} className="text-ek-400" />
          Vincular usuario existente
        </p>
        <p className="text-[11px] text-gray-400">
          El usuario debe haber sido creado en Supabase Auth (Dashboard → Authentication → Users).
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={emailBuscar}
            onChange={(e) => { setEmailBuscar(e.target.value); setResultadoBusqueda(null); }}
            onKeyDown={(e) => e.key === "Enter" && buscarUsuario()}
            placeholder="correo@ejemplo.com"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ek-400"
          />
          <button
            onClick={buscarUsuario}
            disabled={buscando || !emailBuscar.trim()}
            className="px-3 py-1.5 bg-ek-500 text-white rounded-lg text-[12px] font-medium hover:bg-ek-600 transition-colors disabled:opacity-50"
          >
            {buscando ? <Loader2 size={12} className="animate-spin" /> : "Buscar"}
          </button>
        </div>

        {/* Resultado de búsqueda */}
        {resultadoBusqueda === "no-encontrado" && (
          <p className="text-[12px] text-red-500">
            No se encontró ningún usuario con ese correo. Debe iniciar sesión primero.
          </p>
        )}
        {resultadoBusqueda && resultadoBusqueda !== "no-encontrado" && (
          <div className="flex items-center justify-between bg-ek-50 border border-ek-200 rounded-lg px-3 py-2">
            <div>
              <p className="text-[12px] font-medium text-gray-800">
                {resultadoBusqueda.username}
              </p>
              {resultadoBusqueda.proveedor_id && resultadoBusqueda.proveedor_id !== empresa.id && (
                <p className="text-[11px] text-amber-600">
                  Actualmente vinculado a otra empresa. Se reasignará.
                </p>
              )}
              {resultadoBusqueda.proveedor_id === empresa.id && (
                <p className="text-[11px] text-green-600">Ya está vinculado a esta empresa.</p>
              )}
            </div>
            {resultadoBusqueda.proveedor_id !== empresa.id && (
              <button
                onClick={() => vincularUsuario(resultadoBusqueda as UsuarioVinculado)}
                disabled={vinculando}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ek-500 text-white rounded-lg text-[12px] font-medium hover:bg-ek-600 transition-colors disabled:opacity-50"
              >
                {vinculando
                  ? <Loader2 size={12} className="animate-spin" />
                  : <><UserPlus size={12} /> Vincular</>
                }
              </button>
            )}
          </div>
        )}

        {errorPanel && (
          <p className="text-[12px] text-red-600">{errorPanel}</p>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────
export function ProveedoresClient({ proveedores: inicial }: { proveedores: Proveedor[] }) {
  const [lista, setLista] = useState<Proveedor[]>(inicial);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const abrirNuevo = () => {
    setEditando(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  const abrirEditar = (p: Proveedor) => {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      nit: p.nit,
      email: p.email ?? "",
      telefono: p.telefono ?? "",
      direccion: p.direccion ?? "",
    });
    setError("");
    setShowForm(true);
    setExpandido(null);
  };

  const cerrarForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(emptyForm);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (editando) {
        const res = await fetch(`/api/proveedores/${editando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Error al actualizar");
        setLista((prev) => prev.map((p) => (p.id === editando.id ? json.data : p)));
      } else {
        const res = await fetch("/api/proveedores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Error al crear");
        setLista((prev) => [...prev, json.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }
      cerrarForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (p: Proveedor, nuevoEstado: Proveedor["estado"]) => {
    try {
      const res = await fetch(`/api/proveedores/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setLista((prev) => prev.map((x) => (x.id === p.id ? json.data : x)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al cambiar estado");
    }
  };

  const activos = lista.filter((p) => p.estado === "activo").length;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Empresas / Proveedores</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {lista.length} registrada(s) · {activos} activa(s)
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-ek-500 text-white rounded-lg text-[13px] font-semibold hover:bg-ek-600 transition-colors"
        >
          <Plus size={15} />
          Nueva empresa
        </button>
      </div>

      {/* Diagrama lógico — solo si no hay empresas */}
      {lista.length === 0 && !showForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-[12px] text-blue-700 space-y-1 leading-relaxed">
          <p className="font-semibold">¿Por dónde empezar?</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
            <li>Crea una empresa aquí (nombre + NIT mínimo)</li>
            <li>El usuario proveedor inicia sesión al menos una vez</li>
            <li>Regresa aquí, expande la empresa y usa "Vincular usuario"</li>
            <li>Desde ese momento, ese usuario solo verá su empresa al registrar personal</li>
          </ol>
        </div>
      )}

      {/* Formulario crear / editar */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-[14px] font-semibold text-gray-700 mb-4">
            {editando ? "Editar empresa" : "Registrar nueva empresa"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">
                  Nombre de la empresa *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Transportes García S.A.S"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">
                  NIT *
                </label>
                <input
                  type="text"
                  value={form.nit}
                  onChange={(e) => setForm({ ...form, nit: e.target.value })}
                  placeholder="Ej: 900123456-1"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contacto@empresa.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="Ej: 3001234567"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[12px] font-medium text-gray-600 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Ej: Calle 10 # 5-30, Bogotá"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
                />
              </div>
            </div>

            {error && (
              <p className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={cerrarForm}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-ek-500 text-white rounded-lg text-[13px] font-semibold hover:bg-ek-600 transition-colors disabled:opacity-60"
              >
                {loading ? "Guardando..." : editando ? "Actualizar" : "Registrar empresa"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {lista.length === 0 && !showForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Building2 size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-[13px] text-gray-400 font-medium">No hay empresas registradas</p>
            <p className="text-[12px] text-gray-300 mt-1">
              Crea la primera empresa para comenzar a registrar personal.
            </p>
          </div>
        )}
        {lista.map((p) => {
          const isOpen = expandido === p.id;
          const badge = ESTADO_BADGE[p.estado] ?? { label: p.estado, cls: "bg-gray-100 text-gray-500" };
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Fila resumen */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandido(isOpen ? null : p.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-ek-50 rounded-lg flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-ek-500" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-gray-800">{p.nombre}</p>
                    <p className="text-[12px] text-gray-400">NIT: {p.nit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx("text-[11px] font-medium px-2 py-0.5 rounded-full", badge.cls)}>
                    {badge.label}
                  </span>
                  {isOpen
                    ? <ChevronUp size={15} className="text-gray-400" />
                    : <ChevronDown size={15} className="text-gray-400" />}
                </div>
              </div>

              {/* Detalle expandido */}
              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-5">
                  {/* Datos de la empresa */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] text-gray-600">
                    <div className="flex items-center gap-2">
                      <Hash size={13} className="text-gray-400 shrink-0" />
                      <span><strong>NIT:</strong> {p.nit}</span>
                    </div>
                    {p.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-gray-400 shrink-0" />
                        <span>{p.email}</span>
                      </div>
                    )}
                    {p.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-gray-400 shrink-0" />
                        <span>{p.telefono}</span>
                      </div>
                    )}
                    {p.direccion && (
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span>{p.direccion}</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones de la empresa */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => abrirEditar(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Edit2 size={12} /> Editar
                    </button>
                    {p.estado === "activo" ? (
                      <button
                        onClick={() => cambiarEstado(p, "inactivo")}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-[12px] hover:bg-red-50 transition-colors"
                      >
                        <XCircle size={12} /> Desactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => cambiarEstado(p, "activo")}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-green-200 text-green-600 rounded-lg text-[12px] hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle size={12} /> Activar
                      </button>
                    )}
                  </div>

                  {/* Panel de usuarios */}
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <UsuariosPanel empresa={p} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
