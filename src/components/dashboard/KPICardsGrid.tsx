"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users, CheckCircle, Clock, AlertTriangle, Truck, Building2,
  UsersRound, Wrench, Archive, X, ArrowRight, Loader2,
} from "lucide-react";
import type { DashboardKPIs } from "@/types";

type Fila = { empresa: string; total: number };

interface CardDef {
  key: string;
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  barColor: string;
  href: string;
  hrefLabel: string;
  esProveedores?: boolean;
}

// ── Card simple ────────────────────────────────────────
function KPICard({ card, onClick }: { card: CardDef; onClick: () => void }) {
  const Icon = card.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left w-full hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider leading-tight pr-2">
          {card.label}
        </p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-800">{card.value}</p>
      <p className="text-[11px] text-gray-300 mt-1.5">Toca para ver desglose</p>
    </button>
  );
}

// ── Modal de detalle ───────────────────────────────────
function DetalleModal({
  card,
  onClose,
}: {
  card: CardDef;
  onClose: () => void;
}) {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const Icon = card.icon;

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/detalle?tipo=${card.key}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al cargar");
      setFilas(json.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, [card.key]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const maximo = filas && filas.length > 0 ? Math.max(...filas.map((f) => f.total)) : 1;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
              <Icon size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-gray-800 leading-tight">{card.label}</h2>
              <p className="text-[12px] text-gray-400">
                {card.value} {card.value === 1 ? "registro" : "registros"} en total
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={22} className="animate-spin text-gray-300" />
              <p className="text-[12px] text-gray-400">Cargando desglose...</p>
            </div>
          )}

          {error && (
            <p className="text-[13px] text-red-500 text-center py-8">{error}</p>
          )}

          {!loading && !error && filas !== null && (
            <>
              {filas.length === 0 ? (
                <p className="text-[13px] text-gray-400 text-center py-8">
                  No hay registros para mostrar.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Subtítulo */}
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {card.esProveedores ? "Empresas activas" : "Desglose por empresa"}
                  </p>

                  {filas.map((fila, i) => (
                    <div key={`${fila.empresa}-${i}`} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
                          <span className="text-[13px] text-gray-700 font-medium truncate">{fila.empresa}</span>
                        </div>
                        {!card.esProveedores && (
                          <span className="text-[14px] font-bold text-gray-800 shrink-0">
                            {fila.total}
                          </span>
                        )}
                      </div>
                      {!card.esProveedores && (
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${card.barColor}`}
                            style={{ width: `${Math.max(Math.round((fila.total / maximo) * 100), 4)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Resumen total (solo si no es lista de proveedores) */}
                  {!card.esProveedores && filas.length > 1 && (
                    <div className="pt-2 border-t border-gray-100 flex justify-between text-[12px]">
                      <span className="text-gray-400 font-medium">
                        {filas.length} empresa{filas.length !== 1 ? "s" : ""}
                      </span>
                      <span className="font-bold text-gray-700">Total: {card.value}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <Link
            href={card.href}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-ek-500 text-white rounded-xl text-[13px] font-semibold hover:bg-ek-600 transition-colors"
          >
            {card.hrefLabel} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Grid principal ─────────────────────────────────────
export function KPICardsGrid({ kpis, esAdmin }: { kpis: DashboardKPIs; esAdmin: boolean }) {
  const [modalCard, setModalCard] = useState<CardDef | null>(null);

  const cards: CardDef[] = [
    {
      key: "activo",
      label: "Personal activo",
      value: kpis.total_personal,
      icon: Users,
      color: "bg-blue-50 text-blue-500",
      barColor: "bg-blue-400",
      href: "/dashboard/personal/consulta",
      hrefLabel: "Ver todo el personal",
    },
    {
      key: "aprobado",
      label: "Personal aprobado",
      value: kpis.personal_aprobado,
      icon: CheckCircle,
      color: "bg-green-50 text-green-500",
      barColor: "bg-green-400",
      href: "/dashboard/personal/consulta",
      hrefLabel: "Ver aprobados",
    },
    {
      key: "pendiente",
      label: "Pendientes de aprobación",
      value: kpis.personal_pendiente,
      icon: Clock,
      color: "bg-amber-50 text-amber-500",
      barColor: "bg-amber-400",
      href: "/dashboard/personal/consulta",
      hrefLabel: "Revisar pendientes",
    },
    {
      key: "docs_vencer",
      label: "Docs por vencer (60 días)",
      value: kpis.documentos_por_vencer,
      icon: AlertTriangle,
      color: "bg-red-50 text-red-500",
      barColor: "bg-red-400",
      href: "/dashboard/personal/consulta",
      hrefLabel: "Ver documentos próximos a vencer",
    },
    {
      key: "vehiculos",
      label: "Vehículos activos",
      value: kpis.vehiculos_activos,
      icon: Truck,
      color: "bg-purple-50 text-purple-500",
      barColor: "bg-purple-400",
      href: "/dashboard/personal/consulta",
      hrefLabel: "Ver consulta de personal",
    },
    {
      key: "proveedores",
      label: "Proveedores activos",
      value: kpis.proveedores_activos,
      icon: Building2,
      color: "bg-ek-50 text-ek-600",
      barColor: "bg-ek-400",
      href: "/dashboard/proveedores",
      hrefLabel: "Gestionar empresas",
      esProveedores: true,
    },
    ...(esAdmin
      ? ([
          {
            key: "grupos",
            label: "Ingresos grupales pendientes",
            value: kpis.grupos_pendientes,
            icon: UsersRound,
            color: "bg-indigo-50 text-indigo-500",
            barColor: "bg-indigo-400",
            href: "/dashboard/personal/grupos",
            hrefLabel: "Revisar grupos",
          },
          {
            key: "correccion",
            label: "En corrección",
            value: kpis.personal_en_correccion,
            icon: Wrench,
            color: "bg-orange-50 text-orange-500",
            barColor: "bg-orange-400",
            href: "/dashboard/personal/correcciones",
            hrefLabel: "Ver correcciones",
          },
        ] as CardDef[])
      : []),
    {
      key: "historial",
      label: "En historial",
      value: kpis.personal_historial,
      icon: Archive,
      color: "bg-gray-100 text-gray-400",
      barColor: "bg-gray-300",
      href: "/dashboard/personal/consulta",
      hrefLabel: "Ver historial",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {cards.map((card) => (
          <KPICard
            key={card.key}
            card={card}
            onClick={() => setModalCard(card)}
          />
        ))}
      </div>

      {modalCard && (
        <DetalleModal
          card={modalCard}
          onClose={() => setModalCard(null)}
        />
      )}
    </>
  );
}
