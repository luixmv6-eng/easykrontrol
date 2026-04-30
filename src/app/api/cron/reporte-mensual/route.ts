import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const mesAnterior = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const anioAnterior = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const primerDia = new Date(anioAnterior, mesAnterior, 1).toISOString();
  const ultimoDia = new Date(anioAnterior, mesAnterior + 1, 0, 23, 59, 59).toISOString();

  const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const mesLabel = `${MESES[mesAnterior]} ${anioAnterior}`;

  const [{ data: personalMes }, { data: docsVencen }, { data: admins }] = await Promise.all([
    admin.from("personal").select("estado, proveedor:proveedores(nombre)").gte("created_at", primerDia).lte("created_at", ultimoDia),
    admin.from("documentos_personal")
      .select("tipo, fecha_vencimiento, personal:personal(nombres, proveedor:proveedores(nombre))")
      .gte("fecha_vencimiento", now.toISOString().split("T")[0])
      .lte("fecha_vencimiento", new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]),
    admin.from("profiles").select("username").eq("rol", "admin"),
  ]);

  const totalMes = personalMes?.length ?? 0;
  const aprobados = personalMes?.filter((p) => p.estado === "aprobado").length ?? 0;
  const pendientes = personalMes?.filter((p) => p.estado === "pendiente").length ?? 0;
  const rechazados = personalMes?.filter((p) => p.estado === "rechazado").length ?? 0;

  const porEmpresa = (personalMes ?? []).reduce<Record<string, number>>((acc, p) => {
    const nombre = (p.proveedor as unknown as { nombre: string } | null)?.nombre ?? "Sin empresa";
    acc[nombre] = (acc[nombre] ?? 0) + 1;
    return acc;
  }, {});

  const filasEmpresa = Object.entries(porEmpresa)
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, count]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6">${nombre}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${count}</td></tr>`)
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
      <div style="background:#7ab648;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:20px">📊 Reporte mensual</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px">Easy Kontrol — ${mesLabel}</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <h2 style="color:#374151;font-size:16px;margin:0 0 16px">Resumen de ${mesLabel}</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
          <div style="background:#f0fdf4;border-radius:8px;padding:16px">
            <p style="margin:0;color:#16a34a;font-size:24px;font-weight:bold">${totalMes}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:12px">Nuevos registros</p>
          </div>
          <div style="background:#f0f9ff;border-radius:8px;padding:16px">
            <p style="margin:0;color:#0369a1;font-size:24px;font-weight:bold">${aprobados}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:12px">Aprobados</p>
          </div>
          <div style="background:#fffbeb;border-radius:8px;padding:16px">
            <p style="margin:0;color:#d97706;font-size:24px;font-weight:bold">${pendientes}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:12px">Pendientes</p>
          </div>
          <div style="background:#fff1f2;border-radius:8px;padding:16px">
            <p style="margin:0;color:#e11d48;font-size:24px;font-weight:bold">${rechazados}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:12px">Rechazados</p>
          </div>
        </div>
        ${docsVencen?.length ? `
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-bottom:24px">
          <p style="margin:0;color:#92400e;font-size:13px">
            ⚠️ <strong>${docsVencen.length}</strong> documento(s) vence(n) este mes. Revisa el calendario de vencimientos.
          </p>
        </div>` : ""}
        ${totalMes > 0 ? `
        <h3 style="color:#374151;font-size:14px">Registros por empresa</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600">Empresa</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:600">Registros</th>
            </tr>
          </thead>
          <tbody>${filasEmpresa}</tbody>
        </table>` : "<p style='color:#9ca3af;font-size:13px'>Sin nuevos registros este mes.</p>"}
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">
          Este reporte fue generado automáticamente por Easy Kontrol el ${now.toLocaleDateString("es-CO")}.
        </p>
      </div>
    </div>
  `;

  let enviados = 0;
  for (const admin_user of admins ?? []) {
    if (admin_user.username) {
      await sendEmail(admin_user.username, `📊 Reporte mensual Easy Kontrol — ${mesLabel}`, html);
      enviados++;
    }
  }

  return NextResponse.json({ ok: true, enviados });
}
