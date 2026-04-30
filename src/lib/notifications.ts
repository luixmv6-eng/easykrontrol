import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType =
  | "personal_pendiente"
  | "personal_aprobado"
  | "personal_rechazado"
  | "documento_por_vencer"
  | "grupo_pendiente"
  | "correccion_enviada";

export async function crearNotificacion(
  user_id: string,
  type: NotificationType,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id,
      type,
      message,
      metadata: metadata ?? null,
      read: false,
    });
  } catch (err) {
    console.error("[Notifications] Error al crear notificación:", err);
  }
}

export async function crearNotificacionAdmins(
  type: NotificationType,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .eq("rol", "admin");

    if (!admins?.length) return;

    await admin.from("notifications").insert(
      admins.map((a) => ({
        user_id: a.id,
        type,
        message,
        metadata: metadata ?? null,
        read: false,
      }))
    );
  } catch (err) {
    console.error("[Notifications] Error al notificar admins:", err);
  }
}
