/** @type {import('next').NextConfig} */

// ─────────────────────────────────────────────
// Configuración principal de Next.js
// ─────────────────────────────────────────────
const nextConfig = {
  // Habilita el App Router (por defecto en Next.js 14)
  experimental: {},

  // Dominios permitidos para el componente <Image> de Next.js
  images: {
    domains: [
      // Agrega aquí el dominio de tu Supabase Storage si usas imágenes remotas
      // Ej: "xxxxxxxxxxxx.supabase.co"
    ],
  },
};

module.exports = nextConfig;
