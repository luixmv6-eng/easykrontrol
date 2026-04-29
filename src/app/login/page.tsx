// ══════════════════════════════════════════════════════
// src/app/login/page.tsx
// Página de Login — Server Component
// Contiene el layout de dos paneles (imagen + formulario)
// ══════════════════════════════════════════════════════

import type { Metadata } from "next";
import Image from "next/image";
import { LoginPanel } from "@/components/auth/LoginPanel";

// Metadatos específicos de esta página
export const metadata: Metadata = {
  title: "Iniciar Sesión | Easy Kontrol",
  description: "Accede a la plataforma de gestión de proveedores Easy Kontrol",
};

// ── Página de Login ──────────────────────────────────
export default function LoginPage() {
  return (
    /*
     * Layout principal de dos columnas:
     * [Columna izquierda] → Imagen de fondo (tractores)
     * [Columna derecha]   → Panel de formulario de login
     */
    <main className="flex h-screen w-full overflow-hidden">

      {/* ── COLUMNA IZQUIERDA: Imagen ──────────────── */}
      <div className="relative hidden md:flex flex-1 overflow-hidden">
        {/*
         * Next.js Image con fill=true para que ocupe todo el contenedor.
         * priority=true precarga la imagen al ser LCP (Largest Contentful Paint)
         */}
        <Image
          src="/images/tractores.jpg"
          alt="Tractores en cultivos de caña de azúcar - Easy Kontrol"
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 768px) 0vw, 60vw"
        />

        {/* Overlay sutil para mejorar la transición con el panel blanco */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
      </div>

      {/* ── COLUMNA DERECHA: Panel de autenticación ── */}
      {/*
       * LoginPanel es un Client Component porque maneja:
       * - Estado del formulario (react-hook-form)
       * - Transiciones entre pasos (credenciales → MFA → recuperación)
       * - Llamadas a la API de autenticación
       */}
      <LoginPanel />
    </main>
  );
}
