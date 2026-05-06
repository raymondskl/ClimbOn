"use server";

import { revalidatePath } from "next/cache";
import { txRepo } from "@/lib/repo";

export async function createTransaction(formData: FormData) {
  const type = String(formData.get("type") ?? "expense") as "income" | "expense";
  const occurred_on = String(formData.get("occurred_on") ?? "");
  const category = String(formData.get("category") ?? "").trim() || "Uncategorized";
  const amount = Number(formData.get("amount") ?? 0);
  const description = String(formData.get("description") ?? "").trim() || null;
  const projectRaw = String(formData.get("project_id") ?? "");
  const project_id = projectRaw ? Number(projectRaw) : null;
  if (!occurred_on || !Number.isFinite(amount) || amount <= 0) return;
  await txRepo.create({ type, occurred_on, category, amount, description, project_id });
  revalidatePath("/finances");
  revalidatePath("/");
  revalidatePath("/projects");
}

export async function deleteTransaction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await txRepo.delete(id);
  revalidatePath("/finances");
  revalidatePath("/");
}
