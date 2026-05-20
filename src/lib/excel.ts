import * as XLSX from "xlsx";
import type { Personal, TipoDocumento } from "@/types";

const TIPO_LABELS: Record<TipoDocumento, string> = {
  cedula: "Cédula",
  licencia: "Licencia Conducción",
  arl: "ARL",
  soat: "SOAT",
  tecnicomecanica: "Tecnomecánica",
  planilla_aportes: "Planilla Aportes (PILA)",
  examenes_medicos: "Exámenes Médicos",
  certificados_especialidad: "Cert. Especialidad",
  arl_sgsst: "ARL SG-SST",
  responsable_sgsst: "Resp. SG-SST",
};

const ESTADO_LABELS: Record<string, string> = {
  aprobado: "Aprobado",
  pendiente: "Pendiente",
  rechazado: "Rechazado",
  inactivo: "Inactivo",
};

function diasHastaVencer(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
}

function estadoDoc(
  doc: { fecha_vencimiento: string | null; verificado_auto: boolean; verificacion_confianza: string | null } | undefined
): string {
  if (!doc) return "✗ No cargado";

  const dias = diasHastaVencer(doc.fecha_vencimiento);
  const verificado = doc.verificado_auto
    ? ` ✓ [${doc.verificacion_confianza ?? ""}]`
    : "";

  if (dias === null) return `Sin vencimiento${verificado}`;
  if (dias <= 0) return `⚠ VENCIDO${verificado}`;
  if (dias <= 30) return `⚠ Vence en ${dias}d${verificado} · ${_fmt(doc.fecha_vencimiento)}`;
  return `${_fmt(doc.fecha_vencimiento)} (${dias}d)${verificado}`;
}

function _fmt(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-CO");
}

