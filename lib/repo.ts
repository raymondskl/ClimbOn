import { batch, exec, getDb } from "./db";
import type { InValue } from "@libsql/client";
import type {
  AssignmentDetail,
  Dataset,
  DatasetRow,
  Employee,
  EmployeeWithSkills,
  Lead,
  LeadNote,
  Project,
  ProjectTaskDetail,
  Quote,
  QuoteItem,
  QuoteShot,
  QuoteStatus,
  ShotDiscipline,
  Skill,
  TaskStatus,
  Transaction,
} from "./types";

// ---------- helpers ----------------------------------------------------------

type Args = InValue[] | Record<string, InValue>;

// libSQL Row objects are array-like proxies; convert to plain objects so they
// serialize cleanly when passed from server components to client components.
function plain<T>(row: unknown): T {
  return { ...(row as Record<string, unknown>) } as T;
}

async function all<T>(sql: string, args?: Args): Promise<T[]> {
  const r = await exec({ sql, args: args ?? [] });
  return r.rows.map((row) => plain<T>(row));
}

async function one<T>(sql: string, args?: Args): Promise<T | undefined> {
  const r = await exec({ sql, args: args ?? [] });
  return r.rows[0] ? plain<T>(r.rows[0]) : undefined;
}

async function run(sql: string, args?: Args) {
  return exec({ sql, args: args ?? [] });
}

async function lastInsertId(sql: string, args?: Args): Promise<number> {
  const r = await exec({ sql, args: args ?? [] });
  return Number(r.lastInsertRowid ?? 0);
}

// ---------- transactions ------------------------------------------------------

export const txRepo = {
  async list(filter?: { type?: "income" | "expense"; from?: string; to?: string }) {
    const where: string[] = [];
    const params: Record<string, InValue> = {};
    if (filter?.type) {
      where.push("type = :type");
      params.type = filter.type;
    }
    if (filter?.from) {
      where.push("occurred_on >= :from");
      params.from = filter.from;
    }
    if (filter?.to) {
      where.push("occurred_on <= :to");
      params.to = filter.to;
    }
    const sql = `SELECT * FROM transactions ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY occurred_on DESC, id DESC`;
    return all<Transaction>(sql, params);
  },
  async create(input: {
    occurred_on: string;
    type: "income" | "expense";
    category: string;
    amount: number;
    description?: string | null;
    project_id?: number | null;
  }) {
    return run(
      "INSERT INTO transactions (occurred_on, type, category, amount, description, project_id) VALUES (?, ?, ?, ?, ?, ?)",
      [
        input.occurred_on,
        input.type,
        input.category,
        input.amount,
        input.description ?? null,
        input.project_id ?? null,
      ],
    );
  },
  async delete(id: number) {
    return run("DELETE FROM transactions WHERE id = ?", [id]);
  },
  async monthlyTotals(
    limitMonths = 12,
  ): Promise<{ month: string; income: number; expense: number; net: number }[]> {
    const rows = await all<{ month: string; income: number; expense: number }>(
      `SELECT substr(occurred_on,1,7) AS month,
              SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
              SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
       FROM transactions GROUP BY month ORDER BY month ASC`,
    );
    return rows.slice(-limitMonths).map((r) => ({
      month: r.month,
      income: r.income ?? 0,
      expense: r.expense ?? 0,
      net: (r.income ?? 0) - (r.expense ?? 0),
    }));
  },
  async categoryBreakdown(type: "income" | "expense") {
    return all<{ name: string; value: number }>(
      "SELECT category AS name, SUM(amount) AS value FROM transactions WHERE type = ? GROUP BY category ORDER BY value DESC",
      [type],
    );
  },
  async totals() {
    const row = await one<{ income: number | null; expense: number | null }>(
      `SELECT
         SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
         SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
       FROM transactions`,
    );
    const income = row?.income ?? 0;
    const expense = row?.expense ?? 0;
    return { income, expense, net: income - expense };
  },
};

// ---------- projects ----------------------------------------------------------

