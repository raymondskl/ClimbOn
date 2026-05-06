"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { quoteRepo } from "@/lib/repo";
import { SHOT_DISCIPLINES } from "@/lib/types";
import type { QuoteShot, QuoteStatus, ShotDiscipline } from "@/lib/types";

export async function startQuote(formData: FormData) {
  const project_id = Number(formData.get("project_id"));
  if (!project_id) return;
  const id = await quoteRepo.create({
    project_id,
    client_product: String(formData.get("client_product") ?? "").trim() || null,
  });
  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}/quotes/${id}`);
}

export async function updateQuoteHeader(formData: FormData) {
  const id = Number(formData.get("id"));
  const project_id = Number(formData.get("project_id"));
  if (!id) return;
  const num = (k: string, fallback = 0) => {
    const v = formData.get(k);
    if (v === null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  await quoteRepo.updateHeader(id, {
    version: num("version", 1),
    quote_date: str("quote_date"),
    client_product: str("client_product"),
    primary_contact: str("primary_contact"),
    producer: str("producer"),
    producer_title: str("producer_title"),
    director: str("director"),
    agency: str("agency"),
    agency_contact: str("agency_contact"),
    production_company: str("production_company"),
    prod_company_producer: str("prod_company_producer"),
    tda_location: str("tda_location"),
    discount_rate: num("discount_rate"),
    overhead_rate: num("overhead_rate", 936),
    cover_letter_intro: str("cover_letter_intro"),
    cover_letter_exclusions: str("cover_letter_exclusions"),
    licence_territory: str("licence_territory"),
    licence_term: str("licence_term"),
    licence_use: str("licence_use"),
  });
  revalidatePath(`/projects/${project_id}/quotes/${id}`);
}

export async function updateQuoteStatus(formData: FormData) {
  const id = Number(formData.get("id"));
  const project_id = Number(formData.get("project_id"));
  const status = String(formData.get("status") ?? "draft") as QuoteStatus;
  if (!id) return;
  await quoteRepo.setStatus(id, status);
  revalidatePath(`/projects/${project_id}/quotes/${id}`);
  revalidatePath(`/projects/${project_id}`);
}

export async function updateQuoteItem(formData: FormData) {
  const id = Number(formData.get("id"));
  const quote_id = Number(formData.get("quote_id"));
  const project_id = Number(formData.get("project_id"));
  if (!id) return;
  const num = (k: string, fallback = 0) => {
    const v = formData.get(k);
    if (v === null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const overrideRaw = String(formData.get("quoted_rate_override") ?? "");
  await quoteRepo.updateItem(id, {
    class: String(formData.get("class") ?? "").trim() || "—",
    units: num("units"),
    unit: String(formData.get("unit") ?? "Day"),
    resource_rate: num("resource_rate"),
    overhead_rate: num("overhead_rate"),
    room_rate: num("room_rate"),
    quoted_rate_override: overrideRaw === "" ? null : Number(overrideRaw),
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath(`/projects/${project_id}/quotes/${quote_id}`);
}

export async function addQuoteItem(formData: FormData) {
  const quote_id = Number(formData.get("quote_id"));
  const project_id = Number(formData.get("project_id"));
  const cls = String(formData.get("class") ?? "").trim() || "NEW LINE";
  const unit = String(formData.get("unit") ?? "Day");
  if (!quote_id) return;
  await quoteRepo.addItem(quote_id, { class: cls, unit });
  revalidatePath(`/projects/${project_id}/quotes/${quote_id}`);
}

export async function deleteQuoteItem(formData: FormData) {
  const id = Number(formData.get("id"));
  const quote_id = Number(formData.get("quote_id"));
  const project_id = Number(formData.get("project_id"));
  if (!id) return;
  await quoteRepo.deleteItem(id);
  revalidatePath(`/projects/${project_id}/quotes/${quote_id}`);
}

export async function deleteQuote(formData: FormData) {
  const id = Number(formData.get("id"));
  const project_id = Number(formData.get("project_id"));
  if (!id) return;
  await quoteRepo.delete(id);
  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}`);
}

const DISCIPLINE_KEYS = SHOT_DISCIPLINES.map((d) => d.key);

async function syncAllTotals(quote_id: number) {
  for (const d of SHOT_DISCIPLINES) {
    await quoteRepo.applyShotTotalToItem(quote_id, d.key, d.lineClass);
  }
}

export async function addShot(formData: FormData) {
  const quote_id = Number(formData.get("quote_id"));
  const project_id = Number(formData.get("project_id"));
  if (!quote_id) return;
  const code = String(formData.get("shot_code") ?? "").trim() || null;
  await quoteRepo.addShot(quote_id, { shot_code: code });
  await syncAllTotals(quote_id);
  revalidatePath(`/projects/${project_id}/quotes/${quote_id}`);
}

export async function updateShot(formData: FormData) {
  const id = Number(formData.get("id"));
  const quote_id = Number(formData.get("quote_id"));
  const project_id = Number(formData.get("project_id"));
  if (!id) return;
  const num = (k: string) => {
    const v = formData.get(k);
    if (v === null || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  const patch: Partial<Omit<QuoteShot, "id" | "quote_id">> = {
    shot_code: str("shot_code"),
    board_ref: str("board_ref"),
    production_notes: str("production_notes"),
    vfx_notes: str("vfx_notes"),
  };
  for (const key of DISCIPLINE_KEYS) {
    (patch as Record<string, number>)[key] = num(key);
  }
  await quoteRepo.updateShot(id, patch);
  await syncAllTotals(quote_id);
  revalidatePath(`/projects/${project_id}/quotes/${quote_id}`);
}

export async function deleteShot(formData: FormData) {
  const id = Number(formData.get("id"));
  const quote_id = Number(formData.get("quote_id"));
  const project_id = Number(formData.get("project_id"));
  if (!id) return;
  await quoteRepo.deleteShot(id);
  await syncAllTotals(quote_id);
  revalidatePath(`/projects/${project_id}/quotes/${quote_id}`);
}

export async function applyShotTotalToLine(formData: FormData) {
  const quote_id = Number(formData.get("quote_id"));
  const project_id = Number(formData.get("project_id"));
  const discipline = String(formData.get("discipline") ?? "") as ShotDiscipline;
  const def = SHOT_DISCIPLINES.find((d) => d.key === discipline);
  if (!quote_id || !def) return;
  await quoteRepo.applyShotTotalToItem(quote_id, def.key, def.lineClass);
  revalidatePath(`/projects/${project_id}/quotes/${quote_id}`);
}

export async function applyAllShotTotals(formData: FormData) {
  const quote_id = Number(formData.get("quote_id"));
  const project_id = Number(formData.get("project_id"));
  if (!quote_id) return;
  for (const d of SHOT_DISCIPLINES) {
    await quoteRepo.applyShotTotalToItem(quote_id, d.key, d.lineClass);
  }
  revalidatePath(`/projects/${project_id}/quotes/${quote_id}`);
}
