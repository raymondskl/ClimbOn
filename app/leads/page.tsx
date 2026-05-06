import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { leadRepo } from "@/lib/repo";
import { currency, dateShort, dateTimeShort } from "@/lib/format";
import {
  addLeadNote,
  createLead,
  deleteLead,
  deleteLeadNote,
  updateLeadNote,
  updateLeadStage,
} from "./actions";
import type { LeadNote, LeadStage } from "@/lib/types";

export const dynamic = "force-dynamic";

const STAGES: { value: LeadStage; label: string; tone: string }[] = [
  { value: "new", label: "New", tone: "bg-slate-100 text-slate-700" },
  { value: "contacted", label: "Contacted", tone: "bg-sky-50 text-sky-700" },
  { value: "qualified", label: "Qualified", tone: "bg-indigo-50 text-indigo-700" },
  { value: "proposal", label: "Proposal", tone: "bg-violet-50 text-violet-700" },
  { value: "won", label: "Won", tone: "bg-emerald-50 text-emerald-700" },
  { value: "lost", label: "Lost", tone: "bg-rose-50 text-rose-700" },
];

export default async function LeadsPage() {
  const [leads, pipeline, notesByLead] = await Promise.all([
    leadRepo.list(),
    leadRepo.pipelineStats(),
    leadRepo.notesByLead(),
  ]);
  const totalValue = leads.filter((l) => !["won", "lost"].includes(l.stage)).reduce((s, l) => s + l.estimated_value, 0);
  const wonValue = leads.filter((l) => l.stage === "won").reduce((s, l) => s + l.estimated_value, 0);
  const winRate = (() => {
    const won = leads.filter((l) => l.stage === "won").length;
    const lost = leads.filter((l) => l.stage === "lost").length;
    const closed = won + lost;
    return closed === 0 ? 0 : won / closed;
  })();

  const byStage: Record<LeadStage, typeof leads> = {
    new: [],
    contacted: [],
    qualified: [],
    proposal: [],
    won: [],
    lost: [],
  };
  for (const l of leads) byStage[l.stage].push(l);

  return (
    <div>
      <PageHeader title="Leads" description="Pipeline, follow-ups, and deal value." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Open pipeline" value={currency(totalValue)} hint={`${leads.filter((l) => !["won", "lost"].includes(l.stage)).length} open`} />
        <StatCard label="Won" value={currency(wonValue)} />
        <StatCard label="Win rate" value={`${(winRate * 100).toFixed(0)}%`} hint="Won / (Won + Lost)" />
        <StatCard label="Total leads" value={leads.length} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((s) => {
          const stats = pipeline.find((p) => p.stage === s.value);
          return (
            <div key={s.value} className="card">
              <div className="card-body">
                <div className={`badge ${s.tone}`}>{s.label}</div>
                <div className="mt-2 text-xl font-semibold">{stats?.count ?? 0}</div>
                <div className="text-xs text-slate-500">{currency(stats?.value ?? 0)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-body">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Add a lead</h2>
            <form action={createLead} className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input name="name" className="input" required />
              </div>
              <div>
                <label className="label">Company</label>
                <input name="company" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email</label>
                  <input type="email" name="email" className="input" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input name="phone" className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Source</label>
                  <input name="source" className="input" placeholder="Referral, Inbound…" />
                </div>
                <div>
                  <label className="label">Stage</label>
                  <select name="stage" className="select" defaultValue="new">
                    {STAGES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Estimated value</label>
                <input type="number" step="0.01" min="0" name="estimated_value" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Next action</label>
                  <input name="next_action" className="input" placeholder="Send proposal" />
                </div>
                <div>
                  <label className="label">Action date</label>
                  <input type="date" name="next_action_date" className="input" />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea name="notes" rows={3} className="textarea" />
              </div>
              <button type="submit" className="btn-primary w-full">Add lead</button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {STAGES.map((s) => {
            const items = byStage[s.value];
            if (items.length === 0) return null;
            return (
              <div key={s.value} className="card">
                <div className="card-body">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${s.tone}`}>{s.label}</span>
                      <span className="text-xs text-slate-500">{items.length} leads</span>
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                      {currency(items.reduce((sum, l) => sum + l.estimated_value, 0))}
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {items.map((l) => {
                      const notes = notesByLead.get(l.id) ?? [];
                      return (
                        <div key={l.id} className="py-2">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">
                                {l.name}{" "}
                                <span className="font-normal text-slate-400">
                                  · {l.company ?? "—"}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                {l.next_action ?? "No action set"} ·{" "}
                                {dateShort(l.next_action_date)} · {l.email ?? "no email"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {currency(l.estimated_value)}
                              </span>
                              <form
                                action={updateLeadStage}
                                className="flex items-center gap-1"
                              >
                                <input type="hidden" name="id" value={l.id} />
                                <select
                                  name="stage"
                                  defaultValue={l.stage}
                                  className="select !py-1 text-xs"
                                >
                                  {STAGES.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <button className="text-xs text-brand-600 hover:underline">
                                  Move
                                </button>
                              </form>
                              <form action={deleteLead}>
                                <input type="hidden" name="id" value={l.id} />
                                <button className="text-xs text-rose-600 hover:underline">
                                  Delete
                                </button>
                              </form>
                            </div>
                          </div>
                          <details className="group mt-1">
                            <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-brand-600">
                              <span className="inline-block w-3 transition-transform group-open:rotate-90">
                                ▶
                              </span>{" "}
                              Notes ({notes.length})
                            </summary>
                            <LeadNotesPanel leadId={l.id} notes={notes} />
                          </details>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {leads.length === 0 ? (
            <div className="card"><div className="card-body"><p className="text-sm text-slate-500">No leads yet — add your first one on the left.</p></div></div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LeadNotesPanel({
  leadId,
  notes,
}: {
  leadId: number;
  notes: LeadNote[];
}) {
  return (
    <div className="mt-2 rounded-md bg-slate-50/70 p-3">
      <form action={addLeadNote} className="flex items-start gap-2">
        <input type="hidden" name="lead_id" value={leadId} />
        <textarea
          name="body"
          rows={2}
          className="textarea flex-1 text-xs"
          placeholder="Add a note (e.g. 'Spoke with Dan, sending revised SOW Mon')"
          required
        />
        <button type="submit" className="btn-primary !py-1 text-xs">
          Add note
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="mt-3 text-[11px] text-slate-500">No notes yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((n) => {
            const edited = n.updated_at && n.updated_at !== n.created_at;
            return (
              <li key={n.id} className="rounded border border-slate-200 bg-white p-2">
                <details className="group">
                  <summary className="flex cursor-pointer items-start justify-between gap-2 list-none">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">
                        <span title={n.created_at}>{dateTimeShort(n.created_at)}</span>
                        {edited ? (
                          <span
                            className="ml-2 text-amber-600"
                            title={`Edited ${dateTimeShort(n.updated_at)}`}
                          >
                            · edited {dateTimeShort(n.updated_at)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                        {n.body}
                      </p>
                    </div>
                    <span className="text-[10px] text-brand-600 group-open:hidden">Edit</span>
                    <span className="hidden text-[10px] text-slate-500 group-open:inline">
                      Cancel
                    </span>
                  </summary>
                  <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2">
                    <form action={updateLeadNote} className="flex flex-col gap-2">
                      <input type="hidden" name="id" value={n.id} />
                      <textarea
                        name="body"
                        rows={3}
                        className="textarea text-xs"
                        defaultValue={n.body}
                        required
                      />
                      <div className="flex justify-between">
                        <span className="text-[10px] text-slate-400">
                          Saving will stamp the edit time.
                        </span>
                        <button
                          type="submit"
                          className="rounded bg-brand-600 px-2 py-1 text-[11px] text-white hover:bg-brand-700"
                        >
                          Save changes
                        </button>
                      </div>
                    </form>
                    <form action={deleteLeadNote} className="flex justify-end">
                      <input type="hidden" name="id" value={n.id} />
                      <button
                        type="submit"
                        className="text-[10px] text-rose-600 hover:underline"
                      >
                        Delete this note
                      </button>
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
