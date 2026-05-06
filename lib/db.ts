import { createClient, type Client, type InStatement } from "@libsql/client";

// libSQL URL: prod = `libsql://...turso.io` with auth token, dev = local file URL.
const URL = process.env.TURSO_DATABASE_URL ?? "file:./data/climbon.db";
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

let _client: Client | null = null;
let _initPromise: Promise<Client> | null = null;

function rawClient(): Client {
  if (_client) return _client;
  _client = createClient({
    url: URL,
    authToken: AUTH_TOKEN,
  });
  return _client;
}

/**
 * Returns a libSQL client with the schema applied. Schema init runs once per
 * process (cached as a Promise) and every repo call awaits it. Idempotent
 * thanks to `CREATE TABLE IF NOT EXISTS`.
 */
export function getDb(): Promise<Client> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const c = rawClient();
    // libSQL does not honour multi-statement strings via `execute` like
    // better-sqlite3's `db.exec`. We split SCHEMA_SQL into statements and
    // run them as a batch (transaction).
    const statements = splitSql(SCHEMA_SQL);
    await c.batch(statements, "write");
    return c;
  })();
  return _initPromise;
}

/**
 * Run a single statement. Convenience wrapper that ensures schema first.
 */
export async function exec(stmt: InStatement) {
  const c = await getDb();
  return c.execute(stmt);
}

/**
 * Run many statements as a transaction (write batch).
 */
export async function batch(stmts: InStatement[]) {
  const c = await getDb();
  return c.batch(stmts, "write");
}

/**
 * Test/dev helper — drops every table and reinitialises.
 */
export async function resetDb() {
  const c = rawClient();
  const drops = [
    "DROP TABLE IF EXISTS quote_shots",
    "DROP TABLE IF EXISTS quote_items",
    "DROP TABLE IF EXISTS quotes",
    "DROP TABLE IF EXISTS project_tasks",
    "DROP TABLE IF EXISTS assignments",
    "DROP TABLE IF EXISTS employee_skills",
    "DROP TABLE IF EXISTS skills",
    "DROP TABLE IF EXISTS dataset_rows",
    "DROP TABLE IF EXISTS datasets",
    "DROP TABLE IF EXISTS lead_notes",
    "DROP TABLE IF EXISTS leads",
    "DROP TABLE IF EXISTS employees",
    "DROP TABLE IF EXISTS projects",
    "DROP TABLE IF EXISTS transactions",
  ];
  await c.batch(drops, "write");
  _initPromise = null;
  await getDb();
}

function splitSql(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client TEXT,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','on_hold','completed','cancelled')),
    budget REAL DEFAULT 0,
    start_date TEXT,
    due_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_on TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income','expense')),
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    project_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    source TEXT,
    stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new','contacted','qualified','proposal','won','lost')),
    estimated_value REAL DEFAULT 0,
    next_action TEXT,
    next_action_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lead_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    phone TEXT,
    employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time','part_time','contractor')),
    salary REAL DEFAULT 0,
    start_date TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    date_column TEXT NOT NULL,
    value_column TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dataset_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    point_date TEXT NOT NULL,
    value REAL NOT NULL,
    meta TEXT,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS employee_skills (
    employee_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    PRIMARY KEY (employee_id, skill_id),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    role TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CHECK (date(start_date) <= date(end_date))
  );

  CREATE TABLE IF NOT EXISTS project_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    required_skill_id INTEGER,
    assigned_employee_id INTEGER,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','blocked')),
    due_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (required_skill_id) REFERENCES skills(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_employee_id) REFERENCES employees(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    version REAL NOT NULL DEFAULT 1.0,
    quote_date TEXT,
    client_product TEXT,
    primary_contact TEXT,
    producer TEXT,
    producer_title TEXT DEFAULT 'Executive Producer',
    director TEXT,
    agency TEXT,
    agency_contact TEXT,
    production_company TEXT DEFAULT 'T&DA',
    prod_company_producer TEXT,
    tda_location TEXT DEFAULT 'Sydney',
    discount_rate REAL NOT NULL DEFAULT 0,
    overhead_rate REAL NOT NULL DEFAULT 936,
    cover_letter_intro TEXT,
    cover_letter_exclusions TEXT,
    licence_territory TEXT,
    licence_term TEXT,
    licence_use TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','declined')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quote_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    class TEXT NOT NULL,
    units REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'Day',
    resource_rate REAL NOT NULL DEFAULT 0,
    overhead_rate REAL NOT NULL DEFAULT 0,
    room_rate REAL NOT NULL DEFAULT 0,
    quoted_rate_override REAL,
    notes TEXT,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quote_shots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    shot_code TEXT,
    board_ref TEXT,
    production_notes TEXT,
    vfx_notes TEXT,
    design_mogfx REAL NOT NULL DEFAULT 0,
    concept_art REAL NOT NULL DEFAULT 0,
    anim_2d REAL NOT NULL DEFAULT 0,
    dmp REAL NOT NULL DEFAULT 0,
    dev REAL NOT NULL DEFAULT 0,
    previz REAL NOT NULL DEFAULT 0,
    layout REAL NOT NULL DEFAULT 0,
    mod REAL NOT NULL DEFAULT 0,
    rig REAL NOT NULL DEFAULT 0,
    face_swap REAL NOT NULL DEFAULT 0,
    anim REAL NOT NULL DEFAULT 0,
    tex_shad REAL NOT NULL DEFAULT 0,
    fx_td REAL NOT NULL DEFAULT 0,
    lookdev REAL NOT NULL DEFAULT 0,
    l_r REAL NOT NULL DEFAULT 0,
    roto_track REAL NOT NULL DEFAULT 0,
    lead_nuke REAL NOT NULL DEFAULT 0,
    nuke REAL NOT NULL DEFAULT 0,
    online REAL NOT NULL DEFAULT 0,
    sound REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_quotes_project ON quotes(project_id);
  CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_quote_shots_quote ON quote_shots(quote_id, sort_order);

  CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(occurred_on);
  CREATE INDEX IF NOT EXISTS idx_tx_project ON transactions(project_id);
  CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
  CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_dataset_rows ON dataset_rows(dataset_id, point_date);
  CREATE INDEX IF NOT EXISTS idx_assign_emp ON assignments(employee_id, start_date, end_date);
  CREATE INDEX IF NOT EXISTS idx_assign_proj ON assignments(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_proj ON project_tasks(project_id);
`;
