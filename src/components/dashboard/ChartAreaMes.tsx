"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { mes: string; total: number }[];
}

export function ChartAreaMes({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-[180px] flex items-center justify-center text-[12px] text-gray-300">
        Sin datos de registros
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7ab648" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7ab648" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #f3f4f6" }}
          cursor={{ stroke: "#7ab648", strokeWidth: 1, strokeDasharray: "4" }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#7ab648"
          strokeWidth={2}
          fill="url(#colorTotal)"
          name="Registros"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
