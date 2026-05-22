"use client";

import { useState } from "react";
import { DashboardNavbar } from "./DashboardNavbar";
import { DashboardSidebar } from "./DashboardSidebar";
import { SessionAffinity } from "@/components/auth/SessionAffinity";
import type { EmpresaGrupo } from "@/types";

interface DashboardShellProps {
  email: string;
  rol: string;
  empresaGrupo: EmpresaGrupo | null;
  children: React.ReactNode;
}

export function DashboardShell({ email, rol, empresaGrupo, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // data-tenant activa las variables CSS del tema (castilla=verde / riopaila=rojo)
  // Admin (empresaGrupo=null) usa el tema por defecto (castilla)
  const tenant = empresaGrupo ?? "castilla";

  return (
    <div
      className="min-h-screen bg-ek-50 flex flex-col"
      data-tenant={tenant}
    >
      <SessionAffinity />
      <DashboardNavbar
        email={email}
        empresaGrupo={empresaGrupo}
        onMenuClick={() => setSidebarOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          rol={rol}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
