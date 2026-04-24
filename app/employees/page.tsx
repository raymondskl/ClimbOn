import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { employeeRepo } from "@/lib/repo";
import { currency, dateShort } from "@/lib/format";
import { createEmployee, deleteEmployee, toggleEmployee } from "./actions";

export const dynamic = "force-dynamic";

export default function EmployeesPage() {
  const employees = employeeRepo.list();
  const active = employees.filter((e) => e.active === 1);
  const totalSalary = active.reduce((s, e) => s + e.salary, 0);

  return (
    <div>
      <PageHeader title="Employees" description="Your team, roles, and payroll footprint." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Active team" value={active.length} />
        <StatCard label="All-time records" value={employees.length} />
        <StatCard label="Annual payroll" value={currency(totalSalary)} />
        <StatCard label="Monthly payroll" value={currency(totalSalary / 12)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-body">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Add a team member</h2>
            <form action={createEmployee} className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input name="name" className="input" required />
              </div>
              <div>
                <label className="label">Role</label>
                <input name="role" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email</label>
                  <input type="email" name="email" className="input" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input name="phone" className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select name="employment_type" className="select" defaultValue="full_time">
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </div>
                <div>
                  <label className="label">Annual salary</label>
                  <input type="number" step="0.01" min="0" name="salary" className="input" />
                </div>
              </div>
              <div>
                <label className="label">Start date</label>
                <input type="date" name="start_date" className="input" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea name="notes" rows={3} className="textarea" />
              </div>
              <button type="submit" className="btn-primary w-full">Add employee</button>
            </form>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-body">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Team roster</h2>
            {employees.length === 0 ? (
              <p className="text-sm text-slate-500">No employees yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Type</th>
                      <th>Started</th>
                      <th className="text-right">Salary</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div className="font-medium">{e.name}</div>
                          <div className="text-xs text-slate-500">{e.email ?? "—"}</div>
                        </td>
                        <td className="text-slate-600">{e.role ?? "—"}</td>
                        <td className="text-slate-600">{e.employment_type.replace("_", "-")}</td>
                        <td className="whitespace-nowrap text-slate-500">{dateShort(e.start_date)}</td>
                        <td className="text-right">{currency(e.salary)}</td>
                        <td>
                          <span className={`badge ${e.active === 1 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {e.active === 1 ? "active" : "inactive"}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-3">
                            <form action={toggleEmployee}>
                              <input type="hidden" name="id" value={e.id} />
                              <button className="text-xs text-brand-600 hover:underline">
                                {e.active === 1 ? "Deactivate" : "Reactivate"}
                              </button>
                            </form>
                            <form action={deleteEmployee}>
                              <input type="hidden" name="id" value={e.id} />
                              <button className="text-xs text-rose-600 hover:underline">Delete</button>
                            </form>
                          </div>
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
