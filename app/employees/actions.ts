"use server";

import { revalidatePath } from "next/cache";
import { employeeRepo } from "@/lib/repo";
import type { EmploymentType } from "@/lib/types";

export async function createEmployee(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  employeeRepo.create({
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

export async function toggleEmployee(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  employeeRepo.toggleActive(id);
  revalidatePath("/employees");
  revalidatePath("/");
}

export async function deleteEmployee(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  employeeRepo.delete(id);
  revalidatePath("/employees");
  revalidatePath("/");
}