export const projectRepo = {
  async list() {
    return all<Project>("SELECT * FROM projects ORDER BY created_at DESC");
  },
  async listBrief() {
    return all<{ id: number; name: string }>(
      "SELECT id, name FROM projects ORDER BY name ASC",
    );
  },
  async get(id: number) {
    return one<Project>("SELECT * FROM projects WHERE id = ?", [id]);
  },
  async create(input: Omit<Project, "id" | "created_at">) {
    return run(
      "INSERT INTO projects (name, client, status, budget, start_date, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        input.name,
        input.client,
        input.status,
        input.budget,
        input.start_date,
        input.due_date,
        input.notes,
      ],
    );
  },
  async update(id: number, input: Partial<Omit<Project, "id" | "created_at">>) {
    const current = await projectRepo.get(id);
    if (!current) return;
    const next = { ...current, ...input };
    return run(
      "UPDATE projects SET name=?, client=?, status=?, budget=?, start_date=?, due_date=?, notes=? WHERE id=?",
      [
        next.name,
        next.client,
        next.status,
        next.budget,
        next.start_date,
        next.due_date,
        next.notes,
        id,
      ],
    );
  },
  async delete(id: number) {
    return run("DELETE FROM projects WHERE id = ?", [id]);
  },
  async financialsFor(id: number) {
    const row = await one<{ income: number | null; expense: number | null }>(
      `SELECT
         SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
         SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
       FROM transactions WHERE project_id = ?`,
      [id],
    );
    const income = row?.income ?? 0;
    const expense = row?.expense ?? 0;
    return { income, expense, net: income - expense };
  },
};

// ---------- leads -------------------------------------------------------------

export const leadRepo = {
  async list() {
    return all<Lead>("SELECT * FROM leads ORDER BY created_at DESC");
  },
  async create(input: Omit<Lead, "id" | "created_at">) {
    return run(
      "INSERT INTO leads (name, company, email, phone, source, stage, estimated_value, next_action, next_action_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        input.name,
        input.company,
        input.email,
        input.phone,
        input.source,
        input.stage,
        input.estimated_value,
        input.next_action,
        input.next_action_date,
        input.notes,
      ],
    );
  },
  async updateStage(id: number, stage: Lead["stage"]) {
    return run("UPDATE leads SET stage = ? WHERE id = ?", [stage, id]);
  },
  async delete(id: number) {
    return run("DELETE FROM leads WHERE id = ?", [id]);
  },
  async pipelineStats() {
    return all<{ stage: Lead["stage"]; count: number; value: number }>(
      "SELECT stage, COUNT(*) AS count, COALESCE(SUM(estimated_value),0) AS value FROM leads GROUP BY stage",
    );
  },
  async notes(leadId: number) {
    return all<LeadNote>(
      "SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC",
      [leadId],
    );
  },
  async notesByLead() {
    const rows = await all<LeadNote>(
      "SELECT * FROM lead_notes ORDER BY created_at DESC",
    );
    const m = new Map<number, LeadNote[]>();
    for (const n of rows) {
      const list = m.get(n.lead_id);
      if (list) list.push(n);
      else m.set(n.lead_id, [n]);
    }
    return m;
  },
  async addNote(leadId: number, body: string) {
    return run("INSERT INTO lead_notes (lead_id, body) VALUES (?, ?)", [leadId, body]);
  },
  async updateNote(id: number, body: string) {
    return run(
      "UPDATE lead_notes SET body = ?, updated_at = datetime('now') WHERE id = ?",
      [body, id],
    );
  },
  async deleteNote(id: number) {
    return run("DELETE FROM lead_notes WHERE id = ?", [id]);
  },
};

// ---------- employees ---------------------------------------------------------

