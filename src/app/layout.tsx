import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#7ab648",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Easy Kontrol | Gestión de Proveedores",
  description: "Plataforma de gestión de proveedores para el sector agroindustrial",
  keywords: ["proveedores", "gestión", "agroindustria", "caña de azúcar"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Easy Kontrol",
    startupImage: "/icons/icon-512.png",
  },
  icons: {
    icon: [
      { url: "/favicon.ico",        sizes: "32x32",  type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={nunito.variable}>
      <head>
        {/* iOS Safari — íconos pantalla de inicio */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144.png" />
        {/* Splash screen color para iOS */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* MS Tiles (Windows Phone) */}
        <meta name="msapplication-TileColor" content="#7ab648" />
        <meta name="msapplication-TileImage" content="/icons/icon-144.png" />
      </head>
      <body className="antialiased font-sans bg-ek-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
