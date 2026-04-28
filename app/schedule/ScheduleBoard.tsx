"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  createAssignmentFromDrag,
  deleteAssignmentAction,
  moveAssignmentAction,
} from "./actions";

type BoardProject = {
  id: number;
  name: string;
  client: string | null;
  status: string;
};

type BoardEmployee = {
  id: number;
  name: string;
  role: string | null;
  skills: string[];
};

type BoardAssignment = {
  id: number;
  project_id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
};

const DAY_W = 28;
const ROW_H = 44;
const LEFT_COL_W = 220;

const BAR_COLORS = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-fuchsia-500",
  "bg-orange-500",
];

function colorForEmployee(id: number) {
  return BAR_COLORS[id % BAR_COLORS.length];
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

type DragState =
  | {
      kind: "move" | "resize-left" | "resize-right";
      assignmentId: number;
      startX: number;
      origStart: string;
      origEnd: string;
    }
  | null;

export function ScheduleBoard({
  projects,
  employees,
  assignments: initialAssignments,
  windowStart,
  days,
}: {
  projects: BoardProject[];
  employees: BoardEmployee[];
  assignments: BoardAssignment[];
  windowStart: string;
  days: number;
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [drag, setDrag] = useState<DragState>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const boardRef = useRef<HTMLDivElement>(null);
  const originalRef = useRef<BoardAssignment | null>(null);

  useEffect(() => {
    setAssignments(initialAssignments);
  }, [initialAssignments]);

  const totalWidth = days * DAY_W;
  const todayOffset = daysBetween(windowStart, new Date().toISOString().slice(0, 10));

  const datesHeader = useMemo(() => {
    const out: { date: string; isMonday: boolean; isToday: boolean; offset: number }[] = [];
    const todayIso = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < days; i++) {
      const date = addDays(windowStart, i);
      const dow = new Date(date + "T00:00:00").getDay();
      out.push({ date, isMonday: dow === 1, isToday: date === todayIso, offset: i });
    }
    return out;
  }, [windowStart, days]);

  const commitMove = useCallback(
    (id: number, start: string, end: string) => {
      startTransition(async () => {
        const result = await moveAssignmentAction({ id, start_date: start, end_date: end });
        if (!result.ok) {
          setError(result.error);
          if (originalRef.current) {
            const orig = originalRef.current;
            setAssignments((prev) =>
              prev.map((a) => (a.id === id ? { ...a, start_date: orig.start_date, end_date: orig.end_date } : a)),
            );
          }
        } else {
          setError(null);
        }
        originalRef.current = null;
      });
    },
    [],
  );

  const onPointerDownBar = (
    e: React.PointerEvent,
    assignment: BoardAssignment,
    mode: "move" | "resize-left" | "resize-right",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    originalRef.current = { ...assignment };
    setDrag({
      kind: mode,
      assignmentId: assignment.id,
      startX: e.clientX,
      origStart: assignment.start_date,
      origEnd: assignment.end_date,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const deltaDays = Math.round(dx / DAY_W);
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== drag.assignmentId) return a;
        if (drag.kind === "move") {
          return {
            ...a,
            start_date: addDays(drag.origStart, deltaDays),
            end_date: addDays(drag.origEnd, deltaDays),
          };
        }
        if (drag.kind === "resize-left") {
          const next = addDays(drag.origStart, deltaDays);
          if (daysBetween(next, a.end_date) < 0) return a;
          return { ...a, start_date: next };
        }
        const next = addDays(drag.origEnd, deltaDays);
        if (daysBetween(a.start_date, next) < 0) return a;
        return { ...a, end_date: next };
      }),
    );
  };

  const onPointerUp = () => {
    if (!drag) return;
    const final = assignments.find((a) => a.id === drag.assignmentId);
    if (final && (final.start_date !== drag.origStart || final.end_date !== drag.origEnd)) {
      commitMove(drag.assignmentId, final.start_date, final.end_date);
    } else {
      originalRef.current = null;
    }
    setDrag(null);
  };

  const onChipDragStart = (e: React.DragEvent, employeeId: number) => {
    e.dataTransfer.setData("application/x-employee-id", String(employeeId));
    e.dataTransfer.effectAllowed = "copy";
  };

  const onRowDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/x-employee-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const onRowDrop = (e: React.DragEvent, projectId: number) => {
    e.preventDefault();
    const empIdStr = e.dataTransfer.getData("application/x-employee-id");
    const empId = Number(empIdStr);
    if (!empId) return;
    const rowEl = e.currentTarget as HTMLElement;
    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const offset = Math.max(0, Math.floor(x / DAY_W));
    const project = projects.find((p) => p.id === projectId);
    let start = addDays(windowStart, offset);
    let end = addDays(start, 4);
    if (project && project.id) {
      // no-op; defaults are fine
    }
    startTransition(async () => {
      const result = await createAssignmentFromDrag({
        project_id: projectId,
        employee_id: empId,
        start_date: start,
        end_date: end,
      });
      if (!result.ok) setError(result.error);
      else setError(null);
    });
  };

  const onDeleteAssignment = (id: number) => {
    startTransition(async () => {
      const result = await deleteAssignmentAction(id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Available employees</h2>
            <span className="text-xs text-slate-500">Drag onto a project row to schedule</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {employees.map((e) => (
              <div
                key={e.id}
                draggable
                onDragStart={(ev) => onChipDragStart(ev, e.id)}
                className={`group flex cursor-grab items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm hover:border-brand-300 hover:bg-brand-50 active:cursor-grabbing`}
                title={e.skills.length ? `Skills: ${e.skills.join(", ")}` : "No skills tagged"}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${colorForEmployee(e.id)}`} />
                <span className="font-medium text-slate-700">{e.name}</span>
                {e.role ? <span className="text-slate-400">· {e.role}</span> : null}
                {e.skills.length > 0 ? (
                  <span className="text-slate-400">· {e.skills.slice(0, 2).join(", ")}{e.skills.length > 2 ? "+" : ""}</span>
                ) : null}
              </div>
            ))}
            {employees.length === 0 ? (
              <p className="text-sm text-slate-500">No active employees.</p>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="card">
        <div className="card-body">
          <div
            ref={boardRef}
            className="relative overflow-auto"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div style={{ width: LEFT_COL_W + totalWidth, minWidth: "100%" }}>
              <div
                className="sticky top-0 z-20 flex border-b border-slate-200 bg-white"
                style={{ height: 36 }}
              >
                <div
                  className="sticky left-0 z-30 shrink-0 border-r border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  style={{ width: LEFT_COL_W }}
                >
                  Project
                </div>
                <div className="relative" style={{ width: totalWidth }}>
                  {datesHeader.map((d) => (
                    <div
                      key={d.date}
                      className={`absolute top-0 flex flex-col items-center justify-center text-[10px] ${d.isMonday ? "font-semibold text-slate-700" : "text-slate-400"} ${d.isToday ? "text-brand-600" : ""}`}
                      style={{ left: d.offset * DAY_W, width: DAY_W, height: 36 }}
                    >
                      <div>{new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                    </div>
                  ))}
                </div>
              </div>

              {projects.map((p) => {
                const rows = assignments.filter((a) => a.project_id === p.id);
                return (
                  <div
                    key={p.id}
                    className="flex border-b border-slate-100"
                    style={{ height: ROW_H }}
                  >
                    <div
                      className="sticky left-0 z-10 shrink-0 border-r border-slate-200 bg-white px-3 py-2"
                      style={{ width: LEFT_COL_W }}
                    >
                      <div className="truncate text-sm font-medium text-slate-800">{p.name}</div>
                      <div className="truncate text-[11px] text-slate-500">
                        {p.client ?? "—"} · {p.status.replace("_", " ")}
                      </div>
                    </div>
                    <div
                      className="relative bg-[linear-gradient(to_right,transparent_0,transparent_calc(100%_-_1px),#e2e8f0_calc(100%_-_1px))]"
                      style={{
                        width: totalWidth,
                        backgroundSize: `${DAY_W * 7}px 100%`,
                      }}
                      onDragOver={onRowDragOver}
                      onDrop={(e) => onRowDrop(e, p.id)}
                    >
                      {todayOffset >= 0 && todayOffset < days ? (
                        <div
                          className="pointer-events-none absolute top-0 bottom-0 w-px bg-brand-400"
                          style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
                        />
                      ) : null}
                      {rows.map((a) => {
                        const left = daysBetween(windowStart, a.start_date) * DAY_W;
                        const width = (daysBetween(a.start_date, a.end_date) + 1) * DAY_W;
                        const emp = employees.find((e) => e.id === a.employee_id);
                        const clipped = left + width <= 0 || left >= totalWidth;
                        if (clipped) return null;
                        return (
                          <div
                            key={a.id}
                            className={`group absolute top-1.5 flex items-center rounded-md text-xs text-white shadow-sm ${colorForEmployee(a.employee_id)} ${drag?.assignmentId === a.id ? "ring-2 ring-offset-1 ring-brand-500" : ""}`}
                            style={{ left, width, height: ROW_H - 12 }}
                            onPointerDown={(e) => onPointerDownBar(e, a, "move")}
                          >
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-l-md bg-black/20 opacity-0 group-hover:opacity-100"
                              onPointerDown={(e) => onPointerDownBar(e, a, "resize-left")}
                            />
                            <span className="flex-1 cursor-grab select-none truncate px-2 font-medium active:cursor-grabbing">
                              {emp?.name ?? "Employee"}
                            </span>
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => onDeleteAssignment(a.id)}
                              className="mr-1 rounded px-1 text-[10px] opacity-0 hover:bg-black/20 group-hover:opacity-100"
                              title="Remove"
                            >
                              ✕
                            </button>
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-r-md bg-black/20 opacity-0 group-hover:opacity-100"
                              onPointerDown={(e) => onPointerDownBar(e, a, "resize-right")}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {projects.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">No projects yet.</div>
              ) : null}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Drag a bar to move · Drag its edges to resize · Drag an employee chip onto a project row to schedule
            {isPending ? " · saving…" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
