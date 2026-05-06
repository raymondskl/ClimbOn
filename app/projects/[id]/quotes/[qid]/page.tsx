import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { projectRepo, quoteRepo } from "@/lib/repo";
import { dateShort } from "@/lib/format";
import type { QuoteStatus } from "@/lib/types";
import {
  addQuoteItem,
  deleteQuote,
  updateQuoteHeader,
  updateQuoteStatus,
} from "../actions";
import { QuoteWorkspace } from "./QuoteWorkspace";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

const STATUSES: { value: QuoteStatus; label: string; tone: string }[] = [
  { value: "draft", label: "Draft", tone: "bg-slate-100 text-slate-700" },
  { value: "sent", label: "Sent", tone: "bg-sky-50 text-sky-700" },
  { value: "accepted", label: "Accepted", tone: "bg-emerald-50 text-emerald-700" },
  { value: "declined", label: "Declined", tone: "bg-rose-50 text-rose-700" },
];

function toneFor(status: QuoteStatus) {
  return STATUSES.find((s) => s.value === status)?.tone ?? "bg-slate-100 text-slate-700";
}

export default async function QuoteEditorPage({
  params,
}: {
  params: { id: string; qid: string };
}) {
  const projectId = Number(params.id);
  const quoteId = Number(params.qid);
  if (!projectId || !quoteId) notFound();

  const [project, quote] = await Promise.all([
    projectRepo.get(projectId),
    quoteRepo.get(quoteId),
  ]);
  if (!project || !quote || quote.project_id !== projectId) notFound();

  const [items, shots] = await Promise.all([
    quoteRepo.items(quoteId),
    quoteRepo.shots(quoteId),
  ]);

  return (
    <div>
      <PageHeader
        title={`Quote v${quote.version} — ${project.name}`}
        description={
          quote.client_product
            ? `${quote.client_product} · created ${dateShort(quote.created_at)}`
            : `Created ${dateShort(quote.created_at)}`
        }
        actions={
          <div className="flex items-center gap-3 text-xs">
            <Link href={`/projects/${projectId}`} className="text-brand-600 hover:underline">
              ← Back to project
            </Link>
            <PrintButton />
          </div>
        }
      />

      <div className="card print:hidden">
        <div className="card-body">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`badge ${toneFor(quote.status)}`}>{quote.status}</span>
              <form action={updateQuoteStatus} className="flex items-center gap-2 text-xs">
                <input type="hidden" name="id" value={quote.id} />
                <input type="hidden" name="project_id" value={projectId} />
                <select name="status" defaultValue={quote.status} className="select !py-1 text-xs">
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button className="text-xs text-brand-600 hover:underline">Update</button>
              </form>
            </div>
            <form action={deleteQuote}>
              <input type="hidden" name="id" value={quote.id} />
              <input type="hidden" name="project_id" value={projectId} />
              <button className="text-xs text-rose-600 hover:underline">Delete quote</button>
            </form>
          </div>
        </div>
      </div>

      <form action={updateQuoteHeader} className="card mt-4">
        <input type="hidden" name="id" value={quote.id} />
        <input type="hidden" name="project_id" value={projectId} />
        <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Quote date" name="quote_date" type="date" defaultValue={quote.quote_date ?? ""} />
          <Field
            label="Version"
            name="version"
            type="number"
            step="0.1"
            defaultValue={String(quote.version)}
          />
          <Field
            label="T&DA location"
            name="tda_location"
            defaultValue={quote.tda_location ?? "Sydney"}
          />
          <Field
            label="Client / Product"
            name="client_product"
            defaultValue={quote.client_product ?? ""}
            full
          />
          <Field
            label="Primary contact"
            name="primary_contact"
            defaultValue={quote.primary_contact ?? ""}
          />
          <Field label="Producer" name="producer" defaultValue={quote.producer ?? ""} />
          <Field
            label="Producer title"
            name="producer_title"
            defaultValue={quote.producer_title ?? "Executive Producer"}
          />
          <Field label="Director" name="director" defaultValue={quote.director ?? ""} />
          <Field label="Agency" name="agency" defaultValue={quote.agency ?? ""} />
          <Field
            label="Agency contact"
            name="agency_contact"
            defaultValue={quote.agency_contact ?? ""}
          />
          <Field
            label="Production company"
            name="production_company"
            defaultValue={quote.production_company ?? "T&DA"}
          />
          <Field
            label="Prod. company producer"
            name="prod_company_producer"
            defaultValue={quote.prod_company_producer ?? ""}
          />
          <Field
            label="Discount rate (0–1)"
            name="discount_rate"
            type="number"
            step="0.001"
            defaultValue={String(quote.discount_rate)}
          />
          <Field
            label="Overhead rate / day"
            name="overhead_rate"
            type="number"
            step="1"
            defaultValue={String(quote.overhead_rate)}
          />
          <div className="md:col-span-3 flex justify-end">
            <button type="submit" className="btn-primary">Save header</button>
          </div>
        </div>
      </form>

      <QuoteWorkspace
        quote={quote}
        items={items}
        shots={shots}
        projectId={projectId}
      />

      <form action={addQuoteItem} className="card mt-4 print:hidden">
        <input type="hidden" name="quote_id" value={quote.id} />
        <input type="hidden" name="project_id" value={projectId} />
        <div className="card-body flex flex-wrap items-end gap-3">
          <div className="grow">
            <label className="label">New line class</label>
            <input name="class" className="input" placeholder="e.g. ROTOSCOPE" />
          </div>
          <div>
            <label className="label">Unit</label>
            <select name="unit" className="select" defaultValue="Day">
              <option>Day</option>
              <option>Hour</option>
              <option>Unit</option>
              <option>Project</option>
              <option>Week</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Add line</button>
        </div>
      </form>

      <form action={updateQuoteHeader} className="card mt-4">
        <input type="hidden" name="id" value={quote.id} />
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="version" value={quote.version} />
        <input type="hidden" name="quote_date" value={quote.quote_date ?? ""} />
        <input type="hidden" name="client_product" value={quote.client_product ?? ""} />
        <input type="hidden" name="primary_contact" value={quote.primary_contact ?? ""} />
        <input type="hidden" name="producer" value={quote.producer ?? ""} />
        <input type="hidden" name="producer_title" value={quote.producer_title ?? ""} />
        <input type="hidden" name="director" value={quote.director ?? ""} />
        <input type="hidden" name="agency" value={quote.agency ?? ""} />
        <input type="hidden" name="agency_contact" value={quote.agency_contact ?? ""} />
        <input type="hidden" name="production_company" value={quote.production_company ?? ""} />
        <input type="hidden" name="prod_company_producer" value={quote.prod_company_producer ?? ""} />
        <input type="hidden" name="tda_location" value={quote.tda_location ?? ""} />
        <input type="hidden" name="discount_rate" value={quote.discount_rate} />
        <input type="hidden" name="overhead_rate" value={quote.overhead_rate} />
        <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold text-slate-700">Cover letter & licence</h2>
          <div className="md:col-span-2">
            <label className="label">Cover letter intro</label>
            <textarea
              name="cover_letter_intro"
              rows={3}
              className="textarea"
              defaultValue={quote.cover_letter_intro ?? ""}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Exclusions</label>
            <textarea
              name="cover_letter_exclusions"
              rows={4}
              className="textarea"
              defaultValue={quote.cover_letter_exclusions ?? ""}
            />
          </div>
          <Field
            label="Licence territory"
            name="licence_territory"
            defaultValue={quote.licence_territory ?? ""}
          />
          <Field label="Licence term" name="licence_term" defaultValue={quote.licence_term ?? ""} />
          <div className="md:col-span-2">
            <label className="label">Licence use</label>
            <textarea
              name="licence_use"
              rows={2}
              className="textarea"
              defaultValue={quote.licence_use ?? ""}
            />
          </div>
          <input type="hidden" name="status" value={quote.status} />
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary">Save cover letter</button>
          </div>
        </div>
      </form>

      <section className="card mt-6 hidden print:block print:mt-8">
        <div className="card-body">
          <h2 className="text-base font-semibold text-slate-800">Cover letter</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {quote.cover_letter_intro}
          </p>
          {quote.cover_letter_exclusions ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
              {quote.cover_letter_exclusions}
            </p>
          ) : null}
          {quote.licence_territory || quote.licence_term || quote.licence_use ? (
            <div className="mt-4 text-sm text-slate-700">
              <h3 className="text-sm font-semibold text-slate-800">Licence</h3>
              {quote.licence_territory ? <div>Territory: {quote.licence_territory}</div> : null}
              {quote.licence_term ? <div>Term: {quote.licence_term}</div> : null}
              {quote.licence_use ? <div>Use: {quote.licence_use}</div> : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  step,
  full,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  step?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-3" : ""}>
      <label className="label">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        className="input"
      />
    </div>
  );
}
