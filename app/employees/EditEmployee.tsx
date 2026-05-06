"use client";

import { useState, useTransition } from "react";
import type { EmployeeWithSkills } from "@/lib/types";
import { updateEmployee } from "./actions";

export function EditEmployeeForm({ employee }: { employee: EmployeeWithSkills }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <div className="px-3 py-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-brand-600 hover:underline"
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
          await updateEmployee(fd);
          setOpen(false);
        });
      }}
      className="grid grid-cols-1 gap-3 rounded-md bg-slate-50 p-3 md:grid-cols-3"
    >
      <input type="hidden" name="id" value={employee.id} />
      <div className="md:col-span-3 -mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Editing {employee.name}
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
      <div className="md:col-span-1">
        <label className="label">Name</label>
        <input name="name" className="input" defaultValue={employee.name} required />
      </div>
      <div className="md:col-span-1">
        <label className="label">Role</label>
        <input name="role" className="input" defaultValue={employee.role ?? ""} />
      </div>
      <div className="md:col-span-1">
        <label className="label">Type</label>
        <select
          name="employment_type"
          className="select"
          defaultValue={employee.employment_type}
        >
          <option value="full_time">Full-time</option>
          <option value="part_time">Part-time</option>
          <option value="contractor">Contractor</option>
        </select>
      </div>
      <div>
        <label className="label">Email</label>
        <input
          type="email"
          name="email"
          className="input"
          defaultValue={employee.email ?? ""}
        />
      </div>
      <div>
        <label className="label">Phone</label>
        <input name="phone" className="input" defaultValue={employee.phone ?? ""} />
      </div>
      <div>
        <label className="label">Annual salary</label>
        <input
          type="number"
          step="0.01"
          min="0"
          name="salary"
          className="input"
          defaultValue={employee.salary}
        />
      </div>
      <div>
        <label className="label">Start date</label>
        <input
          type="date"
          name="start_date"
          className="input"
          defaultValue={employee.start_date ?? ""}
        />
      </div>
      <div className="md:col-span-2">
        <label className="label">Notes</label>
        <textarea
          name="notes"
          rows={2}
          className="textarea"
          defaultValue={employee.notes ?? ""}
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
    </form>
  );
}
