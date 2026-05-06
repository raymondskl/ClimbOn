"use client";

import { useState, useTransition } from "react";
import type { Project, ProjectStatus } from "@/lib/types";
import { updateProject } from "../actions";

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function EditProjectForm({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Edit details
        </button>
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          await updateProject(fd);
          setOpen(false);
        });
      }}
      className="card"
    >
      <input type="hidden" name="id" value={project.id} />
      <div className="card-body grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="md:col-span-3 -mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Editing project
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="text-[11px] text-slate-500 hover:underline"
          >
            Cancel
          </button>
        </div>
        <div className="md:col-span-2">
          <label className="label">Name</label>
          <input name="name" className="input" defaultValue={project.name} required />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" className="select" defaultValue={project.status}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Client</label>
          <input name="client" className="input" defaultValue={project.client ?? ""} />
        </div>
        <div>
          <label className="label">Budget</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="budget"
            className="input"
            defaultValue={project.budget}
          />
        </div>
        <div>
          <label className="label">Start date</label>
          <input
            type="date"
            name="start_date"
            className="input"
            defaultValue={project.start_date ?? ""}
          />
        </div>
        <div>
          <label className="label">Due date</label>
          <input
            type="date"
            name="due_date"
            className="input"
            defaultValue={project.due_date ?? ""}
          />
        </div>
        <div className="md:col-span-3">
          <label className="label">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="textarea"
            defaultValue={project.notes ?? ""}
          />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary !py-1 text-xs disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