export const employeeRepo = {
  async list() {
    return all<Employee>(
      "SELECT * FROM employees ORDER BY active DESC, name ASC",
    );
  },
  async create(input: Omit<Employee, "id" | "created_at">) {
    return run(
      "INSERT INTO employees (name, role, email, phone, employment_type, salary, start_date, active, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        input.name,
        input.role,
        input.email,
        input.phone,
        input.employment_type,
        input.salary,
        input.start_date,
        input.active,
        input.notes,
      ],
    );
  },
  async toggleActive(id: number) {
    return run("UPDATE employees SET active = 1 - active WHERE id = ?", [id]);
  },
  async update(
    id: number,
    patch: Partial<Omit<Employee, "id" | "created_at">>,
  ) {
    const current = await employeeRepo.get(id);
    if (!current) return;
    const next = { ...current, ...patch } as Employee;
    return run(
      `UPDATE employees SET
         name=?, role=?, email=?, phone=?, employment_type=?, salary=?,
         start_date=?, active=?, notes=?
       WHERE id=?`,
      [
        next.name,
        next.role,
        next.email,
        next.phone,
        next.employment_type,
        next.salary,
        next.start_date,
        next.active,
        next.notes,
        id,
      ],
    );
  },
  async delete(id: number) {
    return run("DELETE FROM employees WHERE id = ?", [id]);
  },
  async totalAnnualSalary() {
    const row = await one<{ total: number }>(
      "SELECT COALESCE(SUM(salary),0) AS total FROM employees WHERE active = 1",
    );
    return row?.total ?? 0;
  },
  async get(id: number) {
    return one<Employee>("SELECT * FROM employees WHERE id = ?", [id]);
  },
  async skillsFor(employeeId: number) {
    return all<Skill>(
      `SELECT s.* FROM skills s
       JOIN employee_skills es ON es.skill_id = s.id
       WHERE es.employee_id = ? ORDER BY s.name ASC`,
      [employeeId],
    );
  },
  async listWithSkills(): Promise<EmployeeWithSkills[]> {
    const employees = await employeeRepo.list();
    const skills = await Promise.all(employees.map((e) => employeeRepo.skillsFor(e.id)));
    return employees.map((e, i) => ({ ...e, skills: skills[i] }));
  },
  async addSkill(employeeId: number, skillId: number) {
    return run(
      "INSERT OR IGNORE INTO employee_skills (employee_id, skill_id) VALUES (?, ?)",
      [employeeId, skillId],
    );
  },
  async removeSkill(employeeId: number, skillId: number) {
    return run(
      "DELETE FROM employee_skills WHERE employee_id = ? AND skill_id = ?",
      [employeeId, skillId],
    );
  },
};

// ---------- skills ------------------------------------------------------------

export const skillRepo = {
  async list() {
    return all<Skill>("SELECT * FROM skills ORDER BY name ASC");
  },
  async get(id: number) {
    return one<Skill>("SELECT * FROM skills WHERE id = ?", [id]);
  },
  async findOrCreate(name: string): Promise<Skill> {
    const trimmed = name.trim();
    const existing = await one<Skill>(
      "SELECT * FROM skills WHERE name = ? COLLATE NOCASE",
      [trimmed],
    );
    if (existing) return existing;
    const id = await lastInsertId("INSERT INTO skills (name) VALUES (?)", [trimmed]);
    const row = await skillRepo.get(id);
    if (!row) throw new Error("Failed to create skill");
    return row;
  },
  async delete(id: number) {
    return run("DELETE FROM skills WHERE id = ?", [id]);
  },
  async employeesWithSkill(skillId: number) {
    return all<Employee>(
      `SELECT e.* FROM employees e
       JOIN employee_skills es ON es.employee_id = e.id
       WHERE es.skill_id = ? AND e.active = 1
       ORDER BY e.name ASC`,
      [skillId],
    );
  },
};

// ---------- assignments -------------------------------------------------------

