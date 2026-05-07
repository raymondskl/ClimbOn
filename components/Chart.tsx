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



const tooltipStyle = {
  backgroundColor: "var(--surface-2)",
  border: "1px solid var(--border-2)",
  borderRadius: "0.5rem",
  color: "var(--text)",
  fontSize: "0.8125rem",
  fontFamily: "var(--font-dm-mono)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
};

const tickStyle = { fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" };

export function CashFlowChart({ data }: { data: { month: string; income: number; expense: number; net: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: number) => v.toLocaleString(undefined, { style: "currency", currency: "USD" })}
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Legend
          wrapperStyle={{ fontFamily: "var(--font-dm-mono)", fontSize: "0.6875rem", color: "var(--text-muted)", letterSpacing: "0.05em" }}
        />
        <Bar dataKey="income" fill="#2AD484" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="expense" fill="#FF3D5C" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetLineChart({ data }: { data: { month: string; net: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5A623" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: number) => v.toLocaleString(undefined, { style: "currency", currency: "USD" })}
          contentStyle={tooltipStyle}
          cursor={{ stroke: "#2D2E3F", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="net"
          stroke="#F5A623"
          fill="url(#netGrad)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#F5A623", stroke: "#0A0B10", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["#F5A623", "#2AD484", "#8B8BFF", "#FF3D5C", "#38D4E8", "#FFD60A", "#A855F7"];

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => v.toLocaleString(undefined, { style: "currency", currency: "USD" })}
          contentStyle={tooltipStyle}
        />
        <Legend
          wrapperStyle={{ fontFamily: "var(--font-dm-mono)", fontSize: "0.6875rem", color: "var(--text-muted)" }}
        />
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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="x" tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontFamily: "var(--font-dm-mono)", fontSize: "0.6875rem", color: "var(--text-muted)" }} />
        <Line type="monotone" dataKey="actual" stroke="#F5A623" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        {trend ? (
          <Line type="monotone" dataKey="trend" stroke="#52526A" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
        ) : null}
        <Line type="monotone" dataKey="forecast" stroke="#8B8BFF" strokeWidth={2} strokeDasharray="6 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SimpleLine({ data }: { data: { x: string; y: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="x" tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="y" stroke="#F5A623" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
