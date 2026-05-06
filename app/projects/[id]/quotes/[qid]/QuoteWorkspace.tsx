"use client";

import { useCallback, useMemo, useState } from "react";
import { SHOT_DISCIPLINES } from "@/lib/types";
import type { Quote, QuoteItem, QuoteShot, ShotDiscipline } from "@/lib/types";
import { ShotlistEditor } from "./ShotlistEditor";
import { QuoteItemsEditor } from "./QuoteItemsEditor";

const ZERO_TOTALS: Record<ShotDiscipline, number> = Object.fromEntries(
  SHOT_DISCIPLINES.map((d) => [d.key, 0]),
) as Record<ShotDiscipline, number>;

export function QuoteWorkspace({
  quote,
  items,
  shots,
  projectId,
}: {
  quote: Quote;
  items: QuoteItem[];
  shots: QuoteShot[];
  projectId: number;
}) {
  const [totals, setTotals] = useState<Record<ShotDiscipline, number>>(ZERO_TOTALS);

  const handleTotalsChange = useCallback(
    (next: Record<ShotDiscipline, number>) => setTotals(next),
    [],
  );

  // Map quote-line CLASS (uppercase) → live discipline total.
  const lockedClassUnits = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of SHOT_DISCIPLINES) {
      m[d.lineClass.toUpperCase()] = totals[d.key] ?? 0;
    }
    return m;
  }, [totals]);

  return (
    <>
      <ShotlistEditor
        shots={shots}
        quoteId={quote.id}
        projectId={projectId}
        onTotalsChange={handleTotalsChange}
      />
      <QuoteItemsEditor
        quote={quote}
        items={items}
        projectId={projectId}
        lockedClassUnits={lockedClassUnits}
      />
    </>
  );
}
