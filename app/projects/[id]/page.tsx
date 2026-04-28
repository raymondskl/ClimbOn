import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import {
  assignmentRepo,
  employeeRepo,
  projectRepo,
  skillRepo,
  taskRepo,
} from "@/lib/repo";
import { currency, dateShort, todayIso } from "@/lib/format";
import type { TaskStatus } from "@/lib/types";
import {
  createTask,
  deleteTask,
  removeAssignment,
  updateTaskStatus,
} from "../actions";
import { ScheduleForm } from "./ScheduleForm";
import { ProjectScheduleBoard } from "./ProjectScheduleBoard";

export const dynamic = "force-dynamic";

const SCHED_DAYS = 84;
const SCHED_DAYS_BEFORE = 14;

function scheduleWindowStart(projectStart: string | null) {
  const anchor = projectStart ? new Date(projectStart + "T00:00:00") : new Date();
  anchor.setDate(anchor.getDate() - SCHED_DAYS_BEFORE);
  const day = anchor.getDay();
  anchor.setDate(anchor.getDate() + (day === 0 ? -6 : 1 - day));
  return anchor.toISOString().slice(0, 10);
}

const TASK_STATUSES: { value: TaskStatus; label: string; tone: string }[] = [
  { value: "todo", label: "To do", tone: "bg-slate-100 text-slate-700" },
  { value: "in_progress", label: "In progress", tone: "bg-sky-50 text-sky-700" },
  { value: "blocked", label: "Blocked", tone: "bg-amber-50 text-amber-700" },
  { value: "done", label: "Done", tone: "bg-emerald-50 text-emerald-700" },
];

