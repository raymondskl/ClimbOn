"use server";

import { revalidatePath } from "next/cache";
import { datasetRepo } from "@/lib/repo";
import { parseCsv } from "@/lib/forecast";

function coerceDate(s: string): string | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function coerceNumber(s: string): number | null {
  const cleaned = s.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export async function createDatasetFromCsv(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dateCol = String(formData.get("date_column") ?? "").trim();
  const valueCol = String(formData.get("value_column") ?? "").trim();
  const csvRaw = String(formData.get("csv") ?? "");

  if (!name || !csvRaw || !dateCol || !valueCol) return;

  const { headers, rows } = parseCsv(csvRaw);
  const dateIdx = headers.findIndex((h) => h.toLowerCase() === dateCol.toLowerCase());
  const valIdx = headers.findIndex((h) => h.toLowerCase() === valueCol.toLowerCase());
  if (dateIdx === -1 || valIdx === -1) return;

  const parsed = rows
    .map((r) => {
      const point_date = coerceDate(r[dateIdx] ?? "");
      const value = coerceNumber(r[valIdx] ?? "");
      if (!point_date || value === null) return null;
      const meta = headers.reduce<Record<string, string>>((acc, h, i) => {
        if (i !== dateIdx && i !== valIdx) acc[h] = r[i] ?? "";
        return acc;
      }, {});
      return { point_date, value, meta: JSON.stringify(meta) };
    })
    .filter((x): x is { point_date: string; value: number; meta: string } => x !== null);

  if (parsed.length === 0) return;

  const result = datasetRepo.create({
    name,
    description,
    date_column: dateCol,
    value_column: valueCol,
  });
  datasetRepo.insertRows(Number(result.lastInsertRowid), parsed);
  revalidatePath("/analytics");
}

export async function deleteDataset(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  datasetRepo.delete(id);
  revalidatePath("/analytics");
}
