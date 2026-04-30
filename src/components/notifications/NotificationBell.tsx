"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCheck } from "lucide-react";
import clsx from "clsx";

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  personal_pendiente: "🕐",
  personal_aprobado: "✅",
  personal_rechazado: "❌",
  documento_por_vencer: "⚠️",
  grupo_pendiente: "👥",
  correccion_enviada: "🔧",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const { data } = await res.json();
      setNotifs(data ?? []);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = notifs.filter((n) => !n.read).length;

  const marcarTodas = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) });
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const marcarUna = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) });
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifs(); }}
        className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-[13px] font-semibold text-gray-800">
              Notificaciones {unread > 0 && <span className="text-red-500">({unread})</span>}
            </span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={marcarTodas} className="text-[11px] text-ek-600 hover:text-ek-700 flex items-center gap-1">
                  <CheckCheck size={12} /> Marcar leídas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 && (
              <div className="py-8 text-center text-[13px] text-gray-400">
                Sin notificaciones
              </div>
            )}
            {notifs.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && marcarUna(n.id)}
                className={clsx(
                  "flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors",
                  !n.read && "bg-ek-50/50"
                )}
              >
                <span className="text-base mt-0.5 shrink-0">{TYPE_ICON[n.type] ?? "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className={clsx("text-[12px] leading-relaxed", n.read ? "text-gray-500" : "text-gray-800 font-medium")}>
                    {n.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 bg-ek-500 rounded-full shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