export function generarExcelPersonal(personal: Personal[]): Buffer {
  const filas = personal.map((p, idx) => {
    const tiposPersona: TipoDocumento[] = [
      "cedula", "licencia", "arl",
      "planilla_aportes", "examenes_medicos",
      "certificados_especialidad", "arl_sgsst", "responsable_sgsst",
    ];
    const tiposVehiculo: TipoDocumento[] = ["soat", "tecnicomecanica"];
    const todosTipos: TipoDocumento[] = [
      ...tiposPersona,
      ...(p.vehiculo_id ? tiposVehiculo : []),
    ];

    const docsMap = Object.fromEntries(
      (p.documentos ?? []).map((d) => [d.tipo, d])
    );

    const docsVerificados = (p.documentos ?? []).filter((d) => d.verificado_auto).length;
    const docsCargados    = todosTipos.filter((t) => docsMap[t]).length;

    const docCols = Object.fromEntries(
      todosTipos.map((tipo) => [TIPO_LABELS[tipo], estadoDoc(docsMap[tipo])])
    );

    return {
      // ── Identificación ──────────────────────────────────────
      "N°": idx + 1,
      "Cédula": p.cedula,
      "Nombre y Apellidos": p.nombres,
      "Empresa": p.proveedor?.nombre ?? "-",
      "NIT": p.proveedor?.nit ?? "-",

      // ── Perfil laboral ───────────────────────────────────────
      "Cargo": p.cargo ?? "-",
      "Actividad a realizar": p.actividad_a_realizar ?? "-",
      "Municipio Residencia": p.municipio_residencia ?? "-",
      "ARL (empresa)": p.arl ?? "-",
      "EPS": p.eps ?? "-",
      "AFP": p.afp ?? "-",

      // ── Estado ───────────────────────────────────────────────
      "Estado": ESTADO_LABELS[p.estado] ?? p.estado,
      "En corrección": p.en_correccion ? "Sí" : "No",
      "Motivo de rechazo": p.motivo_rechazo ?? "-",
      "Fecha registro": p.created_at ? new Date(p.created_at).toLocaleDateString("es-CO") : "-",

      // ── Fechas de ingreso ────────────────────────────────────
      "Fecha entrada": p.fecha_entrada ? new Date(p.fecha_entrada).toLocaleDateString("es-CO") : "-",
      "Fecha fin": p.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString("es-CO") : "-",

      // ── Vehículo ─────────────────────────────────────────────
      "Tipo vehículo": p.vehiculo?.tipo ?? "-",
      "Placa": p.vehiculo?.placa ?? "-",
      "Color vehículo": p.vehiculo?.color ?? "-",
      "Cat. licencia vehículo": p.vehiculo?.categoria_licencia ?? "-",
      "Venc. licencia vehículo": p.vehiculo?.fecha_vencimiento_licencia
        ? new Date(p.vehiculo.fecha_vencimiento_licencia).toLocaleDateString("es-CO")
        : "-",

      // ── Resumen documentos ───────────────────────────────────
      "Docs cargados": `${docsCargados}/${todosTipos.length}`,
      "Docs verificados": `${docsVerificados}/${todosTipos.length}`,

      // ── Matriz documentos (un col por tipo) ──────────────────
      ...docCols,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(filas);

  // Anchos de columna
  ws["!cols"] = [
    /* N°                    */ { wch: 4 },
    /* Cédula                */ { wch: 14 },
    /* Nombre y Apellidos    */ { wch: 32 },
    /* Empresa               */ { wch: 30 },
    /* NIT                   */ { wch: 14 },
    /* Cargo                 */ { wch: 28 },
    /* Actividad             */ { wch: 36 },
    /* Municipio             */ { wch: 20 },
    /* ARL empresa           */ { wch: 14 },
    /* EPS                   */ { wch: 16 },
    /* AFP                   */ { wch: 16 },
    /* Estado                */ { wch: 12 },
    /* En corrección         */ { wch: 14 },
    /* Motivo rechazo        */ { wch: 32 },
    /* Fecha registro        */ { wch: 14 },
    /* Fecha entrada         */ { wch: 14 },
    /* Fecha fin             */ { wch: 14 },
    /* Tipo vehículo         */ { wch: 24 },
    /* Placa                 */ { wch: 10 },
    /* Color                 */ { wch: 14 },
    /* Cat. licencia         */ { wch: 18 },
    /* Venc. licencia        */ { wch: 16 },
    /* Docs cargados         */ { wch: 14 },
    /* Docs verificados      */ { wch: 16 },
    // 10 columnas de documentos (30ch c/u)
    ...Array(10).fill({ wch: 30 }),
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Personal");

  // Hoja 2: Resumen de verificación (solo docs con resultado)
  const filasVerif = personal.flatMap((p) =>
    (p.documentos ?? [])
      .filter((d) => d.verificacion_observacion || d.verificado_auto)
      .map((d) => ({
        "Cédula persona": p.cedula,
        "Nombre persona": p.nombres,
        "Empresa": p.proveedor?.nombre ?? "-",
        "Tipo documento": TIPO_LABELS[d.tipo] ?? d.tipo,
        "Verificado": d.verificado_auto ? "Sí" : "No",
        "Confianza": d.verificacion_confianza ?? "-",
        "Observación verificación": d.verificacion_observacion ?? "-",
        "Fecha verificación": d.verificado_at
          ? new Date(d.verificado_at).toLocaleDateString("es-CO")
          : "-",
        "Vencimiento doc": d.fecha_vencimiento
          ? new Date(d.fecha_vencimiento).toLocaleDateString("es-CO")
          : "Sin vencimiento",
      }))
  );

  if (filasVerif.length > 0) {
    const wsVerif = XLSX.utils.json_to_sheet(filasVerif);
    wsVerif["!cols"] = [
      { wch: 14 }, { wch: 32 }, { wch: 30 }, { wch: 26 },
      { wch: 10 }, { wch: 10 }, { wch: 50 }, { wch: 16 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsVerif, "Verificación docs");
  }

  return Buffer.from(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}
