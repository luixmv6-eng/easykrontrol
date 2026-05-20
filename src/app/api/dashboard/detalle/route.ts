import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Fila = { empresa: string; total: number };

function agrupar(data: unknown[] | null): Fila[] {
  const conteo: Record<string, number> = {};
  for (const row of data ?? []) {
    const r = row as { proveedor?: { nombre?: string } | null };
    const nombre = r?.proveedor?.nombre ?? "Sin empresa";
    conteo[nombre] = (conteo[nombre] ?? 0) + 1;
  }
  return Object.entries(conteo)
    .map(([empresa, total]) => ({ empresa, total }))
    .sort((a, b) => b.total - a.total);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");

  let filas: Fila[] = [];

  switch (tipo) {
    case "activo": {
      const { data } = await supabase
        .from("personal")
        .select("proveedor:proveedores(nombre)")
        .neq("estado", "inactivo");
      filas = agrupar(data as unknown[]);
      break;
    }

    case "aprobado": {
      const { data } = await supabase
        .from("personal")
        .select("proveedor:proveedores(nombre)")
        .eq("estado", "aprobado");
      filas = agrupar(data as unknown[]);
      break;
    }

    case "pendiente": {
      const { data } = await supabase
        .from("personal")
        .select("proveedor:proveedores(nombre)")
        .eq("estado", "pendiente");
      filas = agrupar(data as unknown[]);
      break;
    }

    case "correccion": {
      const { data } = await supabase
        .from("personal")
        .select("proveedor:proveedores(nombre)")
        .eq("en_correccion", true);
      filas = agrupar(data as unknown[]);
      break;
    }

    case "historial": {
      const { data } = await supabase
        .from("personal")
        .select("proveedor:proveedores(nombre)")
        .eq("estado", "inactivo");
      filas = agrupar(data as unknown[]);
      break;
    }

    case "vehiculos": {
      const { data } = await supabase
        .from("vehiculos")
        .select("proveedor:proveedores(nombre)")
        .eq("estado", "activo");
      filas = agrupar(data as unknown[]);
      break;
    }

    case "proveedores": {
      const { data } = await supabase
        .from("proveedores")
        .select("nombre")
        .eq("estado", "activo")
        .order("nombre");
      filas = (data ?? []).map((p) => ({ empresa: p.nombre, total: 1 }));
      break;
    }

    case "grupos": {
      const { data } = await supabase
        .from("grupos_ingreso")
        .select("proveedor:proveedores(nombre)")
        .eq("estado", "pendiente");
      filas = agrupar(data as unknown[]);
      break;
    }

    case "docs_vencer": {
      const now = new Date();
      const en60 = new Date(now.getTime() + 60 * 86400000);
      const nowStr = now.toISOString().split("T")[0];
      const en60Str = en60.toISOString().split("T")[0];

      const { data } = await supabase
        .from("documentos_personal")
        .select("personal:personal(proveedor:proveedores(nombre))")
        .gte("fecha_vencimiento", nowStr)
        .lte("fecha_vencimiento", en60Str);

      const rows = (data ?? []).map((d) => {
        const personal = (d as unknown as { personal?: { proveedor?: { nombre?: string } | null } | null }).personal;
        return { proveedor: personal?.proveedor ?? null };
      });
      filas = agrupar(rows);
      break;
    }

    case "actividades": {
      const { data } = await supabase
        .from("personal")
        .select("actividad_a_realizar")
        .neq("estado", "inactivo")
        .not("actividad_a_realizar", "is", null);

      const conteo: Record<string, number> = {};
      for (const row of data ?? []) {
        const act = (row as { actividad_a_realizar?: string | null }).actividad_a_realizar ?? "Sin actividad";
        conteo[act] = (conteo[act] ?? 0) + 1;
      }
      filas = Object.entries(conteo)
        .map(([empresa, total]) => ({ empresa, total }))
        .sort((a, b) => b.total - a.total);
      break;
    }

    default:
      return NextResponse.json({ error: "Tipo no reconocido" }, { status: 400 });
  }

  return NextResponse.json({ data: filas });
}
