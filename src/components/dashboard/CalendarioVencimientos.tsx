"use client";

import { useState } from "react";
import { Calendar, AlertTriangle, FileText } from "lucide-react";
import clsx from "clsx";

type Horizonte = 7 | 30 | 90;

interface DocVencimiento {
  id: string;
  tipo: string;
  fecha_vencimiento: string;
  personal: {
    id: string;
    nombres: string;
    cedula: string;
    proveedor: { nombre: string } | null;
  } | null;
}

const TIPO_LABELS: Record<string, string> = {
  cedula: "Cédula",
  licencia: "Licencia",
  arl: "ARL",
  soat: "SOAT",
  tecnicomecanica: "Tecnomecánica",
};

function diasRestantes(fecha: string): number {
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
}

function colorDias(dias: number): string {
  if (dias <= 7) return "text-red-600 bg-red-50 border-red-200";
  if (dias <= 30) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-green-600 bg-green-50 border-green-200";
}

export function CalendarioVencimientos({ docs }: { docs: DocVencimiento[] }) {
  const [horizonte, setHorizonte] = useState<Horizonte>(30);

  const limite = new Date(Date.now() + horizonte * 86400000).toISOString().split("T")[0];
  const filtrados = docs.filter((d) => d.fecha_vencimiento <= limite);

  const agrupados = filtrados.reduce<Record<string, DocVencimiento[]>>((acc, doc) => {
    const fecha = doc.fecha_vencimiento;
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(doc);
    return acc;
  }, {});

  const fechasOrdenadas = Object.keys(agrupados).sort();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Calendario de vencimientos</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {filtrados.length} documento(s) vencen en los próximos {horizonte} días
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([7, 30, 90] as Horizonte[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizonte(h)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors",
                horizonte === h
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {h} días
            </button>
          ))}
        </div>
      </div>

      {fechasOrdenadas.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Calendar size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-[13px] text-gray-400">
            No hay documentos que vencen en los próximos {horizonte} días.
          </p>
        </div>
      )}

      {fechasOrdenadas.map((fecha) => {
        const items = agrupados[fecha];
        const dias = diasRestantes(fecha);
        const color = colorDias(dias);

        return (
          <div key={fecha} className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-[13px] font-semibold text-gray-700">
                {new Date(fecha + "T12:00:00").toLocaleDateString("es-CO", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric",
                })}
              </span>
              <span className={clsx("text-[11px] font-medium px-2 py-0.5 rounded-full border", color)}>
                {dias <= 0 ? "HOY" : `en ${dias} día${dias !== 1 ? "s" : ""}`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {items.map((doc) => (
                <div
                  key={doc.id}
                  className={clsx(
                    "rounded-xl border p-4 flex items-start gap-3",
                    colorDias(dias)
                  )}
                >
                  {dias <= 30
                    ? <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    : <FileText size={16} className="shrink-0 mt-0.5" />
                  }
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate">
                      {doc.personal?.nombres ?? "—"}
                    </p>
                    <p className="text-[11px] opacity-75">C.C. {doc.personal?.cedula}</p>
                    <p className="text-[11px] opacity-75 truncate">
                      {doc.personal?.proveedor?.nombre ?? "—"}
                    </p>
                    <p className="text-[12px] font-medium mt-1">
                      {TIPO_LABELS[doc.tipo] ?? doc.tipo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
