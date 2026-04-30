import { Menu } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface DashboardNavbarProps {
  email: string;
  onMenuClick: () => void;
}

export function DashboardNavbar({ email, onMenuClick }: DashboardNavbarProps) {
  return (
    <nav className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div className="w-9 h-9 bg-ek-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
          EK
        </div>
        <span className="font-bold text-ek-500 text-lg tracking-wide">EASY KONTROL</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-[13px] text-gray-400 truncate max-w-[160px]">
          {email}
        </span>
        <NotificationBell />
        <LogoutButton />
      </div>
    </nav>
  );
}
