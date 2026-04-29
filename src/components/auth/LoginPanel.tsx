"use client";

// ══════════════════════════════════════════════════════
// src/components/auth/LoginPanel.tsx
// Panel derecho del login — Client Component principal
// Orquesta el flujo: Credenciales → MFA → Recuperación
// ══════════════════════════════════════════════════════

import { useState } from "react";
import { EkLogo } from "@/components/auth/EkLogo";
import { CredentialsForm } from "@/components/auth/CredentialsForm";
import { MfaForm } from "@/components/auth/MfaForm";
import { RecoveryForm } from "@/components/auth/RecoveryForm";
import type { AuthStep } from "@/types";

// ── Componente principal del panel de login ──────────
export function LoginPanel() {
  // Estado que controla qué formulario se muestra
  const [authStep, setAuthStep] = useState<AuthStep>("credentials");

  // Muestra el formulario de recuperación de contraseña
  const [showRecovery, setShowRecovery] = useState(false);

  return (
    /*
     * Panel derecho:
     * - Ancho fijo en desktop (w-[420px])
     * - Fondo con gradiente verde muy suave
     * - Sombra izquierda para separar del panel de imagen
     * - Animación de entrada desde la derecha
     */
    <aside
      className="
        w-full md:w-[420px] md:min-w-[420px]
        flex flex-col justify-between
        px-12 py-12
        bg-gradient-to-b from-white via-white to-ek-50
        shadow-[-4px_0_32px_rgba(0,0,0,0.10)]
        animate-slide-in-right
        overflow-y-auto
      "
    >
      {/* ── LOGO Y MARCA ──────────────────────────── */}
      <EkLogo />

      {/* ── FORMULARIOS (condicional según el paso) ── */}
      <div className="flex-1 flex flex-col justify-center py-6">
        {/*
         * Flujo de navegación entre formularios:
         * - "credentials" → usuario y contraseña
         * - "mfa"         → código TOTP de 6 dígitos
         * - showRecovery  → recuperación de contraseña
         */}
        {showRecovery ? (
          // Formulario de recuperación de contraseña
          <RecoveryForm onBack={() => setShowRecovery(false)} />
        ) : authStep === "credentials" ? (
          // Formulario de credenciales (paso 1)
          <CredentialsForm
            onMfaRequired={() => setAuthStep("mfa")}
            onForgotPassword={() => setShowRecovery(true)}
          />
        ) : (
          // Formulario MFA (paso 2)
          <MfaForm onBack={() => setAuthStep("credentials")} />
        )}
      </div>

    </aside>
  );
}
