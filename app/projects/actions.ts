"use server";

import { revalidatePath } from "next/cache";
import {
  assignmentRepo,
  projectRepo,
  skillRepo,
  taskRepo,
} from "@/lib/repo";
import type { ProjectStatus, TaskStatus } from "@/lib/types";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await projectRepo.create({
    name,
    client: String(formData.get("client") ?? "").trim() || null,
    status: (String(formData.get("status") ?? "planned") as ProjectStatus),
    budget: Number(formData.get("budget") ?? 0) || 0,
    start_date: String(formData.get("start_date") ?? "") || null,
    due_date: String(formData.get("due_date") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function updateProject(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await projectRepo.update(id, {
    name,
    client: String(formData.get("client") ?? "").trim() || null,
    status: (String(formData.get("status") ?? "planned") as ProjectStatus),
    budget: Number(formData.get("budget") ?? 0) || 0,
    start_date: String(formData.get("start_date") ?? "") || null,
    due_date: String(formData.get("due_date") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
}

export async function updateProjectStatus(formData: FormData) {
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "") as ProjectStatus;
  if (!id || !status) return;
  await projectRepo.update(id, { status });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
}

export async function deleteProject(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await projectRepo.delete(id);
  revalidatePath("/projects");
  revalidatePath("/");
}

export type ScheduleResult =
  | { ok: true }
  | { ok: false; error: string; conflicts?: { project_name: string; start_date: string; end_date: string }[] };

export async function scheduleEmployee(
  _prev: ScheduleResult | null,
  formData: FormData,
): Promise<ScheduleResult> {
  const project_id = Number(formData.get("project_id"));
  const employee_id = Number(formData.get("employee_id"));
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "");
  const role = String(formData.get("role") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!project_id || !employee_id || !start_date || !end_date) {
    return { ok: false, error: "All fields marked required are needed." };
  }

  const result = await assignmentRepo.create({
    project_id,
    employee_id,
    start_date,
    end_date,
    role,
    notes,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      conflicts: result.conflicts.map((c) => ({
        project_name: c.project_name,
        start_date: c.start_date,
        end_date: c.end_date,
      })),
    };
  }

  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/employees");
  return { ok: true };
}

export async function removeAssignment(formData: FormData) {
  const id = Number(formData.get("id"));
  const project_id = Number(formData.get("project_id"));
  if (!id) return;
  await assignmentRepo.delete(id);
  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/employees");
}

export async function createTask(formData: FormData) {
  const project_id = Number(formData.get("project_id"));
  const description = String(formData.get("description") ?? "").trim();
  if (!project_id || !description) return;

  const skillName = String(formData.get("skill_name") ?? "").trim();
  const skill = skillName ? await skillRepo.findOrCreate(skillName) : null;

  const assignedRaw = String(formData.get("assigned_employee_id") ?? "");
  const assigned_employee_id = assignedRaw ? Number(assignedRaw) : null;

  await taskRepo.create({
    project_id,
    description,
    required_skill_id: skill?.id ?? null,
    assigned_employee_id,
    due_date: String(formData.get("due_date") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath(`/projects/${project_id}`);
}

export async function updateTaskStatus(formData: FormData) {
  const id = Number(formData.get("id"));
  const project_id = Number(formData.get("project_id"));
  const status = String(formData.get("status") ?? "") as TaskStatus;
  if (!id || !status) return;
  await taskRepo.updateStatus(id, status);
  revalidatePath(`/projects/${project_id}`);
}

export async function deleteTask(formData: FormData) {
  const id = Number(formData.get("id"));
  const project_id = Number(formData.get("project_id"));
  if (!id) return;
  await taskRepo.delete(id);
  revalidatePath(`/projects/${project_id}`);
}
