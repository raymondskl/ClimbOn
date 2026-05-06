"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 print:hidden"
    >
      Print / PDF
    </button>
  );
}
