"use server";

import { revalidatePath } from "next/cache";
import { employeeRepo, skillRepo } from "@/lib/repo";
import type { EmploymentType } from "@/lib/types";

export async function createEmployee(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await employeeRepo.create({
    name,
    role: String(formData.get("role") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    employment_type: (String(formData.get("employment_type") ?? "full_time") as EmploymentType),
    salary: Number(formData.get("salary") ?? 0) || 0,
    start_date: String(formData.get("start_date") ?? "") || null,
    active: 1,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/employees");
  revalidatePath("/");
}

export async function updateEmployee(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await employeeRepo.update(id, {
    name,
    role: String(formData.get("role") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    employment_type: (String(formData.get("employment_type") ?? "full_time") as EmploymentType),
    salary: Number(formData.get("salary") ?? 0) || 0,
    start_date: String(formData.get("start_date") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/employees");
  revalidatePath("/");
}

export async function toggleEmployee(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await employeeRepo.toggleActive(id);
  revalidatePath("/employees");
  revalidatePath("/");
}

export async function deleteEmployee(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await employeeRepo.delete(id);
  revalidatePath("/employees");
  revalidatePath("/");
}

export async function addSkillTag(formData: FormData) {
  const employee_id = Number(formData.get("employee_id"));
  const skill_name = String(formData.get("skill_name") ?? "").trim();
  if (!employee_id || !skill_name) return;
  const skill = await skillRepo.findOrCreate(skill_name);
  await employeeRepo.addSkill(employee_id, skill.id);
  revalidatePath("/employees");
}

export async function removeSkillTag(formData: FormData) {
  const employee_id = Number(formData.get("employee_id"));
  const skill_id = Number(formData.get("skill_id"));
  if (!employee_id || !skill_id) return;
  await employeeRepo.removeSkill(employee_id, skill_id);
  revalidatePath("/employees");
}
