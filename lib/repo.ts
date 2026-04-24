import { getDb } from "./db";
import type {
  Dataset,
  DatasetRow,
  Employee,
  Lead,
  Project,
  Transaction,
} from "./types";

export const txRepo = {
  list(filter?: { type?: "income" | "expense"; from?: string; to?: string }) {
    const where: string[] = [];
    const params: Record<string, string> = {};
    if (filter?.type) {
      where.push("type = @type");
      params.type = filter.type;
    }
    if (filter?.from) {
      where.push("occurred_on >= @from");
      params.from = filter.from;
    }
    if (filter?.to) {
      where.push("occurred_on <= @to");
      params.to = filter.to;
    }
    const sql = `SELECT * FROM transactions ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY occurred_on DESC, id DESC`;
    return getDb().prepare(sql).all(params) as Transaction[];
  },
  create(input: {
    occurred_on: string;
    type: "income" | "expense";
    category: string;
    amount: number;
    description?: string | null;
    project_id?: number | null;
  }) {
    return getDb()
      .prepare(
        "INSERT INTO transactions (occurred_on, type, category, amount, description, project_id) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        input.occurred_on,
        input.type,
        input.category,
        input.amount,
        input.description ?? null,
        input.project_id ?? null,
      );
  },
  delete(id: number) {
    return getDb().prepare("DELETE FROM transactions WHERE id = ?").run(id);
  },
  monthlyTotals(limitMonths = 12): { month: string; income: number; expense: number; net: number }[] {
    const rows = getDb()
      .prepare(
        `SELECT substr(occurred_on,1,7) AS month,
                SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
         FROM transactions GROUP BY month ORDER BY month ASC`,
      )
      .all() as { month: string; income: number; expense: number }[];
    const trimmed = rows.slice(-limitMonths);
    return trimmed.map((r) => ({
      month: r.month,
      income: r.income ?? 0,
      expense: r.expense ?? 0,
      net: (r.income ?? 0) - (r.expense ?? 0),
    }));
  },
  categoryBreakdown(type: "income" | "expense"): { name: string; value: number }[] {
    return getDb()
      .prepare(
        "SELECT category AS name, SUM(amount) AS value FROM transactions WHERE type = ? GROUP BY category ORDER BY value DESC",
      )
      .all(type) as { name: string; value: number }[];
  },
  totals() {
    const row = getDb()
      .prepare(
        `SELECT
           SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
         FROM transactions`,
      )
      .get() as { income: number | null; expense: number | null };
    const income = row.income ?? 0;
    const expense = row.expense ?? 0;
    return { income, expense, net: income - expense };
  },
};

export const projectRepo = {
  list() {
    return getDb().prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as Project[];
  },
  listBrief() {
    return getDb().prepare("SELECT id, name FROM projects ORDER BY name ASC").all() as {
      id: number;
      name: string;
    }[];
  },
  get(id: number) {
    return getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
  },
  create(input: Omit<Project, "id" | "created_at">) {
    return getDb()
      .prepare(
        "INSERT INTO projects (name, client, status, budget, start_date, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        input.name,
        input.client,
        input.status,
        input.budget,
        input.start_date,
        input.due_date,
        input.notes,
      );
  },
  update(id: number, input: Partial<Omit<Project, "id" | "created_at">>) {
    const current = projectRepo.get(id);
    if (!current) return;
    const next = { ...current, ...input };
    getDb()
      .prepare(
        "UPDATE projects SET name=?, client=?, status=?, budget=?, start_date=?, due_date=?, notes=? WHERE id=?",
      )
      .run(
        next.name,
        next.client,
        next.status,
        next.budget,
        next.start_date,
        next.due_date,
        next.notes,
        id,
      );
  },
  delete(id: number) {
    return getDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
  },
  financialsFor(id: number) {
    const row = getDb()
      .prepare(
        `SELECT
           SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
         FROM transactions WHERE project_id = ?`,
      )
      .get(id) as { income: number | null; expense: number | null };
    const income = row.income ?? 0;
    const expense = row.expense ?? 0;
    return { income, expense, net: income - expense };
  },
};

export const leadRepo = {
  list() {
    return getDb().prepare("SELECT * FROM leads ORDER BY created_at DESC").all() as Lead[];
  },
  create(input: Omit<Lead, "id" | "created_at">) {
    return getDb()
      .prepare(
        "INSERT INTO leads (name, company, email, phone, source, stage, estimated_value, next_action, next_action_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
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
      );
  },
  updateStage(id: number, stage: Lead["stage"]) {
    return getDb().prepare("UPDATE leads SET stage = ? WHERE id = ?").run(stage, id);
  },
  delete(id: number) {
    return getDb().prepare("DELETE FROM leads WHERE id = ?").run(id);
  },
  pipelineStats() {
    return getDb()
      .prepare(
        "SELECT stage, COUNT(*) AS count, COALESCE(SUM(estimated_value),0) AS value FROM leads GROUP BY stage",
      )
      .all() as { stage: Lead["stage"]; count: number; value: number }[];
  },
};

export const employeeRepo = {
  list() {
    return getDb().prepare("SELECT * FROM employees ORDER BY active DESC, name ASC").all() as Employee[];
  },
  create(input: Omit<Employee, "id" | "created_at">) {
    return getDb()
      .prepare(
        "INSERT INTO employees (name, role, email, phone, employment_type, salary, start_date, active, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        input.name,
        input.role,
        input.email,
        input.phone,
        input.employment_type,
        input.salary,
        input.start_date,
        input.active,
        input.notes,
      );
  },
  toggleActive(id: number) {
    return getDb()
      .prepare("UPDATE employees SET active = 1 - active WHERE id = ?")
      .run(id);
  },
  delete(id: number) {
    return getDb().prepare("DELETE FROM employees WHERE id = ?").run(id);
  },
  totalAnnualSalary() {
    const row = getDb()
      .prepare("SELECT COALESCE(SUM(salary),0) AS total FROM employees WHERE active = 1")
      .get() as { total: number };
    return row.total;
  },
};

export const datasetRepo = {
  list() {
    return getDb().prepare("SELECT * FROM datasets ORDER BY created_at DESC").all() as Dataset[];
  },
  get(id: number) {
    return getDb().prepare("SELECT * FROM datasets WHERE id = ?").get(id) as Dataset | undefined;
  },
  create(input: Omit<Dataset, "id" | "created_at">) {
    return getDb()
      .prepare(
        "INSERT INTO datasets (name, description, date_column, value_column) VALUES (?, ?, ?, ?)",
      )
      .run(input.name, input.description, input.date_column, input.value_column);
  },
  delete(id: number) {
    return getDb().prepare("DELETE FROM datasets WHERE id = ?").run(id);
  },
  rows(datasetId: number) {
    return getDb()
      .prepare("SELECT * FROM dataset_rows WHERE dataset_id = ? ORDER BY point_date ASC")
      .all(datasetId) as DatasetRow[];
  },
  insertRows(datasetId: number, rows: { point_date: string; value: number; meta?: string }[]) {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO dataset_rows (dataset_id, point_date, value, meta) VALUES (?, ?, ?, ?)",
    );
    const tx = db.transaction((items: typeof rows) => {
      for (const r of items) stmt.run(datasetId, r.point_date, r.value, r.meta ?? null);
    });
    tx(rows);
  },
};