export const assignmentRepo = {
  async listForProject(projectId: number) {
    return all<AssignmentDetail>(
      `SELECT a.*, e.name AS employee_name, p.name AS project_name
       FROM assignments a
       JOIN employees e ON e.id = a.employee_id
       JOIN projects p ON p.id = a.project_id
       WHERE a.project_id = ?
       ORDER BY a.start_date ASC`,
      [projectId],
    );
  },
  async listForEmployee(employeeId: number) {
    return all<AssignmentDetail>(
      `SELECT a.*, e.name AS employee_name, p.name AS project_name
       FROM assignments a
       JOIN employees e ON e.id = a.employee_id
       JOIN projects p ON p.id = a.project_id
       WHERE a.employee_id = ?
       ORDER BY a.start_date ASC`,
      [employeeId],
    );
  },
  async conflictsFor(
    employeeId: number,
    startDate: string,
    endDate: string,
    excludeId?: number,
  ) {
    const sql = `SELECT a.*, e.name AS employee_name, p.name AS project_name
                 FROM assignments a
                 JOIN employees e ON e.id = a.employee_id
                 JOIN projects p ON p.id = a.project_id
                 WHERE a.employee_id = :employee_id
                   AND date(a.start_date) <= date(:end_date)
                   AND date(a.end_date) >= date(:start_date)
                   ${excludeId ? "AND a.id != :exclude_id" : ""}`;
    const args: Record<string, InValue> = {
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
    };
    if (excludeId) args.exclude_id = excludeId;
    return all<AssignmentDetail>(sql, args);
  },
  async availableEmployees(
    startDate: string,
    endDate: string,
    requiredSkillId?: number | null,
  ) {
    const args: Record<string, InValue> = {
      start_date: startDate,
      end_date: endDate,
    };
    let skillJoin = "";
    let skillWhere = "";
    if (requiredSkillId) {
      skillJoin = "JOIN employee_skills es ON es.employee_id = e.id";
      skillWhere = "AND es.skill_id = :skill_id";
      args.skill_id = requiredSkillId;
    }
    const sql = `SELECT DISTINCT e.* FROM employees e
                 ${skillJoin}
                 WHERE e.active = 1
                   ${skillWhere}
                   AND e.id NOT IN (
                     SELECT employee_id FROM assignments
                     WHERE date(start_date) <= date(:end_date)
                       AND date(end_date) >= date(:start_date)
                   )
                 ORDER BY e.name ASC`;
    return all<Employee>(sql, args);
  },
  async create(input: {
    project_id: number;
    employee_id: number;
    start_date: string;
    end_date: string;
    role?: string | null;
    notes?: string | null;
  }): Promise<
    | { ok: true; id: number }
    | { ok: false; error: string; conflicts: AssignmentDetail[] }
  > {
    if (new Date(input.start_date) > new Date(input.end_date)) {
      return { ok: false, error: "Start date must be on or before end date.", conflicts: [] };
    }
    const conflicts = await assignmentRepo.conflictsFor(
      input.employee_id,
      input.start_date,
      input.end_date,
    );
    if (conflicts.length > 0) {
      return {
        ok: false,
        error: "Employee is already booked during that window.",
        conflicts,
      };
    }
    const id = await lastInsertId(
      `INSERT INTO assignments (project_id, employee_id, start_date, end_date, role, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.project_id,
        input.employee_id,
        input.start_date,
        input.end_date,
        input.role ?? null,
        input.notes ?? null,
      ],
    );
    return { ok: true, id };
  },
  async updateDates(
    id: number,
    startDate: string,
    endDate: string,
  ): Promise<
    | { ok: true }
    | { ok: false; error: string; conflicts: AssignmentDetail[] }
  > {
    if (new Date(startDate) > new Date(endDate)) {
      return { ok: false, error: "Start date must be on or before end date.", conflicts: [] };
    }
    const current = await one<{ employee_id: number }>(
      "SELECT employee_id FROM assignments WHERE id = ?",
      [id],
    );
    if (!current) return { ok: false, error: "Assignment not found.", conflicts: [] };
    const conflicts = await assignmentRepo.conflictsFor(
      current.employee_id,
      startDate,
      endDate,
      id,
    );
    if (conflicts.length > 0) {
      return {
        ok: false,
        error: "Employee is already booked during that window.",
        conflicts,
      };
    }
    await run(
      "UPDATE assignments SET start_date = ?, end_date = ? WHERE id = ?",
      [startDate, endDate, id],
    );
    return { ok: true };
  },
  async delete(id: number) {
    return run("DELETE FROM assignments WHERE id = ?", [id]);
  },
};

// ---------- tasks -------------------------------------------------------------

export const taskRepo = {
  async listForProject(projectId: number) {
    return all<ProjectTaskDetail>(
      `SELECT t.*, s.name AS required_skill_name, e.name AS assigned_employee_name
       FROM project_tasks t
       LEFT JOIN skills s ON s.id = t.required_skill_id
       LEFT JOIN employees e ON e.id = t.assigned_employee_id
       WHERE t.project_id = ?
       ORDER BY
         CASE t.status WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 WHEN 'blocked' THEN 2 ELSE 3 END,
         t.due_date IS NULL, t.due_date ASC, t.created_at DESC`,
      [projectId],
    );
  },
  async create(input: {
    project_id: number;
    description: string;
    required_skill_id?: number | null;
    assigned_employee_id?: number | null;
    status?: TaskStatus;
    due_date?: string | null;
    notes?: string | null;
  }) {
    return run(
      `INSERT INTO project_tasks
         (project_id, description, required_skill_id, assigned_employee_id, status, due_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.project_id,
        input.description,
        input.required_skill_id ?? null,
        input.assigned_employee_id ?? null,
        input.status ?? "todo",
        input.due_date ?? null,
        input.notes ?? null,
      ],
    );
  },
  async updateStatus(id: number, status: TaskStatus) {
    return run("UPDATE project_tasks SET status = ? WHERE id = ?", [status, id]);
  },
  async delete(id: number) {
    return run("DELETE FROM project_tasks WHERE id = ?", [id]);
  },
};

