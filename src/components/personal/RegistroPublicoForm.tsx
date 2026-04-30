"use client";

import { useState } from "react";
import { CheckCircle, Upload } from "lucide-react";
import clsx from "clsx";

interface Proveedor {
  id: string;
  nombre: string;
}

interface Props {
  proveedores: Proveedor[];
}

export function RegistroPublicoForm({ proveedores }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const res = await fetch("/api/registro-publico", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar el registro");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Solicitud enviada</h2>
        <p className="text-[14px] text-gray-500 leading-relaxed">
          Tu solicitud fue enviada exitosamente. El administrador revisará tu información y te notificará el resultado.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-[13px] text-ek-600 hover:text-ek-700 font-medium"
        >
          Registrar otra persona
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-ek-500 px-8 py-6">
        <h1 className="text-white font-bold text-xl">Registro de personal contratista</h1>
        <p className="text-white/80 text-[13px] mt-1">
          Completa el formulario para registrar el ingreso de personal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Empresa *</label>
            <select
              name="proveedor_id"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
            >
              <option value="">Seleccionar empresa</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Nombre completo *</label>
            <input
              type="text"
              name="nombres"
              required
              placeholder="Nombre y apellidos"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Cédula *</label>
            <input
              type="text"
              name="cedula"
              required
              placeholder="Número de cédula"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Fecha de entrada</label>
            <input
              type="datetime-local"
              name="fecha_entrada"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Fecha fin (opcional)</label>
            <input
              type="datetime-local"
              name="fecha_fin"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ek-400"
            />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Documentos</p>

          {[
            { name: "cedula_doc", label: "Cédula de ciudadanía *", required: true },
            { name: "licencia_doc", label: "Licencia de conducción", required: false },
            { name: "arl_doc", label: "ARL", required: false },
          ].map(({ name, label, required }) => (
            <div key={name}>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
                {label}
              </label>
              <label
                className={clsx(
                  "flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors",
                  "border-gray-200 hover:border-ek-400 hover:bg-ek-50/50"
                )}
              >
                <Upload size={16} className="text-gray-400 shrink-0" />
                <span className="text-[12px] text-gray-500">
                  Toca para seleccionar archivo o tomar foto
                </span>
                <input
                  type="file"
                  name={name}
                  required={required}
                  accept=".pdf,image/*"
                  capture="environment"
                  className="sr-only"
                />
              </label>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-ek-500 hover:bg-ek-600 text-white font-semibold rounded-xl text-[14px] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="animate-spin text-lg">⟳</span> Enviando...</>
          ) : (
            "Enviar solicitud"
          )}
        </button>
      </form>
    </div>
  );
}
