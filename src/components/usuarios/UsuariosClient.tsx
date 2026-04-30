"use client";

import { useState } from "react";
import { UserPlus, Pencil, Trash2, KeyRound, Shield, Building2, CheckCircle, X } from "lucide-react";
import clsx from "clsx";

interface Usuario {
  id: string;
  username: string | null;
  full_name: string | null;
  rol: string;
  proveedor_id: string | null;
  mfa_enabled: boolean;
  created_at: string;
  proveedor: { nombre: string } | null;
}

interface Proveedor { id: string; nombre: string; }

interface Props {
  usuarios: Usuario[];
  proveedores: Proveedor[];
  currentUserId: string;
}

type Modal =
  | { type: "crear" }
  | { type: "editar"; user: Usuario }
  | { type: "password"; user: Usuario }
  | { type: "eliminar"; user: Usuario };

function Initials({ name, email }: { name: string | null; email: string | null }) {
  const str = name ?? email ?? "?";
  const parts = str.split(/[\s@]/);
  const ini = parts.length >= 2 ? parts[0][0] + parts[1][0] : str.slice(0, 2);
  return (
    <div className="w-9 h-9 rounded-full bg-ek-100 text-ek-700 flex items-center justify-center text-[13px] font-bold uppercase shrink-0">
      {ini}
    </div>
  );
}

function RolBadge({ rol }: { rol: string }) {
  return (
    <span className={clsx("text-[11px] font-semibold px-2 py-0.5 rounded-full",
      rol === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
    )}>
      {rol === "admin" ? "Admin" : "Proveedor"}
    </span>
  );
}

