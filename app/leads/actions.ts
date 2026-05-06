"use server";

import { revalidatePath } from "next/cache";
import { leadRepo } from "@/lib/repo";
import type { LeadStage } from "@/lib/types";

export async function createLead(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await leadRepo.create({
    name,
    company: String(formData.get("company") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    source: String(formData.get("source") ?? "").trim() || null,
    stage: (String(formData.get("stage") ?? "new") as LeadStage),
    estimated_value: Number(formData.get("estimated_value") ?? 0) || 0,
    next_action: String(formData.get("next_action") ?? "").trim() || null,
    next_action_date: String(formData.get("next_action_date") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/leads");
  revalidatePath("/");
}

export async function updateLeadStage(formData: FormData) {
  const id = Number(formData.get("id"));
  const stage = String(formData.get("stage") ?? "") as LeadStage;
  if (!id || !stage) return;
  await leadRepo.updateStage(id, stage);
  revalidatePath("/leads");
  revalidatePath("/");
}

export async function deleteLead(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await leadRepo.delete(id);
  revalidatePath("/leads");
  revalidatePath("/");
}

export async function addLeadNote(formData: FormData) {
  const lead_id = Number(formData.get("lead_id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!lead_id || !body) return;
  await leadRepo.addNote(lead_id, body);
  revalidatePath("/leads");
}

export async function updateLeadNote(formData: FormData) {
  const id = Number(formData.get("id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!id || !body) return;
  await leadRepo.updateNote(id, body);
  revalidatePath("/leads");
}

export async function deleteLeadNote(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await leadRepo.deleteNote(id);
  revalidatePath("/leads");
}
