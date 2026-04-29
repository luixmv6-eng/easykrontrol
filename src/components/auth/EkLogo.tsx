"use client";

// ══════════════════════════════════════════════════════
// src/components/auth/EkLogo.tsx
// Componente del logotipo y marca Easy Kontrol
// Muestra: badge EK + título + subtítulo
// ══════════════════════════════════════════════════════

export function EkLogo() {
  return (
    <div className="flex flex-col gap-3 mb-2">
      {/* ── Badge con las iniciales "EK" ──────────── */}
      <div
        className="
          w-[52px] h-[52px]
          bg-ek-500 rounded-xl
          flex items-center justify-center
          text-white font-bold text-lg
          tracking-tight
          shadow-sm
        "
        aria-label="Easy Kontrol logo"
      >
        EK
      </div>

      {/* ── Nombre y descripción de la plataforma ── */}
      <div>
        {/* Nombre principal en verde corporativo */}
        <h1 className="text-[26px] font-bold text-ek-500 leading-none tracking-wide">
          EASY KONTROL
        </h1>

        {/* Subtítulo descriptivo */}
        <p className="text-[12.5px] text-gray-500 font-normal leading-snug mt-1 max-w-[220px]">
          Bienvenido a la plataforma de gestión de proveedores
        </p>
      </div>
    </div>
  );
}
