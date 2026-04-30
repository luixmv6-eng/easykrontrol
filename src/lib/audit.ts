import { createAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "personal_aprobado"
  | "personal_rechazado"
  | "personal_registrado"
  | "personal_bulk_aprobado"
  | "personal_bulk_rechazado"
  | "personal_correccion"
  | "export_excel"
  | "export_pdf"
  | "usuario_creado"
  | "proveedor_creado"
  | "proveedor_actualizado"
  | "evaluacion_creada"
  | "evaluacion_actualizada";

interface AuditParams {
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      user_id: params.user_id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error("[Audit] Error al registrar acción:", err);
  }
}
