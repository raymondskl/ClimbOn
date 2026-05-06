import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { CashFlowChart, NetLineChart } from "@/components/Chart";
import { txRepo, leadRepo, projectRepo, employeeRepo } from "@/lib/repo";
import { currency, dateShort } from "@/lib/format";
import { growthRate } from "@/lib/forecast";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [totals, monthly, projects, leads, employees] = await Promise.all([
    txRepo.totals(),
    txRepo.monthlyTotals(12),
    projectRepo.list(),
    leadRepo.list(),
    employeeRepo.list(),
  ]);
  const activeProjects = projects.filter((p) => p.status === "active");
  const openLeads = leads.filter((l) => !["won", "lost"].includes(l.stage));
  const pipelineValue = openLeads.reduce((s, l) => s + l.estimated_value, 0);
  const activeHeadcount = employees.filter((e) => e.active === 1).length;
  const netTrend = growthRate(monthly.map((m) => m.net));
  const incomeTrend = growthRate(monthly.map((m) => m.income));

  const upcoming = leads
    .filter((l) => l.next_action_date)
    .sort((a, b) => (a.next_action_date ?? "").localeCompare(b.next_action_date ?? ""))
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Snapshot of your finances, pipeline, and team."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Income" value={currency(totals.income)} trend={{ value: incomeTrend, label: "vs earliest month" }} />
        <StatCard label="Total Expenses" value={currency(totals.expense)} />
        <StatCard label="Net Cash" value={currency(totals.net)} trend={{ value: netTrend, label: "net growth" }} />
        <StatCard label="Open Pipeline" value={currency(pipelineValue)} hint={`${openLeads.length} open leads`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-body">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Monthly cash flow</h2>
              <Link href="/finances" className="text-xs text-brand-600 hover:underline">View finances →</Link>
            </div>
            <CashFlowChart data={monthly} />
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Net trend</h2>
            </div>
            <NetLineChart data={monthly.map((m) => ({ month: m.month, net: m.net }))} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-body">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Active projects</h2>
              <Link href="/projects" className="text-xs text-brand-600 hover:underline">All →</Link>
            </div>
            {activeProjects.length === 0 ? (
              <p className="text-sm text-slate-500">No active projects yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {activeProjects.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.client ?? "Internal"} · due {dateShort(p.due_date)}</div>
                    </div>
                    <div className="text-sm font-medium text-slate-700">{currency(p.budget)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Upcoming lead actions</h2>
              <Link href="/leads" className="text-xs text-brand-600 hover:underline">Pipeline →</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">No follow-ups scheduled.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {upcoming.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{l.name} <span className="text-slate-400 font-normal">· {l.company ?? "—"}</span></div>
                      <div className="text-xs text-slate-500">{l.next_action ?? "Follow up"} · {dateShort(l.next_action_date)}</div>
                    </div>
                    <span className="text-sm font-medium text-slate-700">{currency(l.estimated_value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 card">
        <div className="card-body">
          <h2 className="text-sm font-semibold text-slate-700">At a glance</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <div className="text-xs uppercase text-slate-500">Projects</div>
              <div className="text-lg font-semibold">{projects.length}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Active team</div>
              <div className="text-lg font-semibold">{activeHeadcount}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Leads tracked</div>
              <div className="text-lg font-semibold">{leads.length}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Data series</div>
              <div className="text-lg font-semibold"><Link href="/analytics" className="text-brand-600 hover:underline">Import →</Link></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
