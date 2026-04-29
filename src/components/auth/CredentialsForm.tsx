"use client";

// ══════════════════════════════════════════════════════
// src/components/auth/CredentialsForm.tsx
// Formulario de Credenciales — Paso 1 del login
// Maneja: usuario, contraseña, visibilidad de contraseña
// Llama a Supabase Auth para autenticar al usuario
// Si el usuario tiene MFA habilitado → avanza al paso 2
// ══════════════════════════════════════════════════════

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { credentialsSchema, type CredentialsFormValues } from "@/lib/validations";
import { InputField } from "@/components/ui/InputField";
import { AlertMessage } from "@/components/ui/AlertMessage";

// ── Props del componente ──────────────────────────────
interface CredentialsFormProps {
  /** Callback cuando el servidor indica que se requiere MFA */
  onMfaRequired: () => void;
  /** Callback para mostrar el formulario de recuperación */
  onForgotPassword: () => void;
}

// ── Formulario de credenciales ────────────────────────
export function CredentialsForm({ onMfaRequired, onForgotPassword }: CredentialsFormProps) {
  // ── Estado local ──
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // ── Configuración de react-hook-form con validación Zod ──
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { username: "", password: "" },
  });

  // ── Handler del submit ────────────────────────────────
  const onSubmit = async (values: CredentialsFormValues) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      /*
       * Supabase Auth usa email para el signIn estándar.
       * Si tu sistema usa "username" en lugar de email,
       * necesitas una función RPC o tabla de usuarios para
       * buscar el email asociado al username antes del signIn.
       *
       * Opción A (solo email): usar directamente values.username como email
       * Opción B (username→email): llamar a /api/auth/resolve-user primero
       *
       * Para este ejemplo usamos el campo como email directamente.
       */
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.username,
        password: values.password,
      });

      if (error) {
        // Mapear errores de Supabase a mensajes en español
        if (error.message.includes("Invalid login credentials")) {
          setServerError("Usuario o contraseña incorrectos. Intenta de nuevo.");
        } else if (error.message.includes("Email not confirmed")) {
          setServerError("Debes confirmar tu correo electrónico antes de iniciar sesión.");
        } else if (error.message.includes("Too many requests")) {
          setServerError("Demasiados intentos fallidos. Espera unos minutos.");
        } else {
          setServerError(error.message);
        }
        return;
      }

      // Verificar MFA — si falla simplemente continuamos sin MFA
      let hasVerifiedMfa = false;
      try {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const totpFactors = factorsData?.totp ?? [];
        hasVerifiedMfa = totpFactors.some((f) => f.status === "verified");
      } catch {
        // si la llamada falla, asumimos sin MFA y continuamos
      }

      if (hasVerifiedMfa) {
        onMfaRequired();
      } else {
        setLoginSuccess(true);
        window.location.href = "/dashboard";
      }
    } catch {
      setServerError("Error inesperado. Por favor intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>

      {/* Mensaje de éxito al iniciar sesión */}
      {loginSuccess && (
        <AlertMessage type="success" message="¡Login exitoso! Redirigiendo al panel..." className="mb-4" />
      )}

      {/* Mensaje de error del servidor */}
      {serverError && (
        <AlertMessage type="error" message={serverError} className="mb-4" />
      )}

      {/* ── Campo: Usuario / Email ── */}
      <InputField
        id="username"
        label="Login"
        placeholder="Usuario o correo electrónico"
        autoComplete="username"
        error={errors.username?.message}
        {...register("username")}
      />

      {/* ── Campo: Contraseña ── */}
      <div className="mb-2">
        <InputField
          id="password"
          label="Contraseña"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          rightElement={
            // Botón para alternar visibilidad de la contraseña
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-gray-400 hover:text-ek-500 transition-colors p-1"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          }
          {...register("password")}
        />
      </div>

      {/* ── Enlace: ¿Olvidaste tu contraseña? ── */}
      <div className="text-right mb-6">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-xs text-ek-500 hover:text-ek-600 font-medium transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      {/* ── Botón de submit ── */}
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
          hover:-translate-y-px
          active:translate-y-0
          transition-all duration-200
          disabled:opacity-70 disabled:pointer-events-none
        "
      >
        {/* Spinner durante la carga */}
        {isLoading && <Loader2 size={18} className="animate-spin" />}
        INICIAR SESIÓN
      </button>
    </form>
  );
}
