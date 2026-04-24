export interface Point {
  x: string;
  y: number;
}

export function movingAverage(points: Point[], window: number): Point[] {
  if (window <= 1) return points;
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = points.slice(start, i + 1);
    const avg = slice.reduce((s, p) => s + p.y, 0) / slice.length;
    out.push({ x: points[i].x, y: avg });
  }
  return out;
}

export interface Regression {
  slope: number;
  intercept: number;
  r2: number;
}

export function linearRegression(ys: number[]): Regression {
  const n = ys.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  const xs = ys.map((_, i) => i);
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * xs[i];
    ssRes += (ys[i] - pred) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

export function projectForward(
  points: Point[],
  periods: number,
  labelFor: (i: number, last: string) => string,
): Point[] {
  if (points.length < 2) return [];
  const reg = linearRegression(points.map((p) => p.y));
  const last = points[points.length - 1].x;
  const out: Point[] = [];
  for (let i = 1; i <= periods; i++) {
    const x = points.length - 1 + i;
    const y = reg.intercept + reg.slope * x;
    out.push({ x: labelFor(i, last), y });
  }
  return out;
}

export function nextMonthLabel(i: number, lastMonth: string): string {
  const [yStr, mStr] = lastMonth.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const d = new Date(Date.UTC(year, month - 1 + i, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function growthRate(series: number[]): number {
  if (series.length < 2) return 0;
  const first = series[0];
  const last = series[series.length - 1];
  if (first === 0) return 0;
  return (last - first) / Math.abs(first);
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let i = 0;
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return { headers, rows: rows.filter((r) => r.some((c) => c.trim() !== "")) };
}
