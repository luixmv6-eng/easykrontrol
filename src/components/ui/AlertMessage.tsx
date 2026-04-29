// ══════════════════════════════════════════════════════
// src/components/ui/AlertMessage.tsx
// Componente de alerta reutilizable
// Soporta tipos: error | success | info | warning
// ══════════════════════════════════════════════════════

import clsx from "clsx";

// ── Props del componente ──────────────────────────────
interface AlertMessageProps {
  /** Tipo de alerta que define el color y el ícono */
  type: "error" | "success" | "info" | "warning";
  /** Texto del mensaje a mostrar */
  message: string;
  /** Clases CSS adicionales */
  className?: string;
}

// ── Mapeo de tipos a estilos de Tailwind ──────────────
const alertStyles = {
  error: {
    container: "bg-red-50 border-red-200 text-red-700",
    icon: "✕",
  },
  success: {
    container: "bg-green-50 border-green-200 text-green-700",
    icon: "✓",
  },
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-700",
    icon: "ℹ",
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-700",
    icon: "⚠",
  },
};

// ── Componente de alerta ──────────────────────────────
export function AlertMessage({ type, message, className }: AlertMessageProps) {
  const styles = alertStyles[type];

  return (
    <div
      role="alert"
      className={clsx(
        // Estilos base
        "flex items-start gap-2",
        "px-3 py-2.5 rounded-lg border text-[12px] font-medium leading-snug",
        // Estilos según el tipo
        styles.container,
        className
      )}
    >
      {/* Ícono del tipo de alerta */}
      <span className="shrink-0 font-bold text-[13px] leading-none mt-px">
        {styles.icon}
      </span>

      {/* Mensaje */}
      <span>{message}</span>
    </div>
  );
}
