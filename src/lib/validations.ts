// ══════════════════════════════════════════════════════
// src/lib/validations.ts
// Esquemas de validación con Zod para formularios
// Se usan tanto en el cliente (react-hook-form) como en el servidor
// ══════════════════════════════════════════════════════

import { z } from "zod";

// ── Esquema: Formulario de Credenciales (Paso 1) ─────
export const credentialsSchema = z.object({
  username: z
    .string()
    .min(1, "El usuario o correo es requerido")
    .max(100, "El usuario no puede tener más de 100 caracteres"),

  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede tener más de 100 caracteres"),
});

// ── Esquema: Formulario MFA (Paso 2) ─────────────────
export const mfaSchema = z.object({
  mfaCode: z
    .string()
    .length(6, "El código debe tener exactamente 6 dígitos")
    .regex(/^\d{6}$/, "El código solo puede contener números"),
});

// ── Esquema: Recuperación de contraseña ──────────────
export const recoverySchema = z.object({
  email: z
    .string()
    .min(1, "El correo es requerido")
    .email("Ingresa un correo electrónico válido"),
});

// ── Tipos inferidos de los esquemas ──────────────────
export type CredentialsFormValues = z.infer<typeof credentialsSchema>;
export type MfaFormValues = z.infer<typeof mfaSchema>;
export type RecoveryFormValues = z.infer<typeof recoverySchema>;
