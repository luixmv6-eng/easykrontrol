"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ClipboardList, Star, Shield, Building2, UsersRound, Wrench } from "lucide-react";
import clsx from "clsx";

const adminLinks = [
  { href: "/dashboard",                        label: "Panel de control",     icon: LayoutDashboard },
  { href: "/dashboard/proveedores",            label: "Empresas",             icon: Building2 },
  { href: "/dashboard/personal/consulta",      label: "Consulta de personal", icon: ClipboardList },
  { href: "/dashboard/personal/registro",      label: "Registrar personal",   icon: Users },
  { href: "/dashboard/personal/grupos",        label: "Ingresos grupales",    icon: UsersRound },
  { href: "/dashboard/personal/correcciones",  label: "Correcciones",         icon: Wrench },
  { href: "/dashboard/evaluaciones",           label: "Evaluaciones",         icon: Star },
  { href: "/dashboard/seguridad",              label: "Seguridad",            icon: Shield },
];

const proveedorLinks = [
  { href: "/dashboard",                   label: "Panel de control",  icon: LayoutDashboard },
  { href: "/dashboard/personal/registro", label: "Registrar personal", icon: Users },
  { href: "/dashboard/personal/consulta", label: "Mi personal",       icon: ClipboardList },
  { href: "/dashboard/seguridad",         label: "Seguridad",         icon: Shield },
];

export function DashboardSidebar({ rol }: { rol: string }) {
  const pathname = usePathname();
  const links = rol === "admin" ? adminLinks : proveedorLinks;

  return (
    <aside className="w-56 bg-white border-r border-gray-100 min-h-full py-6 shrink-0">
      <nav className="flex flex-col gap-1 px-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={clsx(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
              pathname === href
                ? "bg-ek-50 text-ek-600 border border-ek-100"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            )}>
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
