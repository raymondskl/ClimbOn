"use server";

import { revalidatePath } from "next/cache";
import { projectRepo } from "@/lib/repo";
import type { ProjectStatus } from "@/lib/types";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  projectRepo.create({
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

export async function updateProjectStatus(formData: FormData) {
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "") as ProjectStatus;
  if (!id || !status) return;
  projectRepo.update(id, { status });
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function deleteProject(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  projectRepo.delete(id);
  revalidatePath("/projects");
  revalidatePath("/");
}
