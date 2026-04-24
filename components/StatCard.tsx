import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  trend,
  hint,
}: {
  label: string;
  value: ReactNode;
  trend?: { value: number; label?: string };
  hint?: string;
}) {
  const trendColor =
    trend === undefined
      ? ""
      : trend.value > 0
        ? "text-emerald-600"
        : trend.value < 0
          ? "text-rose-600"
          : "text-slate-500";
  return (
    <div className="card">
      <div className="card-body">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
        {trend !== undefined ? (
          <div className={`mt-2 text-xs font-medium ${trendColor}`}>
            {trend.value > 0 ? "▲" : trend.value < 0 ? "▼" : "•"} {Math.abs(trend.value * 100).toFixed(1)}%
            {trend.label ? ` · ${trend.label}` : null}
          </div>
        ) : null}
        {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
      </div>
    </div>
  );
}
