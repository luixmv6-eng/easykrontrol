"use client";

// ══════════════════════════════════════════════════════
// src/components/auth/RecoveryForm.tsx
// Formulario de Recuperación de Contraseña
// Usa Supabase Auth para enviar el email de reset
// ══════════════════════════════════════════════════════

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { recoverySchema, type RecoveryFormValues } from "@/lib/validations";
import { InputField } from "@/components/ui/InputField";
import { AlertMessage } from "@/components/ui/AlertMessage";

// ── Props del componente ──────────────────────────────
interface RecoveryFormProps {
  /** Callback para volver al formulario de login */
  onBack: () => void;
}

// ── Formulario de recuperación ────────────────────────
export function RecoveryForm({ onBack }: RecoveryFormProps) {
  // ── Estado local ──
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Configuración de react-hook-form ──
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { email: "" },
  });

  // ── Handler del submit ────────────────────────────────
  const onSubmit = async (values: RecoveryFormValues) => {
    setServerError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      /*
       * Supabase envía automáticamente un email con el enlace de reset.
       * El enlace redirige a la URL configurada en:
       * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
       *
       * La URL de redirección debe ser algo como:
       * https://tu-dominio.com/auth/callback?type=recovery
       */
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          // URL a la que Supabase redirigirá tras el click en el email
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        }
      );

      if (error) {
        // Supabase no diferencia si el email existe o no (por seguridad)
        // pero puede haber errores de rate limiting
        if (error.message.includes("rate limit")) {
          setServerError("Demasiadas solicitudes. Espera unos minutos antes de intentar de nuevo.");
        } else {
          setServerError("Error al enviar el correo. Intenta de nuevo.");
        }
        return;
      }

      // ✅ Email enviado correctamente
      setSuccessMessage(
        "Instrucciones enviadas. Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña."
      );
      reset(); // Limpiar el formulario
    } catch {
      setServerError("Error inesperado. Por favor intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div>
      {/* ── Botón para volver al login ── */}
      <button
        type="button"
        onClick={onBack}
        className="
          flex items-center gap-1 text-xs text-ek-500
          hover:text-ek-600 transition-colors font-medium mb-5
        "
      >
        <ArrowLeft size={13} />
        Volver al inicio de sesión
      </button>

      {/* ── Encabezado del formulario ── */}
      <div className="flex items-center gap-2 mb-4">
        <Mail size={20} className="text-ek-500" />
        <div>
          <p className="text-[13px] font-semibold text-gray-700">
            Recuperar contraseña
          </p>
          <p className="text-[11.5px] text-gray-400 leading-snug">
            Te enviaremos un enlace a tu correo
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Mensajes de éxito o error */}
        {successMessage && (
          <AlertMessage type="success" message={successMessage} className="mb-4" />
        )}
        {serverError && (
          <AlertMessage type="error" message={serverError} className="mb-4" />
        )}

        {/* Descripción del proceso */}
        {!successMessage && (
          <p className="text-[12.5px] text-gray-500 leading-relaxed mb-5">
            Ingresa el correo electrónico con el que te registraste.
            Te enviaremos instrucciones para restablecer tu contraseña.
          </p>
        )}

        {/* ── Campo: Email ── */}
        {!successMessage && (
          <>
            <InputField
              id="email"
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              autoFocus
              error={errors.email?.message}
              {...register("email")}
            />

            {/* ── Botón de envío ── */}
            <button
              type="submit"
              disabled={isLoading}
              className="
                w-full h-[48px] mt-4
                bg-ek-500 hover:bg-ek-600
                text-white font-bold text-[13px] tracking-widest uppercase
                rounded-[10px]
                flex items-center justify-center gap-2
                shadow-[0_4px_16px_rgba(122,182,72,0.30)]
                hover:shadow-[0_6px_20px_rgba(90,144,48,0.40)]
                hover:-translate-y-px active:translate-y-0
                transition-all duration-200
                disabled:opacity-70 disabled:pointer-events-none
              "
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              ENVIAR INSTRUCCIONES
            </button>
          </>
        )}
      </form>
    </div>
  );
}
