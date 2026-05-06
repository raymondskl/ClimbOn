import { PageHeader } from "@/components/PageHeader";
import {
  assignmentRepo,
  employeeRepo,
  projectRepo,
} from "@/lib/repo";
import { ScheduleBoard } from "./ScheduleBoard";

export const dynamic = "force-dynamic";

const DAYS_VISIBLE = 84;
const DAYS_BEFORE_TODAY = 14;

function windowStartIso() {
  const d = new Date();
  d.setDate(d.getDate() - DAYS_BEFORE_TODAY);
  const day = d.getDay();
  const toMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + toMonday);
  return d.toISOString().slice(0, 10);
}

export default async function SchedulePage() {
  const [allProjects, allEmployees] = await Promise.all([
    projectRepo.list(),
    employeeRepo.listWithSkills(),
  ]);
  const projects = allProjects.filter((p) => p.status !== "cancelled" && p.status !== "completed");
  const employeesWithSkills = allEmployees.filter((e) => e.active === 1);
  const windowStart = windowStartIso();

  const projectAssignments = await Promise.all(
    projects.map((p) => assignmentRepo.listForProject(p.id)),
  );
  const assignments = projectAssignments.flat().map((a) => ({
    id: a.id,
    project_id: a.project_id,
    employee_id: a.employee_id,
    start_date: a.start_date,
    end_date: a.end_date,
  }));

  return (
    <div>
      <PageHeader
        title="Schedule"
        description="Drag employees onto projects. Move or resize bars to adjust days. Conflicts are blocked automatically."
      />
      <ScheduleBoard
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          client: p.client,
          status: p.status,
        }))}
        employees={employeesWithSkills.map((e) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          skills: e.skills.map((s) => s.name),
        }))}
        assignments={assignments}
        windowStart={windowStart}
        days={DAYS_VISIBLE}
      />
    </div>
  );
}
