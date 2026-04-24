"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function CashFlowChart({ data }: { data: { month: string; income: number; expense: number; net: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => v.toLocaleString(undefined, { style: "currency", currency: "USD" })} />
        <Legend />
        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetLineChart({ data }: { data: { month: string; net: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => v.toLocaleString(undefined, { style: "currency", currency: "USD" })} />
        <Area type="monotone" dataKey="net" stroke="#0284c7" fill="#bae6fd" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["#0ea5e9", "#14b8a6", "#8b5cf6", "#f59e0b", "#f43f5e", "#10b981", "#6366f1"];

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => v.toLocaleString(undefined, { style: "currency", currency: "USD" })} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ForecastChart({
  actual,
  forecast,
  trend,
}: {
  actual: { x: string; y: number }[];
  forecast: { x: string; y: number }[];
  trend?: { x: string; y: number }[];
}) {
  const merged: { x: string; actual?: number; forecast?: number; trend?: number }[] = [];
  actual.forEach((p, i) => merged.push({ x: p.x, actual: p.y, trend: trend?.[i]?.y }));
  if (actual.length > 0 && forecast.length > 0) {
    const bridge = merged[merged.length - 1];
    merged[merged.length - 1] = { ...bridge, forecast: bridge.actual };
  }
  forecast.forEach((p) => merged.push({ x: p.x, forecast: p.y }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={merged} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="x" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => v.toLocaleString()} />
        <Legend />
        <Line type="monotone" dataKey="actual" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
        {trend ? <Line type="monotone" dataKey="trend" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} /> : null}
        <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SimpleLine({ data }: { data: { x: string; y: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="x" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="y" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
