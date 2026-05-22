import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Colores via CSS variables → soportan multi-tenant ──
      // Castilla = verde (default)  |  Riopaila = rojo
      colors: {
        ek: {
          50:  "rgb(var(--ek-50)  / <alpha-value>)",
          100: "rgb(var(--ek-100) / <alpha-value>)",
          200: "rgb(var(--ek-200) / <alpha-value>)",
          300: "rgb(var(--ek-300) / <alpha-value>)",
          400: "rgb(var(--ek-400) / <alpha-value>)",
          500: "rgb(var(--ek-500) / <alpha-value>)",
          600: "rgb(var(--ek-600) / <alpha-value>)",
          700: "rgb(var(--ek-700) / <alpha-value>)",
          800: "rgb(var(--ek-800) / <alpha-value>)",
          900: "rgb(var(--ek-900) / <alpha-value>)",
        },
      },

      fontFamily: {
        sans: ["Nunito", "ui-sans-serif", "system-ui"],
      },

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
