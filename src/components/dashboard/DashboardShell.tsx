"use client";

import { useState } from "react";
import { DashboardNavbar } from "./DashboardNavbar";
import { DashboardSidebar } from "./DashboardSidebar";
import { SessionAffinity } from "@/components/auth/SessionAffinity";

interface DashboardShellProps {
  email: string;
  rol: string;
  children: React.ReactNode;
}

export function DashboardShell({ email, rol, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ek-50 flex flex-col">
      <SessionAffinity />
      <DashboardNavbar
        email={email}
        onMenuClick={() => setSidebarOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          rol={rol}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