function toneForTask(status: TaskStatus) {
  return TASK_STATUSES.find((s) => s.value === status)?.tone ?? "bg-slate-100 text-slate-700";
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) notFound();
  const project = projectRepo.get(id);
  if (!project) notFound();

  const assignments = assignmentRepo.listForProject(id);
  const tasks = taskRepo.listForProject(id);
  const skills = skillRepo.list();
  const fin = projectRepo.financialsFor(id);

  const defaultStart = project.start_date || todayIso();
  const defaultEnd = project.due_date || defaultStart;

  const availableForWindow = assignmentRepo.availableEmployees(defaultStart, defaultEnd);
  const allActive = employeeRepo.listWithSkills().filter((e) => e.active === 1);
  const boardWindowStart = scheduleWindowStart(project.start_date);
  const boardAssignments = allActive.flatMap((e) =>
    assignmentRepo.listForEmployee(e.id).map((a) => ({
      id: a.id,
      project_id: a.project_id,
      employee_id: a.employee_id,
      start_date: a.start_date,
      end_date: a.end_date,
      project_name: a.project_name,
    })),
  );

  return (
    <div>
      <PageHeader
        title={project.name}
        description={project.client ? `Client: ${project.client}` : "Project detail"}
        actions={
          <Link href="/projects" className="text-xs text-brand-600 hover:underline">
            ← All projects
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Status" value={project.status.replace("_", " ")} />
        <StatCard label="Window" value={`${dateShort(project.start_date)} → ${dateShort(project.due_date)}`} />
        <StatCard label="Budget" value={currency(project.budget)} />
        <StatCard label="Net (P/L)" value={currency(fin.net)} />
      </div>

      <div className="card mt-6">
        <div className="card-body">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Schedule</h2>
          <p className="mb-3 text-xs text-slate-500">
            Drag across an empty row to book days on this project. Striped bars show bookings on other projects (read-only context for spotting conflicts).
          </p>
          <ProjectScheduleBoard
            projectId={id}
            projectName={project.name}
            employees={allActive.map((e) => ({
              id: e.id,
              name: e.name,
              role: e.role,
              skills: e.skills.map((s) => s.name),
            }))}
            assignments={boardAssignments}
            windowStart={boardWindowStart}
            days={SCHED_DAYS}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-body">
            <h2 className="mb-1 text-sm font-semibold text-slate-700">Schedule an employee</h2>
            <p className="mb-3 text-xs text-slate-500">
              Only employees who are free for the selected window are shown. Overlaps are rejected.
            </p>
            <ScheduleForm
              projectId={id}
              employees={availableForWindow}
              defaultStart={defaultStart}
              defaultEnd={defaultEnd}
            />
            {availableForWindow.length < allActive.length ? (
              <p className="mt-3 text-[11px] text-slate-500">
                {allActive.length - availableForWindow.length} employee(s) hidden — already booked in the default window.
                Adjust dates on the form if needed.
              </p>
            ) : null}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-body">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Scheduled team</h2>
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-500">No one scheduled yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role on project</th>
                      <th>Window</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="font-medium">{a.employee_name}</td>
                        <td className="text-slate-600">{a.role ?? "—"}</td>
                        <td className="whitespace-nowrap text-slate-500">
                          {dateShort(a.start_date)} – {dateShort(a.end_date)}
                        </td>
                        <td className="text-right">
                          <form action={removeAssignment}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="project_id" value={id} />
                            <button className="text-xs text-rose-600 hover:underline">Remove</button>
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-body">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Add a task</h2>
            <form action={createTask} className="space-y-3">
              <input type="hidden" name="project_id" value={id} />
              <div>
                <label className="label">Description</label>
                <input name="description" className="input" required placeholder="e.g. Rig anchors on east wall" />
              </div>
              <div>
                <label className="label">Required skill</label>
                <input
                  name="skill_name"
                  list="skills-list"
                  className="input"
                  placeholder="e.g. Rigging, Welding"
                />
                <datalist id="skills-list">
                  {skills.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
                <p className="mt-1 text-[11px] text-slate-500">
                  Free text — new skills are created automatically.
                </p>
              </div>
              <div>
                <label className="label">Assign to</label>
                <select name="assigned_employee_id" className="select" defaultValue="">
                  <option value="">Unassigned</option>
                  {assignments.map((a) => (
                    <option key={a.id} value={a.employee_id}>
                      {a.employee_name} (scheduled)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Only scheduled team members can own tasks.
                </p>
              </div>
              <div>
                <label className="label">Due date</label>
                <input type="date" name="due_date" className="input" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea name="notes" rows={2} className="textarea" />
              </div>
              <button type="submit" className="btn-primary w-full">
                Add task
              </button>
            </form>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-body">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Tasks</h2>
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-500">No tasks yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Skill</th>
                      <th>Owner</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => {
                      const owner = t.assigned_employee_id
                        ? employeeRepo.get(t.assigned_employee_id)
                        : null;
                      const ownerSkills = owner ? employeeRepo.skillsFor(owner.id) : [];
                      const skillMatch =
                        t.required_skill_id && owner
                          ? ownerSkills.some((s) => s.id === t.required_skill_id)
                          : null;
                      return (
                        <tr key={t.id}>
                          <td className="font-medium">
                            {t.description}
                            {t.notes ? (
                              <div className="text-xs text-slate-500">{t.notes}</div>
                            ) : null}
                          </td>
                          <td>
                            {t.required_skill_name ? (
                              <span className="badge bg-indigo-50 text-indigo-700">
                                {t.required_skill_name}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td>
                            <div className="text-slate-700">{t.assigned_employee_name ?? "—"}</div>
                            {skillMatch === false ? (
                              <div className="text-[11px] text-amber-700">
                                Owner lacks required skill
                              </div>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap text-slate-500">
                            {dateShort(t.due_date)}
                          </td>
                          <td>
                            <form action={updateTaskStatus} className="flex items-center gap-2">
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="project_id" value={id} />
                              <select
                                name="status"
                                defaultValue={t.status}
                                className={`select !py-1 text-xs ${toneForTask(t.status)}`}
                              >
                                {TASK_STATUSES.map((s) => (
                                  <option key={s.value} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                              <button className="text-xs text-brand-600 hover:underline">Save</button>
                            </form>
                          </td>
                          <td className="text-right">
                            <form action={deleteTask}>
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="project_id" value={id} />
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

      {project.notes ? (
        <div className="card mt-6">
          <div className="card-body">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Notes</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{project.notes}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
