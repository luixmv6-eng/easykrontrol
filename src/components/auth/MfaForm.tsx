"use client";

// ══════════════════════════════════════════════════════
// src/components/auth/MfaForm.tsx
// Formulario MFA — Paso 2 del login
// El usuario ingresa el código TOTP de 6 dígitos
// generado por su app autenticadora (Google Authenticator, Authy, etc.)
// ══════════════════════════════════════════════════════

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mfaSchema, type MfaFormValues } from "@/lib/validations";
import { InputField } from "@/components/ui/InputField";
import { AlertMessage } from "@/components/ui/AlertMessage";

// ── Props del componente ──────────────────────────────
interface MfaFormProps {
  /** Callback para volver al paso de credenciales */
  onBack: () => void;
}

// ── Formulario de verificación MFA ───────────────────
export function MfaForm({ onBack }: MfaFormProps) {
  // ── Estado local ──
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Configuración de react-hook-form ──
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MfaFormValues>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { mfaCode: "" },
  });

  // ── Handler del submit MFA ────────────────────────────
  const onSubmit = async (values: MfaFormValues) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      /*
       * Flujo MFA de Supabase:
       * 1. Obtener los factores TOTP registrados del usuario
       * 2. Crear un "challenge" para el factor activo
       * 3. Verificar el código ingresado contra el challenge
       */

      // Paso 1: Obtener factores TOTP del usuario
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError || !factorsData?.totp?.length) {
        setServerError("No se encontraron factores MFA configurados.");
        return;
      }

      // Tomar el primer factor TOTP verificado
      const totpFactor = factorsData.totp.find((f) => f.status === "verified");
      if (!totpFactor) {
        setServerError("No hay un factor MFA activo. Contacta al administrador.");
        return;
      }

      // Paso 2: Crear un challenge para ese factor
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

      if (challengeError || !challengeData) {
        setServerError("Error al iniciar la verificación MFA. Intenta de nuevo.");
        return;
      }

      // Paso 3: Verificar el código TOTP ingresado
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: values.mfaCode,
      });

      if (verifyError) {
        if (verifyError.message.includes("Invalid TOTP code")) {
          setServerError("Código incorrecto. Verifica tu app autenticadora e intenta de nuevo.");
        } else if (verifyError.message.includes("expired")) {
          setServerError("El código ha expirado. Genera uno nuevo en tu app.");
        } else {
          setServerError(verifyError.message);
        }
        return;
      }

      // ✅ Verificación exitosa → redirigir al dashboard
      window.location.href = "/dashboard";
    } catch {
      setServerError("Error inesperado. Por favor intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>

      {/* ── Encabezado del paso MFA ── */}
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck size={20} className="text-ek-500" />
        <div>
          <p className="text-[13px] font-semibold text-gray-700">
            Verificación en dos pasos
          </p>
          <p className="text-[11.5px] text-gray-400 leading-snug">
            Ingresa el código de tu app autenticadora
          </p>
        </div>
      </div>

      {/* Mensaje de error del servidor */}
      {serverError && (
        <AlertMessage type="error" message={serverError} className="mb-4" />
      )}

      {/* ── Campo: Código TOTP ── */}
      <div className="mb-6">
        <InputField
          id="mfaCode"
          label="Código de verificación (MFA)"
          placeholder="123456"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          error={errors.mfaCode?.message}
          helperText="Código de 6 dígitos generado por Google Authenticator o Authy"
          {...register("mfaCode")}
        />
      </div>

      {/* ── Botón de verificación ── */}
      <button
        type="submit"
        disabled={isLoading}
        className="
          w-full h-[48px]
          bg-ek-500 hover:bg-ek-600
          text-white font-bold text-[13px] tracking-widest uppercase
          rounded-[10px]
          flex items-center justify-center gap-2
          shadow-[0_4px_16px_rgba(122,182,72,0.30)]
          hover:shadow-[0_6px_20px_rgba(90,144,48,0.40)]
          hover:-translate-y-px active:translate-y-0
          transition-all duration-200
          disabled:opacity-70 disabled:pointer-events-none
          mb-4
        "
      >
        {isLoading && <Loader2 size={18} className="animate-spin" />}
        VERIFICAR CÓDIGO
      </button>

      {/* ── Botón para volver al paso anterior ── */}
      <button
        type="button"
        onClick={onBack}
        className="
          flex items-center gap-1 text-xs text-ek-500
          hover:text-ek-600 transition-colors font-medium
        "
      >
        <ArrowLeft size={13} />
        Volver al inicio de sesión
      </button>
    </form>
  );
}
