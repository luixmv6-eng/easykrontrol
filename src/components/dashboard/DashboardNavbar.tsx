import { LogoutButton } from "@/components/auth/LogoutButton";

export function DashboardNavbar({ email }: { email: string }) {
  return (
    <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-ek-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
          EK
        </div>
        <span className="font-bold text-ek-500 text-lg tracking-wide">EASY KONTROL</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[13px] text-gray-400">{email}</span>
        <LogoutButton />
      </div>
    </nav>
  );
}
