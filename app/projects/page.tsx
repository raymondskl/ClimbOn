import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { projectRepo } from "@/lib/repo";
import { currency, dateShort } from "@/lib/format";
import { createProject, deleteProject, updateProjectStatus } from "./actions";
import type { ProjectStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: { value: ProjectStatus; label: string; tone: string }[] = [
  { value: "planned", label: "Planned", tone: "bg-slate-100 text-slate-700" },
  { value: "active", label: "Active", tone: "bg-emerald-50 text-emerald-700" },
  { value: "on_hold", label: "On hold", tone: "bg-amber-50 text-amber-700" },
  { value: "completed", label: "Completed", tone: "bg-sky-50 text-sky-700" },
  { value: "cancelled", label: "Cancelled", tone: "bg-rose-50 text-rose-700" },
];

function toneFor(status: ProjectStatus) {
  return STATUSES.find((s) => s.value === status)?.tone ?? "bg-slate-100 text-slate-700";
}

export default function ProjectsPage() {
  const projects = projectRepo.list();
  const active = projects.filter((p) => p.status === "active");
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const activeBudget = active.reduce((s, p) => s + p.budget, 0);

  return (
    <div>
      <PageHeader title="Projects" description="Track the jobs in flight and what's booked next." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total projects" value={projects.length} />
        <StatCard label="Active" value={active.length} />
        <StatCard label="Active budget" value={currency(activeBudget)} />
        <StatCard label="Portfolio budget" value={currency(totalBudget)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-body">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Add a project</h2>
            <form action={createProject} className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input name="name" className="input" required />
              </div>
              <div>
                <label className="label">Client</label>
                <input name="client" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Status</label>
                  <select name="status" className="select" defaultValue="planned">
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Budget</label>
                  <input type="number" step="0.01" min="0" name="budget" className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start date</label>
                  <input type="date" name="start_date" className="input" />
                </div>
                <div>
                  <label className="label">Due date</label>
                  <input type="date" name="due_date" className="input" />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea name="notes" rows={3} className="textarea" />
              </div>
              <button type="submit" className="btn-primary w-full">Add project</button>
            </form>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-body">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">All projects</h2>
            {projects.length === 0 ? (
              <p className="text-sm text-slate-500">No projects yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Client</th>
                      <th>Status</th>
                      <th>Due</th>
                      <th className="text-right">Budget</th>
                      <th className="text-right">P/L</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => {
                      const fin = projectRepo.financialsFor(p.id);
                      return (
                        <tr key={p.id}>
                          <td className="font-medium">
                            <Link href={`/projects/${p.id}`} className="text-brand-600 hover:underline">
                              {p.name}
                            </Link>
                          </td>
                          <td className="text-slate-500">{p.client ?? "—"}</td>
                          <td>
                            <form action={updateProjectStatus} className="flex items-center gap-2">
                              <input type="hidden" name="id" value={p.id} />
                              <select name="status" defaultValue={p.status} className={`select !py-1 text-xs ${toneFor(p.status)}`}>
                                {STATUSES.map((s) => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                              <button className="text-xs text-brand-600 hover:underline">Save</button>
                            </form>
                          </td>
                          <td className="whitespace-nowrap text-slate-500">{dateShort(p.due_date)}</td>
                          <td className="text-right">{currency(p.budget)}</td>
                          <td className={`text-right ${fin.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {currency(fin.net)}
                          </td>
                          <td className="text-right">
                            <form action={deleteProject}>
                              <input type="hidden" name="id" value={p.id} />
                              <button className="text-xs text-rose-600 hover:underline">Delete</button>
                            </form>
                          </td>
                        </tr>
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
