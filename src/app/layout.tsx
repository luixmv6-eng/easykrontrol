// ══════════════════════════════════════════════════════
// src/app/layout.tsx
// Layout raíz de la aplicación (App Router de Next.js 14)
// Aplica fuentes globales y metadatos SEO
// ══════════════════════════════════════════════════════

import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// ── Configuración de la fuente Nunito (Google Fonts) ─
// Next.js descarga y sirve la fuente localmente (sin petición a Google en runtime)
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-nunito",   // CSS variable para usar en Tailwind
  display: "swap",             // Evita el flash de texto invisible (FOIT)
});

// ── Metadatos de la aplicación (SEO y PWA) ───────────
export const metadata: Metadata = {
  title: "Easy Kontrol | Gestión de Proveedores",
  description:
    "Plataforma de gestión de proveedores para el sector agroindustrial",
  keywords: ["proveedores", "gestión", "agroindustria", "caña de azúcar"],
  // Icono de la pestaña del navegador
  icons: {
    icon: "/favicon.ico",
  },
};

// ── Layout raíz ──────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={nunito.variable}>
      {/*
       * La clase antialiased de Tailwind mejora el renderizado de fuentes
       * font-sans usa la variable --font-nunito configurada arriba
       */}
      <body className="antialiased font-sans bg-ek-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
