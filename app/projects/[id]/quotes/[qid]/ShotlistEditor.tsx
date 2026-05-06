"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { SHOT_DISCIPLINES } from "@/lib/types";
import type { QuoteShot, ShotDiscipline } from "@/lib/types";
import { addShot, deleteShot, updateShot } from "../actions";

const DISCIPLINE_KEYS = SHOT_DISCIPLINES.map((d) => d.key);

export function ShotlistEditor({
  shots: initial,
  quoteId,
  projectId,
  onTotalsChange,
}: {
  shots: QuoteShot[];
  quoteId: number;
  projectId: number;
  onTotalsChange?: (totals: Record<ShotDiscipline, number>) => void;
}) {
  const [shots, setShots] = useState(initial);
  const idsKey = initial.map((s) => s.id).join(",");
  useEffect(() => {
    setShots(initial);
  }, [idsKey]);

  const totals = useMemo(() => {
    const acc: Record<ShotDiscipline, number> = Object.fromEntries(
      DISCIPLINE_KEYS.map((k) => [k, 0]),
    ) as Record<ShotDiscipline, number>;
    for (const s of shots) {
      for (const k of DISCIPLINE_KEYS) {
        acc[k] += Number(s[k]) || 0;
      }
    }
    return acc;
  }, [shots]);

  useEffect(() => {
    onTotalsChange?.(totals);
  }, [totals, onTotalsChange]);

  const updateLocal = (id: number, patch: Partial<QuoteShot>) => {
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  return (
    <div className="card mt-4">
      <div className="card-body">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Shotlist</h2>
            <p className="text-xs text-slate-500">
              Break down the work shot-by-shot. Days per discipline auto-total at the bottom and can be pushed into matching quote lines.
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <form action={addShot}>
              <input type="hidden" name="quote_id" value={quoteId} />
              <input type="hidden" name="project_id" value={projectId} />
              <button type="submit" className="btn-primary !py-1 text-xs">
                + Add shot
              </button>
            </form>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-left">Shot</th>
                <th className="px-2 py-2 text-left">Production notes</th>
                <th className="px-2 py-2 text-left">VFX notes</th>
                {SHOT_DISCIPLINES.map((d) => (
                  <th
                    key={d.key}
                    className="whitespace-nowrap px-1 py-2 text-right"
                    title={d.lineClass}
                  >
                    {d.label}
                  </th>
                ))}
                <th className="px-2 py-2 text-right">Σ</th>
                <th className="w-6 print:hidden" />
              </tr>
            </thead>
            <tbody>
              {shots.map((shot) => (
                <ShotRow
                  key={shot.id}
                  shot={shot}
                  quoteId={quoteId}
                  projectId={projectId}
                  onLocal={(patch) => updateLocal(shot.id, patch)}
                />
              ))}
              {shots.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + SHOT_DISCIPLINES.length}
                    className="px-3 py-6 text-center text-xs text-slate-500"
                  >
                    No shots yet — click “Add shot” to start the breakdown.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot className="bg-slate-50 text-[11px] font-medium text-slate-700">
              <tr>
                <td className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-right" colSpan={3}>
                  Totals (days)
                </td>
                {SHOT_DISCIPLINES.map((d) => (
                  <td key={d.key} className="px-1 py-2 text-right tabular-nums">
                    {totals[d.key] || ""}
                  </td>
                ))}
                <td className="px-2 py-2 text-right tabular-nums">
                  {Object.values(totals).reduce((s, v) => s + v, 0) || ""}
                </td>
                <td className="print:hidden" />
              </tr>
              <tr className="text-[10px] text-slate-500 print:hidden">
                <td className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-right" colSpan={3}>
                  Live → quote
                </td>
                {SHOT_DISCIPLINES.map((d) => (
                  <td key={d.key} className="px-1 py-1 text-right text-brand-600">
                    {totals[d.key] ? "↓" : ""}
                  </td>
                ))}
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function ShotRow({
  shot,
  quoteId,
  projectId,
  onLocal,
}: {
  shot: QuoteShot;
  quoteId: number;
  projectId: number;
  onLocal: (patch: Partial<QuoteShot>) => void;
}) {
  const [local, setLocal] = useState(shot);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocal(shot);
  }, [shot.id, shot.sort_order]);

  const scheduleSave = (next: QuoteShot) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const fd = new FormData();
      fd.set("id", String(next.id));
      fd.set("quote_id", String(quoteId));
      fd.set("project_id", String(projectId));
      fd.set("shot_code", next.shot_code ?? "");
      fd.set("board_ref", next.board_ref ?? "");
      fd.set("production_notes", next.production_notes ?? "");
      fd.set("vfx_notes", next.vfx_notes ?? "");
      for (const k of DISCIPLINE_KEYS) {
        fd.set(k, String(next[k] ?? 0));
      }
      startTransition(() => updateShot(fd));
    }, 600);
  };

  const update = <K extends keyof QuoteShot>(key: K, value: QuoteShot[K]) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onLocal({ [key]: value } as Partial<QuoteShot>);
    scheduleSave(next);
  };

  const rowSum = DISCIPLINE_KEYS.reduce((s, k) => s + (Number(local[k]) || 0), 0);

  return (
    <tr className={`border-t border-slate-100 ${isPending ? "bg-amber-50/40" : ""}`}>
      <td className="sticky left-0 z-10 bg-white px-2 py-1">
        <input
          value={local.shot_code ?? ""}
          onChange={(e) => update("shot_code", e.target.value)}
          placeholder="SH001"
          className="w-16 bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
        />
      </td>
      <td className="px-2 py-1">
        <input
          value={local.production_notes ?? ""}
          onChange={(e) => update("production_notes", e.target.value)}
          placeholder="—"
          className="w-44 bg-transparent text-xs text-slate-700 focus:outline-none"
        />
      </td>
      <td className="px-2 py-1">
        <input
          value={local.vfx_notes ?? ""}
          onChange={(e) => update("vfx_notes", e.target.value)}
          placeholder="—"
          className="w-44 bg-transparent text-xs text-slate-700 focus:outline-none"
        />
      </td>
      {SHOT_DISCIPLINES.map((d) => (
        <td key={d.key} className="px-0.5 py-1 text-right">
          <DayCell
            value={Number(local[d.key]) || 0}
            onChange={(v) => update(d.key, v as QuoteShot[typeof d.key])}
          />
        </td>
      ))}
      <td className="px-2 py-1 text-right text-xs font-medium tabular-nums text-slate-800">
        {rowSum || ""}
      </td>
      <td className="px-1 py-1 text-right print:hidden">
        <form action={deleteShot}>
          <input type="hidden" name="id" value={shot.id} />
          <input type="hidden" name="quote_id" value={quoteId} />
          <input type="hidden" name="project_id" value={projectId} />
          <button
            type="submit"
            className="text-[10px] text-slate-300 hover:text-rose-600"
            title="Delete shot"
          >
            ✕
          </button>
        </form>
      </td>
    </tr>
  );
}

function DayCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(value === 0 ? "" : String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setText(value === 0 ? "" : String(value));
  }, [value]);
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={text}
      placeholder="0"
      onChange={(e) => {
        const s = e.target.value;
        setText(s);
        if (s === "") {
          onChange(0);
          return;
        }
        const n = Number(s);
        if (Number.isFinite(n)) onChange(n);
      }}
      className="w-9 rounded bg-transparent px-0.5 text-right text-xs tabular-nums text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-300"
    />
  );
}