export function UsuariosClient({ usuarios, proveedores, currentUserId }: Props) {
  const [lista, setLista] = useState<Usuario[]>(usuarios);
  const [modal, setModal] = useState<Modal | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cerrar = () => { setModal(null); setFormError(null); };

  const handleCrear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); setFormError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fd.get("email"),
          password: fd.get("password"),
          full_name: fd.get("full_name"),
          rol: fd.get("rol"),
          proveedor_id: fd.get("proveedor_id") || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }
      // Recargar lista
      const r2 = await fetch("/api/usuarios");
      const d2 = await r2.json();
      setLista(d2.data ?? []);
      cerrar();
    } finally { setLoading(false); }
  };

  const handleEditar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (modal?.type !== "editar") return;
    setLoading(true); setFormError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/usuarios/${modal.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fd.get("full_name"),
          rol: fd.get("rol"),
          proveedor_id: fd.get("proveedor_id") || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }
      setLista((prev) => prev.map((u) => u.id === modal.user.id ? { ...u, ...data.data, proveedor: proveedores.find(p => p.id === data.data.proveedor_id) ?? null } : u));
      cerrar();
    } finally { setLoading(false); }
  };

  const handlePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (modal?.type !== "password") return;
    setLoading(true); setFormError(null);
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirmar = fd.get("confirmar") as string;
    if (password !== confirmar) { setFormError("Las contraseñas no coinciden"); setLoading(false); return; }
    try {
      const res = await fetch(`/api/usuarios/${modal.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }
      cerrar();
    } finally { setLoading(false); }
  };

  const handleEliminar = async () => {
    if (modal?.type !== "eliminar") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/usuarios/${modal.user.id}`, { method: "DELETE" });
      if (res.ok) {
        setLista((prev) => prev.filter((u) => u.id !== modal.user.id));
        cerrar();
      } else {
        const data = await res.json();
        setFormError(data.error);
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Gestión de usuarios</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">{lista.length} usuario(s) registrado(s)</p>
        </div>
        <button onClick={() => setModal({ type: "crear" })}
          className="flex items-center gap-2 px-4 py-2 bg-ek-500 hover:bg-ek-600 text-white rounded-xl text-[13px] font-semibold transition-colors shadow-sm">
          <UserPlus size={15} /> Crear usuario
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {lista.length === 0 && (
          <div className="p-10 text-center text-[13px] text-gray-400">No hay usuarios.</div>
        )}
        <div className="divide-y divide-gray-50">
          {lista.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Initials name={u.full_name} email={u.username} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-semibold text-gray-800 truncate">
                      {u.full_name ?? u.username ?? "Sin nombre"}
                    </p>
                    <RolBadge rol={u.rol} />
                    {u.mfa_enabled && (
                      <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                        <Shield size={9} /> MFA
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-400 truncate">{u.username}</p>
                  {u.proveedor && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Building2 size={10} /> {u.proveedor.nombre}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                <button onClick={() => setModal({ type: "editar", user: u })}
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setModal({ type: "password", user: u })}
                  className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Cambiar contraseña">
                  <KeyRound size={14} />
                </button>
                {u.id !== currentUserId && (
                  <button onClick={() => setModal({ type: "eliminar", user: u })}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modales ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[15px] font-bold text-gray-800">
                {modal.type === "crear" && "Crear usuario"}
                {modal.type === "editar" && "Editar usuario"}
                {modal.type === "password" && "Cambiar contraseña"}
                {modal.type === "eliminar" && "Eliminar usuario"}
              </h3>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[13px] text-red-700">{formError}</div>
              )}

              {/* Modal: Crear */}
              {modal.type === "crear" && (
                <form onSubmit={handleCrear} className="space-y-4">
                  <Field label="Nombre completo" name="full_name" type="text" placeholder="Juan Pérez" />
                  <Field label="Correo electrónico *" name="email" type="email" placeholder="correo@empresa.com" required />
                  <Field label="Contraseña * (mín. 8 caracteres)" name="password" type="password" placeholder="••••••••" required />
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Rol *</label>
                    <select name="rol" required className={selectCls}>
                      <option value="proveedor">Proveedor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Empresa vinculada</label>
                    <select name="proveedor_id" className={selectCls}>
                      <option value="">Sin empresa (admin)</option>
                      {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <ModalFooter loading={loading} onCancel={cerrar} label="Crear usuario" color="ek" />
                </form>
              )}

              {/* Modal: Editar */}
              {modal.type === "editar" && (
                <form onSubmit={handleEditar} className="space-y-4">
                  <Field label="Nombre completo" name="full_name" type="text" defaultValue={modal.user.full_name ?? ""} placeholder="Juan Pérez" />
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Rol *</label>
                    <select name="rol" defaultValue={modal.user.rol} required className={selectCls}>
                      <option value="proveedor">Proveedor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Empresa vinculada</label>
                    <select name="proveedor_id" defaultValue={modal.user.proveedor_id ?? ""} className={selectCls}>
                      <option value="">Sin empresa (admin)</option>
                      {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <ModalFooter loading={loading} onCancel={cerrar} label="Guardar cambios" color="blue" />
                </form>
              )}

              {/* Modal: Contraseña */}
              {modal.type === "password" && (
                <form onSubmit={handlePassword} className="space-y-4">
                  <p className="text-[13px] text-gray-500">
                    Cambiar contraseña de <strong>{modal.user.full_name ?? modal.user.username}</strong>
                  </p>
                  <Field label="Nueva contraseña *" name="password" type="password" placeholder="Mín. 8 caracteres" required />
                  <Field label="Confirmar contraseña *" name="confirmar" type="password" placeholder="Repite la contraseña" required />
                  <ModalFooter loading={loading} onCancel={cerrar} label="Cambiar contraseña" color="amber" />
                </form>
              )}

              {/* Modal: Eliminar */}
              {modal.type === "eliminar" && (
                <div className="space-y-4">
                  <p className="text-[13px] text-gray-600 leading-relaxed">
                    ¿Eliminar definitivamente a <strong>{modal.user.full_name ?? modal.user.username}</strong>?
                    Esta acción no se puede deshacer.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={cerrar} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={handleEliminar} disabled={loading}
                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[13px] font-semibold disabled:opacity-50">
                      {loading ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers de UI ──────────────────────────────────────

const selectCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400";

function Field({ label, name, type, placeholder, required, defaultValue }: {
  label: string; name: string; type: string; placeholder?: string; required?: boolean; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">{label}</label>
      <input
        type={type} name={name} placeholder={placeholder} required={required} defaultValue={defaultValue}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
      />
    </div>
  );
}

const colorMap = {
  ek: "bg-ek-500 hover:bg-ek-600",
  blue: "bg-blue-500 hover:bg-blue-600",
  amber: "bg-amber-500 hover:bg-amber-600",
};

function ModalFooter({ loading, onCancel, label, color }: {
  loading: boolean; onCancel: () => void; label: string; color: keyof typeof colorMap;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50">
        Cancelar
      </button>
      <button type="submit" disabled={loading}
        className={clsx("flex-1 py-2.5 text-white rounded-xl text-[13px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors", colorMap[color])}>
        {loading ? "Procesando..." : <><CheckCircle size={14} /> {label}</>}
      </button>
    </div>
  );
}
