import { getDb } from "./db";
import type {
  AssignmentDetail,
  Dataset,
  DatasetRow,
  Employee,
  EmployeeWithSkills,
  Lead,
  Project,
  ProjectTaskDetail,
  Skill,
  TaskStatus,
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
  get(id: number) {
    return getDb().prepare("SELECT * FROM employees WHERE id = ?").get(id) as Employee | undefined;
  },
  skillsFor(employeeId: number) {
    return getDb()
      .prepare(
        `SELECT s.* FROM skills s
         JOIN employee_skills es ON es.skill_id = s.id
         WHERE es.employee_id = ? ORDER BY s.name ASC`,
      )
      .all(employeeId) as Skill[];
  },
  listWithSkills(): EmployeeWithSkills[] {
    const employees = employeeRepo.list();
    return employees.map((e) => ({ ...e, skills: employeeRepo.skillsFor(e.id) }));
  },
  addSkill(employeeId: number, skillId: number) {
    return getDb()
      .prepare("INSERT OR IGNORE INTO employee_skills (employee_id, skill_id) VALUES (?, ?)")
      .run(employeeId, skillId);
  },
  removeSkill(employeeId: number, skillId: number) {
    return getDb()
      .prepare("DELETE FROM employee_skills WHERE employee_id = ? AND skill_id = ?")
      .run(employeeId, skillId);
  },
};

export const skillRepo = {
  list() {
    return getDb().prepare("SELECT * FROM skills ORDER BY name ASC").all() as Skill[];
  },
  get(id: number) {
    return getDb().prepare("SELECT * FROM skills WHERE id = ?").get(id) as Skill | undefined;
  },
  findOrCreate(name: string): Skill {
    const trimmed = name.trim();
    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM skills WHERE name = ? COLLATE NOCASE")
      .get(trimmed) as Skill | undefined;
    if (existing) return existing;
    const result = db.prepare("INSERT INTO skills (name) VALUES (?)").run(trimmed);
    return skillRepo.get(Number(result.lastInsertRowid))!;
  },
  delete(id: number) {
    return getDb().prepare("DELETE FROM skills WHERE id = ?").run(id);
  },
  employeesWithSkill(skillId: number): Employee[] {
    return getDb()
      .prepare(
        `SELECT e.* FROM employees e
         JOIN employee_skills es ON es.employee_id = e.id
         WHERE es.skill_id = ? AND e.active = 1
         ORDER BY e.name ASC`,
      )
      .all(skillId) as Employee[];
  },
};