// ---------- quotes ------------------------------------------------------------

type SeedItem = {
  class: string;
  unit: string;
  resource_rate: number;
  overhead_rate?: number;
  room_rate?: number;
  quoted_rate_override?: number;
};

const QUOTE_DEFAULT_OVERHEAD = 936;

const QUOTE_DEFAULT_ITEMS: SeedItem[] = [
  { class: "VFX SUPERVISION", unit: "Day", resource_rate: 1493, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "VFX SUPERVISION TRAVEL", unit: "Unit", resource_rate: 0 },
  { class: "VFX SUPERVISION POST", unit: "Day", resource_rate: 1493, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "PRODUCTION SUPERVISION", unit: "Day", resource_rate: 1297, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "RUSHES INGEST", unit: "Unit", resource_rate: 389, overhead_rate: QUOTE_DEFAULT_OVERHEAD, room_rate: -100 },
  { class: "OFFLINE", unit: "Day", resource_rate: 650, overhead_rate: QUOTE_DEFAULT_OVERHEAD, room_rate: 1300 },
  { class: "OFFLINE - OUTSOURCE", unit: "Day", resource_rate: 1167, overhead_rate: QUOTE_DEFAULT_OVERHEAD, room_rate: 775 },
  { class: "OFFLINE - LOS ANGELES", unit: "Day", resource_rate: 1401, overhead_rate: QUOTE_DEFAULT_OVERHEAD, room_rate: 575 },
  { class: "SOUND DESIGN/MIX", unit: "Day", resource_rate: 2750, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "CONFORM", unit: "Unit", resource_rate: 396, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "MOTION CAPTURE STUDIO", unit: "Day", resource_rate: 976, overhead_rate: QUOTE_DEFAULT_OVERHEAD, room_rate: 980 },
  { class: "DEVELOPMENT", unit: "Day", resource_rate: 1000, overhead_rate: QUOTE_DEFAULT_OVERHEAD, quoted_rate_override: 2100 },
  { class: "ROTOSCOPE", unit: "Day", resource_rate: 1020, overhead_rate: QUOTE_DEFAULT_OVERHEAD, quoted_rate_override: 1250 },
  { class: "3D MODELLING", unit: "Day", resource_rate: 584, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "3D RIGGING", unit: "Day", resource_rate: 657, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "3D TEXTURE", unit: "Day", resource_rate: 584, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "3D PREVIZ", unit: "Day", resource_rate: 1007, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "3D LAYOUT", unit: "Day", resource_rate: 472, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "3D ANIMATION LEAD", unit: "Day", resource_rate: 1007, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "3D ANIMATION", unit: "Day", resource_rate: 472, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "3D LOOK DEV", unit: "Day", resource_rate: 936, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "3D LIGHTING", unit: "Day", resource_rate: 936, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "FX TD", unit: "Day", resource_rate: 1369, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "CONCEPT ART", unit: "Day", resource_rate: 736, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "DESIGN AND MOTION GRAPHICS", unit: "Day", resource_rate: 736, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "DIGITAL MATTE PAINTING", unit: "Day", resource_rate: 830, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "2D ANIMATION", unit: "Day", resource_rate: 861, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "LEAD NUKE COMPOSITING", unit: "Day", resource_rate: 1227, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "NUKE COMPOSITING", unit: "Unit", resource_rate: 578, overhead_rate: QUOTE_DEFAULT_OVERHEAD },
  { class: "ONLINE EDITING", unit: "Day", resource_rate: 882, overhead_rate: QUOTE_DEFAULT_OVERHEAD, room_rate: 3000 },
  { class: "GRADE", unit: "Hour", resource_rate: 475, room_rate: 575 },
  { class: "DIGITAL MASTERS", unit: "Project", resource_rate: 0, overhead_rate: 1450 },
  { class: "DIGITAL APPROVAL FILES", unit: "Project", resource_rate: 0, overhead_rate: 750 },
  { class: "CLIENT SERVICES", unit: "Day", resource_rate: 0, overhead_rate: 275 },
  { class: "EXTRAS", unit: "Day", resource_rate: 0 },
];

