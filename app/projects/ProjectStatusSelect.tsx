"use client";

import { useTransition } from "react";
import type { ProjectStatus } from "@/lib/types";
import { updateProjectStatus } from "./actions";

const STATUSES: { value: ProjectStatus; label: string; tone: string }[] = [
  { value: "planned", label: "Planned", tone: "bg-slate-100 text-slate-700" },
  { value: "active", label: "Active", tone: "bg-emerald-50 text-emerald-700" },
  { value: "on_hold", label: "On hold", tone: "bg-amber-50 text-amber-700" },
  { value: "completed", label: "Completed", tone: "bg-sky-50 text-sky-700" },
  { value: "cancelled", label: "Cancelled", tone: "bg-rose-50 text-rose-700" },
];

function toneFor(status: ProjectStatus) {
  return STATUSES.find((s) => s.value === status)?.tone ?? "bg-slate-100 text-slate-700";
}

export function ProjectStatusSelect({
  projectId,
  status,
  size = "sm",
}: {
  projectId: number;
  status: ProjectStatus;
  size?: "sm" | "lg";
}) {
  const [isPending, startTransition] = useTransition();

  const sizeClasses =
    size === "lg"
      ? "py-1.5 px-2 text-sm font-medium"
      : "!py-1 text-xs";

  return (
    <span className="inline-flex items-center gap-1">
      <select
        defaultValue={status}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value as ProjectStatus;
          if (next === status) return;
          const fd = new FormData();
          fd.set("id", String(projectId));
          fd.set("status", next);
          startTransition(() => updateProjectStatus(fd));
        }}
        className={`select ${sizeClasses} ${toneFor(status)} disabled:opacity-50`}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {isPending ? (
        <span className="text-[10px] text-slate-400">saving…</span>
      ) : null}
    </span>
  );
}
