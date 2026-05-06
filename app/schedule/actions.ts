"use server";

import { revalidatePath } from "next/cache";
import { assignmentRepo } from "@/lib/repo";

export type MutationResult =
  | { ok: true; id?: number }
  | { ok: false; error: string };

export async function moveAssignmentAction(input: {
  id: number;
  start_date: string;
  end_date: string;
}): Promise<MutationResult> {
  if (!input.id || !input.start_date || !input.end_date) {
    return { ok: false, error: "Missing fields." };
  }
  const result = await assignmentRepo.updateDates(input.id, input.start_date, input.end_date);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/schedule");
  revalidatePath("/employees");
  return { ok: true };
}

export async function createAssignmentFromDrag(input: {
  project_id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
}): Promise<MutationResult> {
  if (!input.project_id || !input.employee_id || !input.start_date || !input.end_date) {
    return { ok: false, error: "Missing fields." };
  }
  const result = await assignmentRepo.create({
    project_id: input.project_id,
    employee_id: input.employee_id,
    start_date: input.start_date,
    end_date: input.end_date,
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/schedule");
  revalidatePath("/employees");
  revalidatePath(`/projects/${input.project_id}`);
  return { ok: true, id: result.id };
}

export async function deleteAssignmentAction(id: number): Promise<MutationResult> {
  if (!id) return { ok: false, error: "Missing id." };
  await assignmentRepo.delete(id);
  revalidatePath("/schedule");
  revalidatePath("/employees");
  return { ok: true };
}