const COVER_LETTER_DEFAULT_INTRO =
  "As requested, I have supplied a quote for the project. The breakdown of fees is included on the cost page that follows.";

const COVER_LETTER_DEFAULT_EXCLUSIONS =
  "The quote doesn’t allow for:\n- Stock footage, music or third-party licences\n- Travel, accommodation or per diems\n- Reshoots or revisions outside the scope below\n- GST";

export const quoteRepo = {
  async listForProject(projectId: number) {
    return all<Quote>(
      "SELECT * FROM quotes WHERE project_id = ? ORDER BY created_at DESC",
      [projectId],
    );
  },
  async get(id: number) {
    return one<Quote>("SELECT * FROM quotes WHERE id = ?", [id]);
  },
  async items(quoteId: number) {
    return all<QuoteItem>(
      "SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order ASC, id ASC",
      [quoteId],
    );
  },
  async create(input: {
    project_id: number;
    quote_date?: string | null;
    client_product?: string | null;
  }): Promise<number> {
    const quoteId = await lastInsertId(
      `INSERT INTO quotes (project_id, quote_date, client_product, cover_letter_intro, cover_letter_exclusions)
       VALUES (?, ?, ?, ?, ?)`,
      [
        input.project_id,
        input.quote_date ?? new Date().toISOString().slice(0, 10),
        input.client_product ?? null,
        COVER_LETTER_DEFAULT_INTRO,
        COVER_LETTER_DEFAULT_EXCLUSIONS,
      ],
    );
    // Seed default items in a single batch (transaction).
    const stmts = QUOTE_DEFAULT_ITEMS.map((item, idx) => ({
      sql: `INSERT INTO quote_items
             (quote_id, sort_order, class, unit, resource_rate, overhead_rate, room_rate, quoted_rate_override)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        quoteId,
        idx,
        item.class,
        item.unit,
        item.resource_rate,
        item.overhead_rate ?? 0,
        item.room_rate ?? 0,
        item.quoted_rate_override ?? null,
      ] as InValue[],
    }));
    await batch(stmts);
    return quoteId;
  },
  async updateHeader(
    id: number,
    patch: Partial<Omit<Quote, "id" | "project_id" | "created_at">>,
  ) {
    const current = await quoteRepo.get(id);
    if (!current) return;
    const next = { ...current, ...patch } as Quote;
    return run(
      `UPDATE quotes SET
         version=?, quote_date=?, client_product=?, primary_contact=?, producer=?, producer_title=?,
         director=?, agency=?, agency_contact=?, production_company=?, prod_company_producer=?,
         tda_location=?, discount_rate=?, overhead_rate=?, cover_letter_intro=?, cover_letter_exclusions=?,
         licence_territory=?, licence_term=?, licence_use=?, status=?
       WHERE id=?`,
      [
        next.version,
        next.quote_date,
        next.client_product,
        next.primary_contact,
        next.producer,
        next.producer_title,
        next.director,
        next.agency,
        next.agency_contact,
        next.production_company,
        next.prod_company_producer,
        next.tda_location,
        next.discount_rate,
        next.overhead_rate,
        next.cover_letter_intro,
        next.cover_letter_exclusions,
        next.licence_territory,
        next.licence_term,
        next.licence_use,
        next.status,
        id,
      ],
    );
  },
  async updateItem(
    id: number,
    patch: Partial<Omit<QuoteItem, "id" | "quote_id">>,
  ) {
    const current = await one<QuoteItem>("SELECT * FROM quote_items WHERE id = ?", [id]);
    if (!current) return;
    const next = { ...current, ...patch };
    return run(
      `UPDATE quote_items SET
         sort_order=?, class=?, units=?, unit=?, resource_rate=?, overhead_rate=?, room_rate=?,
         quoted_rate_override=?, notes=?
       WHERE id=?`,
      [
        next.sort_order,
        next.class,
        next.units,
        next.unit,
        next.resource_rate,
        next.overhead_rate,
        next.room_rate,
        next.quoted_rate_override,
        next.notes,
        id,
      ],
    );
  },
  async addItem(quoteId: number, input: { class: string; unit?: string }) {
    const row = await one<{ m: number }>(
      "SELECT COALESCE(MAX(sort_order), -1) AS m FROM quote_items WHERE quote_id = ?",
      [quoteId],
    );
    const maxOrder = row?.m ?? -1;
    return run(
      "INSERT INTO quote_items (quote_id, sort_order, class, unit) VALUES (?, ?, ?, ?)",
      [quoteId, maxOrder + 1, input.class, input.unit ?? "Day"],
    );
  },
  async deleteItem(id: number) {
    return run("DELETE FROM quote_items WHERE id = ?", [id]);
  },
  async delete(id: number) {
    return run("DELETE FROM quotes WHERE id = ?", [id]);
  },
  async setStatus(id: number, status: QuoteStatus) {
    return run("UPDATE quotes SET status = ? WHERE id = ?", [status, id]);
  },
  async shots(quoteId: number) {
    return all<QuoteShot>(
      "SELECT * FROM quote_shots WHERE quote_id = ? ORDER BY sort_order ASC, id ASC",
      [quoteId],
    );
  },
  async addShot(quoteId: number, input: { shot_code?: string | null }) {
    const row = await one<{ m: number }>(
      "SELECT COALESCE(MAX(sort_order), -1) AS m FROM quote_shots WHERE quote_id = ?",
      [quoteId],
    );
    const maxOrder = row?.m ?? -1;
    return run(
      "INSERT INTO quote_shots (quote_id, sort_order, shot_code) VALUES (?, ?, ?)",
      [quoteId, maxOrder + 1, input.shot_code ?? null],
    );
  },
  async updateShot(
    id: number,
    patch: Partial<Omit<QuoteShot, "id" | "quote_id">>,
  ) {
    const current = await one<QuoteShot>(
      "SELECT * FROM quote_shots WHERE id = ?",
      [id],
    );
    if (!current) return;
    const next = { ...current, ...patch };
    return run(
      `UPDATE quote_shots SET
         sort_order=?, shot_code=?, board_ref=?, production_notes=?, vfx_notes=?,
         design_mogfx=?, concept_art=?, anim_2d=?, dmp=?, dev=?, previz=?, layout=?, mod=?, rig=?,
         face_swap=?, anim=?, tex_shad=?, fx_td=?, lookdev=?, l_r=?, roto_track=?, lead_nuke=?,
         nuke=?, online=?, sound=?
       WHERE id=?`,
      [
        next.sort_order,
        next.shot_code,
        next.board_ref,
        next.production_notes,
        next.vfx_notes,
        next.design_mogfx,
        next.concept_art,
        next.anim_2d,
        next.dmp,
        next.dev,
        next.previz,
        next.layout,
        next.mod,
        next.rig,
        next.face_swap,
        next.anim,
        next.tex_shad,
        next.fx_td,
        next.lookdev,
        next.l_r,
        next.roto_track,
        next.lead_nuke,
        next.nuke,
        next.online,
        next.sound,
        id,
      ],
    );
  },
  async deleteShot(id: number) {
    return run("DELETE FROM quote_shots WHERE id = ?", [id]);
  },
  async applyShotTotalToItem(
    quoteId: number,
    discipline: ShotDiscipline,
    lineClass: string,
  ): Promise<number> {
    // discipline is a string-literal type, restricted to known column names; no injection risk.
    const totalRow = await one<{ t: number }>(
      `SELECT COALESCE(SUM(${discipline}), 0) AS t FROM quote_shots WHERE quote_id = ?`,
      [quoteId],
    );
    const total = totalRow?.t ?? 0;
    const existing = await one<{ id: number }>(
      "SELECT id FROM quote_items WHERE quote_id = ? AND UPPER(class) = UPPER(?) LIMIT 1",
      [quoteId, lineClass],
    );
    if (existing) {
      await run("UPDATE quote_items SET units = ? WHERE id = ?", [total, existing.id]);
    } else {
      const orderRow = await one<{ m: number }>(
        "SELECT COALESCE(MAX(sort_order), -1) AS m FROM quote_items WHERE quote_id = ?",
        [quoteId],
      );
      const maxOrder = orderRow?.m ?? -1;
      await run(
        "INSERT INTO quote_items (quote_id, sort_order, class, units, unit) VALUES (?, ?, ?, ?, 'Day')",
        [quoteId, maxOrder + 1, lineClass, total],
      );
    }
    return total;
  },
};

// ---------- datasets ----------------------------------------------------------

export const datasetRepo = {
  async list() {
    return all<Dataset>("SELECT * FROM datasets ORDER BY created_at DESC");
  },
  async get(id: number) {
    return one<Dataset>("SELECT * FROM datasets WHERE id = ?", [id]);
  },
  async create(input: Omit<Dataset, "id" | "created_at">) {
    return run(
      "INSERT INTO datasets (name, description, date_column, value_column) VALUES (?, ?, ?, ?)",
      [input.name, input.description, input.date_column, input.value_column],
    );
  },
  async delete(id: number) {
    return run("DELETE FROM datasets WHERE id = ?", [id]);
  },
  async rows(datasetId: number) {
    return all<DatasetRow>(
      "SELECT * FROM dataset_rows WHERE dataset_id = ? ORDER BY point_date ASC",
      [datasetId],
    );
  },
  async insertRows(
    datasetId: number,
    rows: { point_date: string; value: number; meta?: string }[],
  ) {
    if (rows.length === 0) return;
    const stmts = rows.map((r) => ({
      sql: "INSERT INTO dataset_rows (dataset_id, point_date, value, meta) VALUES (?, ?, ?, ?)",
      args: [datasetId, r.point_date, r.value, r.meta ?? null] as InValue[],
    }));
    await batch(stmts);
  },
};

// re-export getDb for any caller that needs ad-hoc access
export { getDb };
