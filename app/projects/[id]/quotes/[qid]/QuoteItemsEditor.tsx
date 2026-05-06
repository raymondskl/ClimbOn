"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Quote, QuoteItem } from "@/lib/types";
import { calcItem, calcTotals } from "@/lib/quoteCalc";
import { currency } from "@/lib/format";
import { deleteQuoteItem, updateQuoteItem } from "../actions";

const UNITS = ["Day", "Hour", "Unit", "Project", "Week"];

function num(v: number) {
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function QuoteItemsEditor({
  quote,
  items: initial,
  projectId,
  lockedClassUnits,
}: {
  quote: Quote;
  items: QuoteItem[];
  projectId: number;
  lockedClassUnits?: Record<string, number>;
}) {
  const [items, setItems] = useState(initial);
  const idsKey = initial.map((i) => i.id).join(",");

  useEffect(() => {
    setItems(initial);
  }, [idsKey]);

  // Live shotlist override: any item whose class matches a discipline gets
  // its units replaced with the live shotlist total (read-only).
  const effectiveItems = useMemo(() => {
    if (!lockedClassUnits) return items;
    return items.map((it) => {
      const t = lockedClassUnits[it.class.toUpperCase()];
      return t === undefined ? it : { ...it, units: t };
    });
  }, [items, lockedClassUnits]);

  const totals = useMemo(() => calcTotals(quote, effectiveItems), [quote, effectiveItems]);

  const updateLocal = (id: number, patch: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5 print:grid-cols-5">
        <Stat label="Subtotal" value={currency(totals.subtotal)} />
        <Stat label="Discount" value={currency(totals.discount)} />
        <Stat label="Total" value={currency(totals.total)} highlight />
        <Stat
          label="Profit"
          value={currency(totals.profit)}
          tone={totals.profit >= 0 ? "good" : "bad"}
          sub={`${(totals.profit_margin * 100).toFixed(1)}% margin`}
        />
        <Stat
          label="Gross profit"
          value={currency(totals.gross_profit)}
          tone={totals.gross_profit >= 0 ? "good" : "bad"}
          sub={`${(totals.gross_margin * 100).toFixed(1)}% gross`}
        />
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Class</th>
                <th className="px-2 py-2 text-right">Units</th>
                <th className="px-2 py-2 text-left">Unit</th>
                <th className="px-2 py-2 text-right">Resource</th>
                <th className="px-2 py-2 text-right">Overhead</th>
                <th className="px-2 py-2 text-right">Room</th>
                <th className="px-2 py-2 text-right">Cost</th>
                <th className="px-2 py-2 text-right">Quoted rate</th>
                <th className="px-2 py-2 text-right">Subtotal</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const lockedUnits = lockedClassUnits?.[item.class.toUpperCase()];
                return (
                  <ItemRow
                    key={item.id}
                    item={item}
                    quoteId={quote.id}
                    projectId={projectId}
                    lockedUnits={lockedUnits}
                    onLocalChange={(patch) => updateLocal(item.id, patch)}
                  />
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 text-sm font-medium">
              <tr>
                <td colSpan={8} className="px-3 py-2 text-right">Subtotal</td>
                <td className="px-2 py-2 text-right">{currency(totals.subtotal)}</td>
                <td />
              </tr>
              <tr>
                <td colSpan={8} className="px-3 py-2 text-right text-slate-500">
                  Discount ({(quote.discount_rate * 100).toFixed(1)}% on lines after first)
                </td>
                <td className="px-2 py-2 text-right text-slate-500">−{currency(totals.discount)}</td>
                <td />
              </tr>
              <tr className="border-t border-slate-200 text-base">
                <td colSpan={8} className="px-3 py-2 text-right font-semibold">Total</td>
                <td className="px-2 py-2 text-right font-semibold">{currency(totals.total)}</td>
                <td />
              </tr>
              <tr className="text-xs text-slate-500">
                <td colSpan={8} className="px-3 py-2 text-right">Cost price</td>
                <td className="px-2 py-2 text-right">{currency(totals.cost_price_total)}</td>
                <td />
              </tr>
              <tr className="text-xs text-slate-500">
                <td colSpan={8} className="px-3 py-2 text-right">Cost of sales</td>
                <td className="px-2 py-2 text-right">{currency(totals.cost_of_sales_total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  quoteId,
  projectId,
  onLocalChange,
  lockedUnits,
}: {
  item: QuoteItem;
  quoteId: number;
  projectId: number;
  onLocalChange: (patch: Partial<QuoteItem>) => void;
  lockedUnits?: number;
}) {
  // When lockedUnits is provided (i.e., shotlist live-driven), the displayed
  // units come from the shotlist totals — not from local edit state.
  const displayItem: QuoteItem =
    lockedUnits === undefined ? item : { ...item, units: lockedUnits };
  const [local, setLocal] = useState(displayItem);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();
  const effectiveLocal: QuoteItem =
    lockedUnits === undefined ? local : { ...local, units: lockedUnits };
  const totals = calcItem(effectiveLocal);

  useEffect(() => {
    setLocal(displayItem);
  }, [item.id, item.sort_order]);

  const scheduleSave = (next: QuoteItem) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const fd = new FormData();
      fd.set("id", String(next.id));
      fd.set("quote_id", String(quoteId));
      fd.set("project_id", String(projectId));
      fd.set("class", next.class);
      fd.set("units", String(next.units));
      fd.set("unit", next.unit);
      fd.set("resource_rate", String(next.resource_rate));
      fd.set("overhead_rate", String(next.overhead_rate));
      fd.set("room_rate", String(next.room_rate));
      fd.set(
        "quoted_rate_override",
        next.quoted_rate_override == null ? "" : String(next.quoted_rate_override),
      );
      fd.set("notes", next.notes ?? "");
      startTransition(() => updateQuoteItem(fd));
    }, 600);
  };

  const update = <K extends keyof QuoteItem>(key: K, value: QuoteItem[K]) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onLocalChange({ [key]: value } as Partial<QuoteItem>);
    scheduleSave(next);
  };

  return (
    <tr className={`border-t border-slate-100 ${isPending ? "bg-amber-50/40" : ""}`}>
      <td className="px-3 py-1.5">
        <input
          value={local.class}
          onChange={(e) => update("class", e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-slate-800 focus:outline-none"
        />
      </td>
      <td className="px-2 py-1.5 text-right">
        {lockedUnits !== undefined ? (
          <span
            className="inline-flex items-center gap-1 text-sm tabular-nums text-brand-700"
            title="Live from shotlist"
          >
            <span className="text-[9px] uppercase tracking-wide text-brand-500">live</span>
            {lockedUnits}
          </span>
        ) : (
          <NumberCell value={local.units} onChange={(v) => update("units", v)} />
        )}
      </td>
      <td className="px-2 py-1.5">
        <select
          value={local.unit}
          onChange={(e) => update("unit", e.target.value)}
          className="bg-transparent text-xs text-slate-600 focus:outline-none"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5 text-right">
        <NumberCell value={local.resource_rate} onChange={(v) => update("resource_rate", v)} />
      </td>
      <td className="px-2 py-1.5 text-right">
        <NumberCell value={local.overhead_rate} onChange={(v) => update("overhead_rate", v)} />
      </td>
      <td className="px-2 py-1.5 text-right">
        <NumberCell value={local.room_rate} onChange={(v) => update("room_rate", v)} />
      </td>
      <td className="px-2 py-1.5 text-right text-xs text-slate-500">{currency(totals.cost_subtotal)}</td>
      <td className="px-2 py-1.5 text-right">
        <NumberCell
          value={local.quoted_rate_override ?? totals.quoted_rate}
          placeholder={String(totals.quoted_rate)}
          dim={local.quoted_rate_override == null}
          onChange={(v) => update("quoted_rate_override", v)}
          onClear={() => update("quoted_rate_override", null as unknown as number)}
        />
        {local.quoted_rate_override != null ? (
          <button
            type="button"
            onClick={() => update("quoted_rate_override", null as unknown as number)}
            className="block w-full text-right text-[10px] text-slate-400 hover:text-rose-600"
          >
            reset to auto ({num(totals.quoted_rate)})
          </button>
        ) : null}
      </td>
      <td className="px-2 py-1.5 text-right text-sm font-medium text-slate-800">
        {currency(totals.subtotal)}
      </td>
      <td className="px-1 py-1.5 text-right">
        <form action={deleteQuoteItem}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="quote_id" value={quoteId} />
          <input type="hidden" name="project_id" value={projectId} />
          <button
            type="submit"
            className="text-xs text-slate-300 hover:text-rose-600"
            title="Remove line"
          >
            ✕
          </button>
        </form>
      </td>
    </tr>
  );
}

function NumberCell({
  value,
  onChange,
  onClear,
  placeholder,
  dim,
}: {
  value: number;
  onChange: (v: number) => void;
  onClear?: () => void;
  placeholder?: string;
  dim?: boolean;
}) {
  const [text, setText] = useState(value === 0 && dim ? "" : String(value));

  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setText(value === 0 && dim ? "" : String(value));
  }, [value, dim]);

  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const s = e.target.value;
        setText(s);
        if (s === "") {
          if (onClear) onClear();
          return;
        }
        const n = Number(s);
        if (Number.isFinite(n)) onChange(n);
      }}
      className={`w-20 rounded bg-transparent px-1 py-0.5 text-right text-sm tabular-nums focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-300 ${dim ? "text-slate-400" : "text-slate-800"}`}
    />
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  tone?: "good" | "bad";
}) {
  const valueColor = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-slate-900";
  return (
    <div className={`card ${highlight ? "ring-2 ring-brand-300" : ""}`}>
      <div className="card-body">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`mt-1 text-xl font-semibold ${valueColor}`}>{value}</div>
        {sub ? <div className="text-[11px] text-slate-500">{sub}</div> : null}
      </div>
    </div>
  );
}
