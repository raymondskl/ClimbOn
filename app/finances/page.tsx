import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { CashFlowChart, CategoryPie, NetLineChart } from "@/components/Chart";
import { projectRepo, txRepo } from "@/lib/repo";
import { currency, currencyPrecise, dateShort, todayIso } from "@/lib/format";
import { createTransaction, deleteTransaction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const [totals, monthly, expenseBreakdown, incomeBreakdown, allTx, projects] = await Promise.all([
    txRepo.totals(),
    txRepo.monthlyTotals(12),
    txRepo.categoryBreakdown("expense"),
    txRepo.categoryBreakdown("income"),
    txRepo.list(),
    projectRepo.listBrief(),
  ]);
  const recent = allTx.slice(0, 25);
  const thisMonth = monthly[monthly.length - 1];
  const prevMonth = monthly[monthly.length - 2];
  const mom = prevMonth && prevMonth.net !== 0 ? (thisMonth.net - prevMonth.net) / Math.abs(prevMonth.net) : 0;

  return (
    <div>
      <PageHeader
        title="Finances"
        description="Log income and expenses, view cash flow, and break down categories."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Income (all time)" value={currency(totals.income)} />
        <StatCard label="Expenses (all time)" value={currency(totals.expense)} />
        <StatCard label="Net" value={currency(totals.net)} />
        <StatCard label="Net — this month" value={thisMonth ? currency(thisMonth.net) : "—"} trend={{ value: mom, label: "vs last month" }} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-body">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Monthly income vs expense</h2>
            <CashFlowChart data={monthly} />
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Net over time</h2>
            <NetLineChart data={monthly.map((m) => ({ month: m.month, net: m.net }))} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-body">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Expenses by category</h2>
            {expenseBreakdown.length === 0 ? <p className="text-sm text-slate-500">No expense data yet.</p> : <CategoryPie data={expenseBreakdown} />}
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Income by category</h2>
            {incomeBreakdown.length === 0 ? <p className="text-sm text-slate-500">No income data yet.</p> : <CategoryPie data={incomeBreakdown} />}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-body">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Log a transaction</h2>
            <form action={createTransaction} className="space-y-3">
              <div>
                <label className="label">Type</label>
                <select name="type" className="select" defaultValue="expense">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" name="occurred_on" className="input" defaultValue={todayIso()} required />
                </div>
                <div>
                  <label className="label">Amount</label>
                  <input type="number" step="0.01" min="0" name="amount" className="input" required />
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <input name="category" className="input" placeholder="e.g. Payroll, Services, Rent" required />
              </div>
              <div>
                <label className="label">Project (optional)</label>
                <select name="project_id" className="select">
                  <option value="">— None —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <input name="description" className="input" placeholder="Optional note" />
              </div>
              <button type="submit" className="btn-primary w-full">Add transaction</button>
            </form>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-body">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent transactions</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">No transactions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th className="text-right">Amount</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((t) => (
                      <tr key={t.id}>
                        <td className="whitespace-nowrap">{dateShort(t.occurred_on)}</td>
                        <td>
                          <span className={`badge ${t.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {t.type}
                          </span>
                        </td>
                        <td>{t.category}</td>
                        <td className="text-slate-500">{t.description ?? "—"}</td>
                        <td className="text-right font-medium">{currencyPrecise(t.amount)}</td>
                        <td className="text-right">
                          <form action={deleteTransaction}>
                            <input type="hidden" name="id" value={t.id} />
                            <button className="text-xs text-rose-600 hover:underline">Delete</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
