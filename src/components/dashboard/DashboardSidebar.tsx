"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ClipboardList, Star, Shield, Building2, UsersRound, Wrench, X, Calendar, ScrollText, UserCog } from "lucide-react";
import clsx from "clsx";

const adminLinks = [
  { href: "/dashboard",                        label: "Panel de control",     icon: LayoutDashboard },
  { href: "/dashboard/proveedores",            label: "Empresas",             icon: Building2 },
  { href: "/dashboard/personal/consulta",      label: "Consulta de personal", icon: ClipboardList },
  { href: "/dashboard/personal/registro",      label: "Registrar personal",   icon: Users },
  { href: "/dashboard/personal/grupos",        label: "Ingresos grupales",    icon: UsersRound },
  { href: "/dashboard/personal/correcciones",  label: "Correcciones",         icon: Wrench },
  { href: "/dashboard/calendario",             label: "Calendario",           icon: Calendar },
  { href: "/dashboard/evaluaciones",           label: "Evaluaciones",         icon: Star },
  { href: "/dashboard/usuarios",               label: "Usuarios",             icon: UserCog },
  { href: "/dashboard/auditoria",              label: "Auditoría",            icon: ScrollText },
  { href: "/dashboard/seguridad",              label: "Seguridad",            icon: Shield },
];

const proveedorLinks = [
  { href: "/dashboard",                   label: "Panel de control",   icon: LayoutDashboard },
  { href: "/dashboard/personal/registro", label: "Registrar personal", icon: Users },
  { href: "/dashboard/personal/consulta", label: "Mi personal",        icon: ClipboardList },
  { href: "/dashboard/calendario",        label: "Calendario",         icon: Calendar },
  { href: "/dashboard/seguridad",         label: "Seguridad",          icon: Shield },
];

interface DashboardSidebarProps {
  rol: string;
  isOpen?: boolean;
  onClose?: () => void;
}

function NavLinks({ links, pathname, onClose }: {
  links: typeof adminLinks;
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClose}
          className={clsx(
            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
            pathname === href
              ? "bg-ek-50 text-ek-600 border border-ek-100"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          )}
        >
          <Icon size={15} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function DashboardSidebar({ rol, isOpen = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const links = rol === "admin" ? adminLinks : proveedorLinks;

  return (
    <>
      {/* ── Sidebar estático en desktop ── */}
      <aside className="hidden md:block w-56 bg-white border-r border-gray-100 min-h-full py-6 shrink-0">
        <NavLinks links={links} pathname={pathname} />
      </aside>

      {/* ── Drawer móvil ── */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Panel */}
          <aside className="relative w-64 bg-white h-full py-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-ek-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                  EK
                </div>
                <span className="font-bold text-ek-500 text-sm tracking-wide">EASY KONTROL</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={18} />
              </button>
            </div>
            <NavLinks links={links} pathname={pathname} onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
