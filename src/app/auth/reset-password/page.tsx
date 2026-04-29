"use client";

// ══════════════════════════════════════════════════════
// src/app/auth/reset-password/page.tsx
// Página para ingresar la nueva contraseña
// El usuario llega aquí desde el enlace del email de recuperación
// ══════════════════════════════════════════════════════

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InputField } from "@/components/ui/InputField";
import { AlertMessage } from "@/components/ui/AlertMessage";
import { EkLogo } from "@/components/auth/EkLogo";

// ── Esquema de validación para la nueva contraseña ───
const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe incluir al menos una letra mayúscula")
      .regex(/[0-9]/, "Debe incluir al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

// ── Página de reset de contraseña ────────────────────
export default function ResetPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (values: ResetFormValues) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      /*
       * Actualizar la contraseña del usuario autenticado.
       * Supabase ya tiene la sesión activa gracias al callback de recuperación.
       */
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        setServerError("Error al actualizar la contraseña. Intenta solicitar un nuevo enlace.");
        return;
      }

      setSuccess(true);

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);
    } catch {
      setServerError("Error inesperado. Por favor intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-ek-50 px-4">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg p-10">

        {/* Logo */}
        <div className="mb-8">
          <EkLogo />
        </div>

        <h2 className="text-[15px] font-semibold text-gray-700 mb-1">
          Nueva contraseña
        </h2>
        <p className="text-[12px] text-gray-400 mb-6">
          Ingresa y confirma tu nueva contraseña segura.
        </p>

        {/* Estado de éxito */}
        {success ? (
          <AlertMessage
            type="success"
            message="Contraseña actualizada. Redirigiendo al inicio de sesión..."
          />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && (
              <AlertMessage type="error" message={serverError} className="mb-4" />
            )}

            <InputField
              id="password"
              label="Nueva contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoFocus
              error={errors.password?.message}
              {...register("password")}
            />

            <InputField
              id="confirmPassword"
              label="Confirmar contraseña"
              type="password"
              placeholder="Repite la contraseña"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="
                w-full h-[48px] mt-2
                bg-ek-500 hover:bg-ek-600
                text-white font-bold text-[13px] tracking-widest uppercase
                rounded-[10px] flex items-center justify-center gap-2
                shadow-[0_4px_16px_rgba(122,182,72,0.30)]
                hover:-translate-y-px active:translate-y-0
                transition-all duration-200
                disabled:opacity-70 disabled:pointer-events-none
              "
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              GUARDAR CONTRASEÑA
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
