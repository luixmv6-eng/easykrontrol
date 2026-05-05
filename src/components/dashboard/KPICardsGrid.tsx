"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users, CheckCircle, Clock, AlertTriangle, Truck, Building2,
  UsersRound, Wrench, Archive, ChevronDown, ChevronUp, ArrowRight,
} from "lucide-react";
import type { DashboardKPIs } from "@/types";

interface CardDetail {
  description: string;
  extra?: string;
  href?: string;
  hrefLabel?: string;
}

interface KPICardDef {
  key: string;
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  detail: CardDetail;
}

function KPICard({ card, isOpen, onToggle }: {
  card: KPICardDef;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = card.icon;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider leading-tight pr-2">
            {card.label}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
              <Icon size={15} />
            </div>
            {isOpen
              ? <ChevronUp size={12} className="text-gray-300" />
              : <ChevronDown size={12} className="text-gray-300" />}
          </div>
        </div>
        <p className="text-3xl font-bold text-gray-800">{card.value}</p>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/60 space-y-2">
          <p className="text-[12px] text-gray-500 leading-relaxed">{card.detail.description}</p>
          {card.detail.extra && (
            <p className="text-[11px] text-gray-400">{card.detail.extra}</p>
          )}
          {card.detail.href && (
            <Link
              href={card.detail.href}
              className="inline-flex items-center gap-1 text-[12px] text-ek-600 font-medium hover:text-ek-700 transition-colors"
            >
              {card.detail.hrefLabel ?? "Ver más"} <ArrowRight size={11} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function KPICardsGrid({ kpis, esAdmin }: { kpis: DashboardKPIs; esAdmin: boolean }) {
  const [openCard, setOpenCard] = useState<string | null>(null);

  const toggle = (key: string) =>
    setOpenCard((prev) => (prev === key ? null : key));

  const pctAprobado =
    kpis.total_personal > 0
      ? Math.round((kpis.personal_aprobado / kpis.total_personal) * 100)
      : 0;

  const cards: KPICardDef[] = [
    {
      key: "activo",
      label: "Personal activo",
      value: kpis.total_personal,
      icon: Users,
      color: "bg-blue-50 text-blue-500",
      detail: {
        description: `Total del personal con registro activo en el sistema.`,
        extra: `Aprobados: ${kpis.personal_aprobado} · Pendientes: ${kpis.personal_pendiente} · Rechazados: ${kpis.personal_rechazado} · En corrección: ${kpis.personal_en_correccion}`,
        href: "/dashboard/personal/consulta",
        hrefLabel: "Ver todo el personal",
      },
    },
    {
      key: "aprobado",
      label: "Personal aprobado",
      value: kpis.personal_aprobado,
      icon: CheckCircle,
      color: "bg-green-50 text-green-500",
      detail: {
        description: `Representan el ${pctAprobado}% del total del personal activo. Han cumplido todos los requisitos documentales y están habilitados.`,
        href: "/dashboard/personal/consulta",
        hrefLabel: "Ver aprobados",
      },
    },
    {
      key: "pendiente",
      label: "Pendientes de aprobación",
      value: kpis.personal_pendiente,
      icon: Clock,
      color: "bg-amber-50 text-amber-500",
      detail: {
        description:
          kpis.personal_pendiente > 0
            ? "Personas esperando revisión de documentos. Se requiere acción del administrador."
            : "No hay personas en espera de aprobación actualmente.",
        href: "/dashboard/personal/consulta",
        hrefLabel: "Revisar pendientes",
      },
    },
    {
      key: "docs_vencer",
      label: "Docs por vencer (60 días)",
      value: kpis.documentos_por_vencer,
      icon: AlertTriangle,
      color: "bg-red-50 text-red-500",
      detail: {
        description:
          kpis.documentos_por_vencer > 0
            ? "Documentos próximos a vencer en los siguientes 60 días. Notifica a los proveedores afectados para evitar suspensiones."
            : "Todos los documentos están vigentes para los próximos 60 días.",
        href: "/dashboard/personal/consulta",
        hrefLabel: "Ver documentos próximos a vencer",
      },
    },
    {
      key: "vehiculos",
      label: "Vehículos activos",
      value: kpis.vehiculos_activos,
      icon: Truck,
      color: "bg-purple-50 text-purple-500",
      detail: {
        description:
          "Vehículos registrados y activos en el sistema, asociados al personal aprobado.",
        href: "/dashboard/personal/consulta",
        hrefLabel: "Ver personal con vehículo",
      },
    },
    {
      key: "proveedores",
      label: "Proveedores activos",
      value: kpis.proveedores_activos,
      icon: Building2,
      color: "bg-ek-50 text-ek-600",
      detail: {
        description: "Empresas y proveedores con estado activo registrados en el sistema.",
        href: "/dashboard/proveedores",
        hrefLabel: "Gestionar empresas",
      },
    },
    ...(esAdmin
      ? ([
          {
            key: "grupos",
            label: "Ingresos grupales pendientes",
            value: kpis.grupos_pendientes,
            icon: UsersRound,
            color: "bg-indigo-50 text-indigo-500",
            detail: {
              description:
                kpis.grupos_pendientes > 0
                  ? "Grupos de ingreso enviados por proveedores que requieren revisión del administrador."
                  : "No hay grupos de ingreso pendientes de revisión.",
              href: "/dashboard/personal/grupos",
              hrefLabel: "Revisar grupos",
            },
          },
          {
            key: "correccion",
            label: "En corrección",
            value: kpis.personal_en_correccion,
            icon: Wrench,
            color: "bg-orange-50 text-orange-500",
            detail: {
              description:
                kpis.personal_en_correccion > 0
                  ? "Personal con documentación en proceso de corrección, esperando una segunda revisión."
                  : "No hay personal en proceso de corrección actualmente.",
              href: "/dashboard/personal/correcciones",
              hrefLabel: "Ver correcciones",
            },
          },
        ] as KPICardDef[])
      : []),
    {
      key: "historial",
      label: "En historial",
      value: kpis.personal_historial,
      icon: Archive,
      color: "bg-gray-100 text-gray-400",
      detail: {
        description:
          "Personal inactivo o archivado. Han salido del sistema pero su historial se conserva para consulta.",
        href: "/dashboard/personal/consulta",
        hrefLabel: "Ver historial",
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <KPICard
          key={card.key}
          card={card}
          isOpen={openCard === card.key}
          onToggle={() => toggle(card.key)}
        />
      ))}
    </div>
  );
}
