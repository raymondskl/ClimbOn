export function currency(n: number | null | undefined): string {
  const v = typeof n === "number" ? n : 0;
  return v.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function currencyPrecise(n: number | null | undefined): string {
  const v = typeof n === "number" ? n : 0;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
