import type { Config } from "tailwindcss";

// ─────────────────────────────────────────────
// Configuración de Tailwind CSS
// Extiende los colores base con la paleta de Easy Kontrol
// ─────────────────────────────────────────────
const config: Config = {
  // Archivos donde Tailwind buscará clases para incluir en el bundle
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Paleta de colores corporativa Easy Kontrol ──
      colors: {
        ek: {
          50:  "#f0f7e8",
          100: "#d8edbe",
          200: "#bee294",
          300: "#a5d468",  // verde claro
          400: "#8cc844",
          500: "#7ab648",  // verde primario (botones, logo)
          600: "#5a9030",  // verde oscuro (hover)
          700: "#3f6b22",
          800: "#274614",
          900: "#132308",
        },
      },

      // ── Fuentes ──
      fontFamily: {
        sans: ["Nunito", "ui-sans-serif", "system-ui"],
      },

      // ── Animaciones personalizadas ──
      keyframes: {
        slideInRight: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
      animation: {
        "slide-in-right": "slideInRight 0.45s ease forwards",
        "fade-in":        "fadeIn 0.3s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
