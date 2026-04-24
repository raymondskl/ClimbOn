import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "climbon.db");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    budget REAL DEFAULT 0,
    start_date TEXT,
    due_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_on TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    project_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, source TEXT,
    stage TEXT NOT NULL DEFAULT 'new',
    estimated_value REAL DEFAULT 0,
    next_action TEXT, next_action_date TEXT, notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, role TEXT, email TEXT, phone TEXT,
    employment_type TEXT DEFAULT 'full_time',
    salary REAL DEFAULT 0, start_date TEXT, active INTEGER NOT NULL DEFAULT 1,
    notes TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, description TEXT,
    date_column TEXT NOT NULL, value_column TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS dataset_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    point_date TEXT NOT NULL, value REAL NOT NULL, meta TEXT
  );
`);

const count = db.prepare("SELECT COUNT(*) AS n FROM projects").get().n;
if (count === 0) {
  console.log("Seeding demo data...");
  const insertProject = db.prepare(
    "INSERT INTO projects (name, client, status, budget, start_date, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const p1 = insertProject.run("Website Redesign", "Acme Co", "active", 18000, "2026-02-01", "2026-05-15", "Phase 2 starts April.").lastInsertRowid;
  const p2 = insertProject.run("Mobile App MVP", "Northwind", "active", 42000, "2026-01-10", "2026-07-30", null).lastInsertRowid;
  const p3 = insertProject.run("Brand Refresh", "Globex", "planned", 8000, "2026-05-01", "2026-06-30", null).lastInsertRowid;

  const insertTx = db.prepare(
    "INSERT INTO transactions (occurred_on, type, category, amount, description, project_id) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const months = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"];
  months.forEach((m, i) => {
    insertTx.run(`${m}-05`, "income", "Services", 12000 + i * 1500, "Client retainer", p1);
    insertTx.run(`${m}-20`, "income", "Services", 8000 + i * 800, "Milestone payment", p2);
    insertTx.run(`${m}-01`, "expense", "Payroll", 14000, "Monthly payroll", null);
    insertTx.run(`${m}-03`, "expense", "Software", 480 + i * 20, "SaaS subscriptions", null);
    insertTx.run(`${m}-15`, "expense", "Rent", 2200, "Office rent", null);
  });

  const insertLead = db.prepare(
    "INSERT INTO leads (name, company, email, stage, estimated_value, source, next_action, next_action_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  insertLead.run("Jane Miller", "Initech", "jane@initech.co", "qualified", 25000, "Referral", "Send proposal", "2026-04-28", null);
  insertLead.run("Arun Patel", "Umbrella", "arun@umbrella.io", "contacted", 60000, "Inbound", "Discovery call", "2026-04-26", null);
  insertLead.run("Sam Chen", "Hooli", "sam@hooli.com", "proposal", 40000, "Outbound", "Follow up", "2026-04-30", null);
  insertLead.run("Priya Rao", "Pied Piper", "priya@pp.xyz", "new", 15000, "LinkedIn", "Intro email", "2026-04-25", null);

  const insertEmp = db.prepare(
    "INSERT INTO employees (name, role, email, employment_type, salary, start_date, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  insertEmp.run("Alex Rivera", "Lead Engineer", "alex@climbon.local", "full_time", 135000, "2023-06-01", 1);
  insertEmp.run("Morgan Lee", "Designer", "morgan@climbon.local", "full_time", 95000, "2024-02-15", 1);
  insertEmp.run("Taylor Kim", "Ops / PM", "taylor@climbon.local", "part_time", 48000, "2024-09-01", 1);
}

console.log("Database ready at", DB_PATH);
