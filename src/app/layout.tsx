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
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Easy Kontrol | Gestión de Proveedores",
  description: "Plataforma de gestión de proveedores para el sector agroindustrial",
  keywords: ["proveedores", "gestión", "agroindustria", "caña de azúcar"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Easy Kontrol",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={nunito.variable}>
      <body className="antialiased font-sans bg-ek-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
