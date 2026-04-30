import * as XLSX from "xlsx";
import type { Personal, TipoDocumento } from "@/types";

const TIPO_LABELS: Record<TipoDocumento, string> = {
  cedula: "Cédula",
  licencia: "Licencia",
  arl: "ARL",
  soat: "SOAT",
  tecnicomecanica: "Tecnomecánica",
};

const ESTADO_LABELS: Record<string, string> = {
  aprobado: "Aprobado",
  pendiente: "Pendiente",
  rechazado: "Rechazado",
  inactivo: "Inactivo",
};

function diasHastaVencer(fecha: string | null): string {
  if (!fecha) return "-";
  const dias = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  if (dias <= 0) return "VENCIDO";
  return `${dias} días`;
}

export function generarExcelPersonal(personal: Personal[]): Buffer {
  const filas = personal.flatMap((p) => {
    const tiposPersona: TipoDocumento[] = ["cedula", "licencia", "arl"];
    const tiposVehiculo: TipoDocumento[] = ["soat", "tecnicomecanica"];
    const todosLosTipos = [...tiposPersona, ...(p.vehiculo_id ? tiposVehiculo : [])];

    return [
      {
        Nombres: p.nombres,
        Cédula: p.cedula,
        Empresa: p.proveedor?.nombre ?? "-",
        NIT: p.proveedor?.nit ?? "-",
        Estado: ESTADO_LABELS[p.estado] ?? p.estado,
        "En corrección": p.en_correccion ? "Sí" : "No",
        "Fecha entrada": p.fecha_entrada ? new Date(p.fecha_entrada).toLocaleDateString("es-CO") : "-",
        "Fecha fin": p.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString("es-CO") : "-",
        Vehículo: p.vehiculo ? `${p.vehiculo.placa} — ${p.vehiculo.marca ?? ""} ${p.vehiculo.modelo ?? ""}`.trim() : "-",
        "Docs cargados": `${todosLosTipos.filter((t) => p.documentos?.some((d) => d.tipo === t)).length}/${todosLosTipos.length}`,
        ...Object.fromEntries(
          todosLosTipos.map((tipo) => {
            const doc = p.documentos?.find((d) => d.tipo === tipo);
            return [
              TIPO_LABELS[tipo],
              doc
                ? `${doc.fecha_vencimiento ? new Date(doc.fecha_vencimiento).toLocaleDateString("es-CO") : "Sin vencimiento"} (${diasHastaVencer(doc.fecha_vencimiento)})`
                : "No cargado",
            ];
          })
        ),
        "Registrado": new Date(p.created_at).toLocaleDateString("es-CO"),
      },
    ];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(filas);

  ws["!cols"] = [
    { wch: 30 }, { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 12 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 25 }, { wch: 14 },
    { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Personal");

  return Buffer.from(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}
