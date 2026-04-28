"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createAssignmentFromDrag,
  deleteAssignmentAction,
  moveAssignmentAction,
} from "@/app/schedule/actions";

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
  project_name: string;
};

const DAY_W = 28;
const ROW_H = 44;
const LEFT_COL_W = 220;

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
  | {
      kind: "draw";
      employeeId: number;
      anchorOffset: number;
      currentOffset: number;
    }
  | null;

export function ProjectScheduleBoard({
  projectId,
  projectName,
  employees,
  assignments: initialAssignments,
  windowStart,
  days,
}: {
  projectId: number;
  projectName: string;
  employees: BoardEmployee[];
  assignments: BoardAssignment[];
  windowStart: string;
  days: number;
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [drag, setDrag] = useState<DragState>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const originalRef = useRef<BoardAssignment | null>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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

  const onPointerDownBar = (
    e: React.PointerEvent,
    assignment: BoardAssignment,
    mode: "move" | "resize-left" | "resize-right",
  ) => {
    if (assignment.project_id !== projectId) return;
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

  const onRowPointerDown = (e: React.PointerEvent, employeeId: number) => {
    if (e.button !== 0) return;
    const rowEl = rowRefs.current.get(employeeId);
    if (!rowEl) return;
    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const offset = Math.max(0, Math.min(days - 1, Math.floor(x / DAY_W)));
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      kind: "draw",
      employeeId,
      anchorOffset: offset,
      currentOffset: offset,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    if (drag.kind === "draw") {
      const rowEl = rowRefs.current.get(drag.employeeId);
      if (!rowEl) return;
      const rect = rowEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const offset = Math.max(0, Math.min(days - 1, Math.floor(x / DAY_W)));
      setDrag({ ...drag, currentOffset: offset });
      return;
    }
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
    if (drag.kind === "draw") {
      const startOffset = Math.min(drag.anchorOffset, drag.currentOffset);
      const endOffset = Math.max(drag.anchorOffset, drag.currentOffset);
      const start = addDays(windowStart, startOffset);
      const end = addDays(windowStart, endOffset);
      const employeeId = drag.employeeId;
      setDrag(null);
      startTransition(async () => {
        const result = await createAssignmentFromDrag({
          project_id: projectId,
          employee_id: employeeId,
          start_date: start,
          end_date: end,
        });
        if (!result.ok) setError(result.error);
        else setError(null);
      });
      return;
    }
    const final = assignments.find((a) => a.id === drag.assignmentId);
    const dragRef = drag;
    setDrag(null);
    if (!final) return;
    if (final.start_date === dragRef.origStart && final.end_date === dragRef.origEnd) {
      originalRef.current = null;
      return;
    }
    startTransition(async () => {
      const result = await moveAssignmentAction({
        id: dragRef.assignmentId,
        start_date: final.start_date,
        end_date: final.end_date,
      });
      if (!result.ok) {
        setError(result.error);
        if (originalRef.current) {
          const orig = originalRef.current;
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === orig.id ? { ...a, start_date: orig.start_date, end_date: orig.end_date } : a,
            ),
          );
        }
      } else {
        setError(null);
      }
      originalRef.current = null;
    });
  };

  const onDeleteAssignment = (id: number) => {
    startTransition(async () => {
      const result = await deleteAssignmentAction(id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div>
      {error ? (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}
      <div
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
              Employee
            </div>
            <div className="relative" style={{ width: totalWidth }}>
              {datesHeader.map((d) => (
                <div
                  key={d.date}
                  className={`absolute top-0 flex flex-col items-center justify-center text-[10px] ${d.isMonday ? "font-semibold text-slate-700" : "text-slate-400"} ${d.isToday ? "text-brand-600" : ""}`}
                  style={{ left: d.offset * DAY_W, width: DAY_W, height: 36 }}
                >
                  <div>
                    {new Date(d.date + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {employees.map((emp) => {
            const empAssignments = assignments.filter((a) => a.employee_id === emp.id);
            const isDrawing = drag?.kind === "draw" && drag.employeeId === emp.id;
            const drawStart = isDrawing
              ? Math.min((drag as { anchorOffset: number }).anchorOffset, (drag as { currentOffset: number }).currentOffset)
              : 0;
            const drawEnd = isDrawing
              ? Math.max((drag as { anchorOffset: number }).anchorOffset, (drag as { currentOffset: number }).currentOffset)
              : 0;
            return (
              <div key={emp.id} className="flex border-b border-slate-100" style={{ height: ROW_H }}>
                <div
                  className="sticky left-0 z-10 shrink-0 border-r border-slate-200 bg-white px-3 py-2"
                  style={{ width: LEFT_COL_W }}
                >
                  <div className="truncate text-sm font-medium text-slate-800">{emp.name}</div>
                  <div className="truncate text-[11px] text-slate-500">
                    {emp.role ?? "—"}
                    {emp.skills.length > 0 ? ` · ${emp.skills.slice(0, 2).join(", ")}` : ""}
                  </div>
                </div>
                <div
                  ref={(el) => {
                    if (el) rowRefs.current.set(emp.id, el);
                    else rowRefs.current.delete(emp.id);
                  }}
                  className="relative cursor-crosshair bg-[linear-gradient(to_right,transparent_0,transparent_calc(100%_-_1px),#e2e8f0_calc(100%_-_1px))]"
                  style={{ width: totalWidth, backgroundSize: `${DAY_W * 7}px 100%` }}
                  onPointerDown={(e) => onRowPointerDown(e, emp.id)}
                >
                  {todayOffset >= 0 && todayOffset < days ? (
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 w-px bg-brand-400"
                      style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
                    />
                  ) : null}
                  {empAssignments.map((a) => {
                    const left = daysBetween(windowStart, a.start_date) * DAY_W;
                    const width = (daysBetween(a.start_date, a.end_date) + 1) * DAY_W;
                    if (left + width <= 0 || left >= totalWidth) return null;
                    const isCurrent = a.project_id === projectId;
                    if (!isCurrent) {
                      return (
                        <div
                          key={a.id}
                          className="pointer-events-none absolute top-1.5 flex items-center rounded-md border border-slate-300 bg-slate-100 text-[11px] text-slate-600"
                          style={{
                            left,
                            width,
                            height: ROW_H - 12,
                            backgroundImage:
                              "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(100,116,139,0.18) 4px, rgba(100,116,139,0.18) 8px)",
                          }}
                          title={`Booked: ${a.project_name}`}
                        >
                          <span className="truncate px-2">{a.project_name}</span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={a.id}
                        className={`group absolute top-1.5 flex items-center rounded-md bg-brand-600 text-xs text-white shadow-sm ${drag && "assignmentId" in drag && drag.assignmentId === a.id ? "ring-2 ring-offset-1 ring-brand-300" : ""}`}
                        style={{ left, width, height: ROW_H - 12 }}
                        onPointerDown={(e) => onPointerDownBar(e, a, "move")}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-l-md bg-black/20 opacity-0 group-hover:opacity-100"
                          onPointerDown={(e) => onPointerDownBar(e, a, "resize-left")}
                        />
                        <span className="flex-1 cursor-grab select-none truncate px-2 font-medium active:cursor-grabbing">
                          {projectName}
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
                  {isDrawing ? (
                    <div
                      className="pointer-events-none absolute top-1.5 rounded-md border-2 border-dashed border-brand-500 bg-brand-100/60"
                      style={{
                        left: drawStart * DAY_W,
                        width: (drawEnd - drawStart + 1) * DAY_W,
                        height: ROW_H - 12,
                      }}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
          {employees.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No active employees.</div>
          ) : null}
        </div>
      </div>
      <div className="mt-2 text-[11px] text-slate-500">
        Drag across an empty row to add days · Drag a bar to move · Drag edges to resize · Striped bars are bookings on other projects (read-only)
        {isPending ? " · saving…" : ""}
      </div>
    </div>
  );
}
