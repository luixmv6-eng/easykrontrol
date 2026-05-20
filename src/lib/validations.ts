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

// ── Checklist F-P-ECC-001-05 ─────────────────────────
export interface ChecklistItem {
  requisito: string;
  cumple: boolean;
  observacion?: string;
}

export function validarChecklistDocumentacion(persona: {
  actividad_a_realizar?: string | null;
  vehiculo?: { tipo?: string | null } | null;
  documentos: { tipo: string }[];
}): ChecklistItem[] {
  const tiposDoc = persona.documentos.map((d) => d.tipo);
  const tieneVehiculo = !!persona.vehiculo;

  return [
    {
      requisito: "Cédula de ciudadanía",
      cumple: tiposDoc.includes("cedula"),
    },
    {
      requisito: "ARL (Afiliación vigente)",
      cumple: tiposDoc.includes("arl"),
    },
    {
      requisito: "Licencia de conducción vigente",
      cumple: tiposDoc.includes("licencia"),
      observacion: tieneVehiculo ? "Requerida por tener vehículo" : "Aplica si conduce",
    },
    {
      requisito: "SOAT del vehículo",
      cumple: tieneVehiculo ? tiposDoc.includes("soat") : true,
      observacion: tieneVehiculo ? undefined : "No aplica (sin vehículo)",
    },
    {
      requisito: "Tecnomecánica del vehículo",
      cumple: tieneVehiculo ? tiposDoc.includes("tecnicomecanica") : true,
      observacion: tieneVehiculo ? undefined : "No aplica (sin vehículo)",
    },
  ];
}

export function actividadRequiereVehiculo(actividad: string): boolean {
  return [
    "Labores Mecanizadas",
    "Transporte de Combustible",
    "Transporte de Mercancías Peligrosas",
    "Transporte de Semilla",
    "Transporte material, sedimentos, tierra",
    "Visita al Poliducto",
  ].includes(actividad);
}

export function actividadRequiereLicencia(actividad: string): boolean {
  return actividadRequiereVehiculo(actividad) || actividad === "Labores Mecanizadas";
}
