"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  aprobado: number;
  pendiente: number;
  rechazado: number;
  inactivo: number;
}

const COLORES: Record<string, string> = {
  Aprobado: "#22c55e",
  Pendiente: "#f59e0b",
  Rechazado: "#ef4444",
  Inactivo: "#9ca3af",
};

export function ChartBarEstados({ aprobado, pendiente, rechazado, inactivo }: Props) {
  const data = [
    { name: "Aprobado", value: aprobado },
    { name: "Pendiente", value: pendiente },
    { name: "Rechazado", value: rechazado },
    { name: "Inactivo", value: inactivo },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #f3f4f6" }}
          cursor={{ fill: "#f9fafb" }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORES[entry.name]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
