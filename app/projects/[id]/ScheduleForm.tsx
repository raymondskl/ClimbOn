"use client";

import { useFormState } from "react-dom";
import { scheduleEmployee, type ScheduleResult } from "../actions";
import type { Employee } from "@/lib/types";
import { dateShort } from "@/lib/format";

export function ScheduleForm({
  projectId,
  employees,
  defaultStart,
  defaultEnd,
}: {
  projectId: number;
  employees: Employee[];
  defaultStart: string;
  defaultEnd: string;
}) {
  const [state, formAction] = useFormState<ScheduleResult | null, FormData>(
    scheduleEmployee,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="project_id" value={projectId} />
      <div>
        <label className="label">Employee</label>
        <select name="employee_id" className="select" required defaultValue="">
          <option value="" disabled>
            Select an employee…
          </option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
              {e.role ? ` — ${e.role}` : ""}
            </option>
          ))}
        </select>
        {employees.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            No active employees on file. Add one from the Employees page first.
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start</label>
          <input
            type="date"
            name="start_date"
            className="input"
            required
            defaultValue={defaultStart}
          />
        </div>
        <div>
          <label className="label">End</label>
          <input
            type="date"
            name="end_date"
            className="input"
            required
            defaultValue={defaultEnd}
          />
        </div>
      </div>
      <div>
        <label className="label">Role on project</label>
        <input name="role" className="input" placeholder="e.g. Lead framer" />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" rows={2} className="textarea" />
      </div>

      {state && !state.ok ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <div className="font-medium">{state.error}</div>
          {state.conflicts && state.conflicts.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {state.conflicts.map((c, i) => (
                <li key={i}>
                  Booked on <span className="font-medium">{c.project_name}</span>{" "}
                  ({dateShort(c.start_date)} – {dateShort(c.end_date)})
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {state && state.ok ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
          Scheduled.
        </div>
      ) : null}

      <button type="submit" className="btn-primary w-full">
        Schedule employee
      </button>
    </form>
  );
}
