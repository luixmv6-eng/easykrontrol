import { Menu } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { EmpresaGrupo } from "@/types";

const TENANT_LABEL: Record<NonNullable<EmpresaGrupo>, string> = {
  castilla: "Castilla",
  riopaila: "Riopaila",
};

interface DashboardNavbarProps {
  email: string;
  empresaGrupo: EmpresaGrupo | null;
  onMenuClick: () => void;
}

export function DashboardNavbar({ email, empresaGrupo, onMenuClick }: DashboardNavbarProps) {
  return (
    <nav
      className="bg-white border-b border-gray-100 px-3 md:px-8 flex items-center justify-between sticky top-0 z-20"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "0.75rem" }}
    >
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors active:bg-gray-200"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        {/* Logo dinámico por tenant */}
        <div className="w-8 h-8 md:w-9 md:h-9 bg-ek-500 rounded-lg flex items-center justify-center text-white text-xs md:text-sm font-bold shadow-sm shrink-0">
          EK
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-ek-500 text-base md:text-lg tracking-wide">
            <span className="hidden sm:inline">EASY KONTROL</span>
            <span className="sm:hidden">Easy Kontrol</span>
          </span>

          {/* Badge del tenant */}
          {empresaGrupo && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-ek-500 text-white uppercase tracking-wider">
              {TENANT_LABEL[empresaGrupo]}
            </span>
          )}
          {!empresaGrupo && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 uppercase tracking-wider">
              Admin Global
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <span className="hidden md:block text-[13px] text-gray-400 truncate max-w-[160px]">
          {email}
        </span>
        <NotificationBell />
        <LogoutButton />
      </div>
    </nav>
  );
}
