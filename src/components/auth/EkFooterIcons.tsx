// ══════════════════════════════════════════════════════
// src/components/auth/EkFooterIcons.tsx
// Iconos de certificación en el pie del panel de login
// Réplica fiel de los iconos del diseño original
// ══════════════════════════════════════════════════════

export function EkFooterIcons() {
  return (
    <div className="flex items-center gap-4 pt-5 border-t border-gray-100">
      {/* ── Icono 1: Tres círculos (símbolo de asociación/certificación) ── */}
      <div
        className="w-10 h-10 flex items-center justify-center opacity-55 hover:opacity-85 transition-opacity cursor-pointer"
        title="Certificación de calidad"
        aria-label="Certificado de asociación"
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width="34"
          height="34"
        >
          {/* Tres círculos entrelazados */}
          <circle cx="16" cy="32" r="9" stroke="#7ab648" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="9" stroke="#7ab648" strokeWidth="2.5" />
          <circle cx="24" cy="18" r="9" stroke="#7ab648" strokeWidth="2.5" />
        </svg>
      </div>

      {/* ── Icono 2: Hexágono con check (certificación verificada) ── */}
      <div
        className="w-10 h-10 flex items-center justify-center opacity-55 hover:opacity-85 transition-opacity cursor-pointer"
        title="Plataforma verificada"
        aria-label="Certificación verificada"
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width="34"
          height="34"
        >
          {/* Hexágono */}
          <path
            d="M24 4L44 14L44 34L24 44L4 34L4 14Z"
            stroke="#7ab648"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Círculo interior */}
          <circle cx="24" cy="24" r="7" stroke="#7ab648" strokeWidth="2.5" />
          {/* Check mark */}
          <path
            d="M20 24L23 27L28 21"
            stroke="#7ab648"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
