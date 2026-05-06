import { Fragment } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { assignmentRepo, employeeRepo, skillRepo } from "@/lib/repo";
import { currency, dateShort } from "@/lib/format";
import {
  addSkillTag,
  createEmployee,
  deleteEmployee,
  removeSkillTag,
  toggleEmployee,
} from "./actions";
import { EditEmployeeForm } from "./EditEmployee";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const [employees, allSkills] = await Promise.all([
    employeeRepo.listWithSkills(),
    skillRepo.list(),
  ]);
  const bookingsByEmployee = await Promise.all(
    employees.map((e) => assignmentRepo.listForEmployee(e.id)),
  );
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
                      <th>Skills</th>
                      <th>Bookings</th>
                      <th className="text-right">Salary</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e, idx) => {
                      const bookings = bookingsByEmployee[idx];
                      return (
                      <Fragment key={e.id}>
                      <tr>
                        <td>
                          <div className="font-medium">{e.name}</div>
                          <div className="text-xs text-slate-500">{e.email ?? "—"}</div>
                          <div className="text-[11px] text-slate-400">
                            {e.employment_type.replace("_", "-")} · started {dateShort(e.start_date)}
                          </div>
                        </td>
                        <td className="text-slate-600">{e.role ?? "—"}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {e.skills.map((s) => (
                              <form key={s.id} action={removeSkillTag} className="inline-flex">
                                <input type="hidden" name="employee_id" value={e.id} />
                                <input type="hidden" name="skill_id" value={s.id} />
                                <button
                                  type="submit"
                                  className="badge bg-indigo-50 text-indigo-700 hover:bg-rose-50 hover:text-rose-700"
                                  title="Remove skill"
                                >
                                  {s.name} ×
                                </button>
                              </form>
                            ))}
                          </div>
                          <form action={addSkillTag} className="mt-1 flex gap-1">
                            <input type="hidden" name="employee_id" value={e.id} />
                            <input
                              name="skill_name"
                              list={`skills-${e.id}`}
                              className="input !py-1 text-xs"
                              placeholder="+ skill"
                            />
                            <datalist id={`skills-${e.id}`}>
                              {allSkills
                                .filter((s) => !e.skills.find((x) => x.id === s.id))
                                .map((s) => (
                                  <option key={s.id} value={s.name} />
                                ))}
                            </datalist>
                            <button className="text-xs text-brand-600 hover:underline">Add</button>
                          </form>
                        </td>
                        <td className="text-xs text-slate-600">
                          {bookings.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {bookings.slice(0, 3).map((b) => (
                                <li key={b.id}>
                                  <span className="font-medium">{b.project_name}</span>
                                  <span className="text-slate-500">
                                    {" "}
                                    · {dateShort(b.start_date)}–{dateShort(b.end_date)}
                                  </span>
                                </li>
                              ))}
                              {bookings.length > 3 ? (
                                <li className="text-slate-400">+{bookings.length - 3} more</li>
                              ) : null}
                            </ul>
                          )}
                        </td>
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
                      <tr className="border-t-0">
                        <td colSpan={7} className="!py-0">
                          <EditEmployeeForm employee={e} />
                        </td>
                      </tr>
                      </Fragment>
                      );
                    })}
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
