import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { datasetRepo, txRepo } from "@/lib/repo";
import { createDatasetFromCsv, deleteDataset } from "./actions";
import { ForecastChart } from "@/components/Chart";
import { StatCard } from "@/components/StatCard";
import {
  growthRate,
  linearRegression,
  movingAverage,
  nextMonthLabel,
  projectForward,
} from "@/lib/forecast";
import { currency } from "@/lib/format";

export const dynamic = "force-dynamic";

function summarize(series: { x: string; y: number }[]) {
  const values = series.map((p) => p.y);
  const sum = values.reduce((s, v) => s + v, 0);
  const avg = values.length ? sum / values.length : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const reg = linearRegression(values);
  return { sum, avg, min, max, reg, growth: growthRate(values) };
}

export default async function AnalyticsPage({ searchParams }: { searchParams: { ds?: string } }) {
  const datasets = await datasetRepo.list();
  const selectedId = searchParams.ds ? Number(searchParams.ds) : datasets[0]?.id;
  const selected = selectedId ? await datasetRepo.get(selectedId) : undefined;
  const rows = selected ? await datasetRepo.rows(selected.id) : [];
  const series = rows.map((r) => ({ x: r.point_date, y: r.value }));

  const cashflow = await txRepo.monthlyTotals(24);
  const netSeries = cashflow.map((m) => ({ x: m.month, y: m.net }));
  const revSeries = cashflow.map((m) => ({ x: m.month, y: m.income }));
  const revForecast = projectForward(revSeries, 6, nextMonthLabel);
  const netForecast = projectForward(netSeries, 6, nextMonthLabel);
  const revTrend = (() => {
    if (revSeries.length < 2) return [];
    const reg = linearRegression(revSeries.map((p) => p.y));
    return revSeries.map((p, i) => ({ x: p.x, y: reg.intercept + reg.slope * i }));
  })();

  const datasetSummary = selected ? summarize(series) : null;
  const datasetForecast = selected && series.length >= 3 ? projectForward(series, 6, (i, last) => {
    const base = new Date(last);
    base.setUTCDate(base.getUTCDate() + i * 30);
    return base.toISOString().slice(0, 10);
  }) : [];
  const datasetMA = selected ? movingAverage(series, Math.min(3, series.length)) : [];

  return (
    <div>
      <PageHeader
        title="Analytics & Forecasting"
        description="Built-in forecasts for your finances, plus bring your own data via CSV."
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Revenue forecast (from your transactions)</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="Avg monthly revenue" value={currency(revSeries.length ? revSeries.reduce((s, p) => s + p.y, 0) / revSeries.length : 0)} />
          <StatCard label="Revenue growth" value={`${(growthRate(revSeries.map((p) => p.y)) * 100).toFixed(1)}%`} hint="first → latest month" />
          <StatCard label="6-mo revenue forecast" value={currency(revForecast.reduce((s, p) => s + p.y, 0))} hint="linear trend projection" />
          <StatCard label="6-mo net forecast" value={currency(netForecast.reduce((s, p) => s + p.y, 0))} hint="income − expenses" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="card">
            <div className="card-body">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Revenue — actual, trend, forecast</h3>
              {revSeries.length < 2 ? (
                <p className="text-sm text-slate-500">Add a few months of income in <Link href="/finances" className="text-brand-600 hover:underline">Finances</Link> to see a forecast.</p>
              ) : (
                <ForecastChart actual={revSeries} forecast={revForecast} trend={revTrend} />
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Net cash — actual & forecast</h3>
              {netSeries.length < 2 ? (
                <p className="text-sm text-slate-500">No net cash history yet.</p>
              ) : (
                <ForecastChart actual={netSeries} forecast={netForecast} />
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Forecast uses linear regression on monthly totals. Good for spotting direction; treat exact numbers as a rough guide, not a plan.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Your data</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-1">
            <div className="card-body">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Import CSV</h3>
              <form action={createDatasetFromCsv} className="space-y-3">
                <div>
                  <label className="label">Dataset name</label>
                  <input name="name" className="input" placeholder="Website traffic, Unit sales…" required />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input name="description" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Date column</label>
                    <input name="date_column" className="input" placeholder="date" required />
                  </div>
                  <div>
                    <label className="label">Value column</label>
                    <input name="value_column" className="input" placeholder="visitors" required />
                  </div>
                </div>
                <div>
                  <label className="label">CSV contents</label>
                  <textarea name="csv" rows={7} className="textarea font-mono text-xs" placeholder={`date,visitors\n2025-01-01,1200\n2025-02-01,1380`} required />
                  <p className="mt-1 text-xs text-slate-400">Paste CSV text. First row must be headers. Other columns are stored as metadata.</p>
                </div>
                <button className="btn-primary w-full">Import dataset</button>
              </form>
            </div>
          </div>

          <div className="card lg:col-span-2">
            <div className="card-body">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  {selected ? `Dataset · ${selected.name}` : "Datasets"}
                </h3>
                {datasets.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {datasets.map((d) => (
                      <Link
                        key={d.id}
                        href={`/analytics?ds=${d.id}`}
                        className={
                          "rounded-full px-3 py-1 text-xs font-medium " +
                          (d.id === selected?.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                        }
                      >
                        {d.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>

              {!selected ? (
                <p className="text-sm text-slate-500">Import your first dataset to see trends and forecasts here.</p>
              ) : (
                <>
                  {datasetSummary ? (
                    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <StatCard label="Data points" value={series.length} />
                      <StatCard label="Average" value={datasetSummary.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                      <StatCard label="Range" value={`${datasetSummary.min.toLocaleString()} – ${datasetSummary.max.toLocaleString()}`} />
                      <StatCard label="Growth (first→last)" value={`${(datasetSummary.growth * 100).toFixed(1)}%`} hint={`R² = ${datasetSummary.reg.r2.toFixed(2)}`} />
                    </div>
                  ) : null}

                  {series.length < 3 ? (
                    <p className="text-sm text-slate-500">Need at least 3 points to draw a chart.</p>
                  ) : (
                    <>
                      <ForecastChart actual={series} forecast={datasetForecast} trend={datasetMA} />
                      <p className="mt-2 text-xs text-slate-500">Dashed line = 6-period forecast (linear trend). Grey line = moving average.</p>
                    </>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Stored columns: {selected.date_column} (date), {selected.value_column} (value)</p>
                    <form action={deleteDataset}>
                      <input type="hidden" name="id" value={selected.id} />
                      <button className="btn-danger text-xs">Delete dataset</button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