export const assignmentRepo = {
  listForProject(projectId: number): AssignmentDetail[] {
    return getDb()
      .prepare(
        `SELECT a.*, e.name AS employee_name, p.name AS project_name
         FROM assignments a
         JOIN employees e ON e.id = a.employee_id
         JOIN projects p ON p.id = a.project_id
         WHERE a.project_id = ?
         ORDER BY a.start_date ASC`,
      )
      .all(projectId) as AssignmentDetail[];
  },
  listForEmployee(employeeId: number): AssignmentDetail[] {
    return getDb()
      .prepare(
        `SELECT a.*, e.name AS employee_name, p.name AS project_name
         FROM assignments a
         JOIN employees e ON e.id = a.employee_id
         JOIN projects p ON p.id = a.project_id
         WHERE a.employee_id = ?
         ORDER BY a.start_date ASC`,
      )
      .all(employeeId) as AssignmentDetail[];
  },
  conflictsFor(
    employeeId: number,
    startDate: string,
    endDate: string,
    excludeId?: number,
  ): AssignmentDetail[] {
    const sql = `SELECT a.*, e.name AS employee_name, p.name AS project_name
                 FROM assignments a
                 JOIN employees e ON e.id = a.employee_id
                 JOIN projects p ON p.id = a.project_id
                 WHERE a.employee_id = @employee_id
                   AND date(a.start_date) <= date(@end_date)
                   AND date(a.end_date) >= date(@start_date)
                   ${excludeId ? "AND a.id != @exclude_id" : ""}`;
    return getDb()
      .prepare(sql)
      .all({
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        ...(excludeId ? { exclude_id: excludeId } : {}),
      }) as AssignmentDetail[];
  },
  availableEmployees(
    startDate: string,
    endDate: string,
    requiredSkillId?: number | null,
  ): Employee[] {
    const params: Record<string, string | number> = {
      start_date: startDate,
      end_date: endDate,
    };
    let skillJoin = "";
    let skillWhere = "";
    if (requiredSkillId) {
      skillJoin = "JOIN employee_skills es ON es.employee_id = e.id";
      skillWhere = "AND es.skill_id = @skill_id";
      params.skill_id = requiredSkillId;
    }
    const sql = `SELECT DISTINCT e.* FROM employees e
                 ${skillJoin}
                 WHERE e.active = 1
                   ${skillWhere}
                   AND e.id NOT IN (
                     SELECT employee_id FROM assignments
                     WHERE date(start_date) <= date(@end_date)
                       AND date(end_date) >= date(@start_date)
                   )
                 ORDER BY e.name ASC`;
    return getDb().prepare(sql).all(params) as Employee[];
  },
  create(input: {
    project_id: number;
    employee_id: number;
    start_date: string;
    end_date: string;
    role?: string | null;
    notes?: string | null;
  }): { ok: true; id: number } | { ok: false; error: string; conflicts: AssignmentDetail[] } {
    if (new Date(input.start_date) > new Date(input.end_date)) {
      return { ok: false, error: "Start date must be on or before end date.", conflicts: [] };
    }
    const conflicts = assignmentRepo.conflictsFor(
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
    const result = getDb()
      .prepare(
        `INSERT INTO assignments (project_id, employee_id, start_date, end_date, role, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.project_id,
        input.employee_id,
        input.start_date,
        input.end_date,
        input.role ?? null,
        input.notes ?? null,
      );
    return { ok: true, id: Number(result.lastInsertRowid) };
  },
  updateDates(
    id: number,
    startDate: string,
    endDate: string,
  ): { ok: true } | { ok: false; error: string; conflicts: AssignmentDetail[] } {
    if (new Date(startDate) > new Date(endDate)) {
      return { ok: false, error: "Start date must be on or before end date.", conflicts: [] };
    }
    const current = getDb()
      .prepare("SELECT * FROM assignments WHERE id = ?")
      .get(id) as { employee_id: number } | undefined;
    if (!current) return { ok: false, error: "Assignment not found.", conflicts: [] };
    const conflicts = assignmentRepo.conflictsFor(
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
    getDb()
      .prepare("UPDATE assignments SET start_date = ?, end_date = ? WHERE id = ?")
      .run(startDate, endDate, id);
    return { ok: true };
  },
  delete(id: number) {
    return getDb().prepare("DELETE FROM assignments WHERE id = ?").run(id);
  },
};

export const taskRepo = {
  listForProject(projectId: number): ProjectTaskDetail[] {
    return getDb()
      .prepare(
        `SELECT t.*, s.name AS required_skill_name, e.name AS assigned_employee_name
         FROM project_tasks t
         LEFT JOIN skills s ON s.id = t.required_skill_id
         LEFT JOIN employees e ON e.id = t.assigned_employee_id
         WHERE t.project_id = ?
         ORDER BY
           CASE t.status WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 WHEN 'blocked' THEN 2 ELSE 3 END,
           t.due_date IS NULL, t.due_date ASC, t.created_at DESC`,
      )
      .all(projectId) as ProjectTaskDetail[];
  },
  create(input: {
    project_id: number;
    description: string;
    required_skill_id?: number | null;
    assigned_employee_id?: number | null;
    status?: TaskStatus;
    due_date?: string | null;
    notes?: string | null;
  }) {
    return getDb()
      .prepare(
        `INSERT INTO project_tasks
           (project_id, description, required_skill_id, assigned_employee_id, status, due_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.project_id,
        input.description,
        input.required_skill_id ?? null,
        input.assigned_employee_id ?? null,
        input.status ?? "todo",
        input.due_date ?? null,
        input.notes ?? null,
      );
  },
  updateStatus(id: number, status: TaskStatus) {
    return getDb()
      .prepare("UPDATE project_tasks SET status = ? WHERE id = ?")
      .run(status, id);
  },
  delete(id: number) {
    return getDb().prepare("DELETE FROM project_tasks WHERE id = ?").run(id);
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
