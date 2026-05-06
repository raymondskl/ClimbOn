// Initialise & seed the database (libSQL).
// Defaults to the local file at ./data/climbon.db. Set TURSO_DATABASE_URL +
// TURSO_AUTH_TOKEN to seed a remote Turso DB instead.
//
//   node scripts/init-db.mjs
//   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/init-db.mjs
//
// Idempotent — only seeds demo data when the projects table is empty.

import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

const URL = process.env.TURSO_DATABASE_URL ?? "file:./data/climbon.db";
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (URL.startsWith("file:")) {
  const file = URL.replace(/^file:/, "");
  const dir = path.dirname(path.resolve(file));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const db = createClient({ url: URL, authToken: AUTH_TOKEN });

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    budget REAL DEFAULT 0,
    start_date TEXT,
    due_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_on TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    project_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, source TEXT,
    stage TEXT NOT NULL DEFAULT 'new',
    estimated_value REAL DEFAULT 0,
    next_action TEXT, next_action_date TEXT, notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, role TEXT, email TEXT, phone TEXT,
    employment_type TEXT DEFAULT 'full_time',
    salary REAL DEFAULT 0, start_date TEXT, active INTEGER NOT NULL DEFAULT 1,
    notes TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, description TEXT,
    date_column TEXT NOT NULL, value_column TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS dataset_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    point_date TEXT NOT NULL, value REAL NOT NULL, meta TEXT
  )`,
];

await db.batch(SCHEMA, "write");

const countRow = (await db.execute("SELECT COUNT(*) AS n FROM projects")).rows[0];
const count = Number(countRow?.n ?? 0);

if (count === 0) {
  console.log("Seeding demo data...");

  async function insert(sql, args) {
    const r = await db.execute({ sql, args });
    return Number(r.lastInsertRowid ?? 0);
  }

  const p1 = await insert(
    "INSERT INTO projects (name, client, status, budget, start_date, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["Website Redesign", "Acme Co", "active", 18000, "2026-02-01", "2026-05-15", "Phase 2 starts April."],
  );
  const p2 = await insert(
    "INSERT INTO projects (name, client, status, budget, start_date, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["Mobile App MVP", "Northwind", "active", 42000, "2026-01-10", "2026-07-30", null],
  );
  await insert(
    "INSERT INTO projects (name, client, status, budget, start_date, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["Brand Refresh", "Globex", "planned", 8000, "2026-05-01", "2026-06-30", null],
  );

  const txStmts = [];
  const months = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"];
  months.forEach((m, i) => {
    txStmts.push({
      sql: "INSERT INTO transactions (occurred_on, type, category, amount, description, project_id) VALUES (?, ?, ?, ?, ?, ?)",
      args: [`${m}-05`, "income", "Services", 12000 + i * 1500, "Client retainer", p1],
    });
    txStmts.push({
      sql: "INSERT INTO transactions (occurred_on, type, category, amount, description, project_id) VALUES (?, ?, ?, ?, ?, ?)",
      args: [`${m}-20`, "income", "Services", 8000 + i * 800, "Milestone payment", p2],
    });
    txStmts.push({
      sql: "INSERT INTO transactions (occurred_on, type, category, amount, description, project_id) VALUES (?, ?, ?, ?, ?, ?)",
      args: [`${m}-01`, "expense", "Payroll", 14000, "Monthly payroll", null],
    });
    txStmts.push({
      sql: "INSERT INTO transactions (occurred_on, type, category, amount, description, project_id) VALUES (?, ?, ?, ?, ?, ?)",
      args: [`${m}-03`, "expense", "Software", 480 + i * 20, "SaaS subscriptions", null],
    });
    txStmts.push({
      sql: "INSERT INTO transactions (occurred_on, type, category, amount, description, project_id) VALUES (?, ?, ?, ?, ?, ?)",
      args: [`${m}-15`, "expense", "Rent", 2200, "Office rent", null],
    });
  });
  await db.batch(txStmts, "write");

  const leadStmts = [
    {
      sql: "INSERT INTO leads (name, company, email, stage, estimated_value, source, next_action, next_action_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["Jane Miller", "Initech", "jane@initech.co", "qualified", 25000, "Referral", "Send proposal", "2026-04-28", null],
    },
    {
      sql: "INSERT INTO leads (name, company, email, stage, estimated_value, source, next_action, next_action_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["Arun Patel", "Umbrella", "arun@umbrella.io", "contacted", 60000, "Inbound", "Discovery call", "2026-04-26", null],
    },
    {
      sql: "INSERT INTO leads (name, company, email, stage, estimated_value, source, next_action, next_action_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["Sam Chen", "Hooli", "sam@hooli.com", "proposal", 40000, "Outbound", "Follow up", "2026-04-30", null],
    },
    {
      sql: "INSERT INTO leads (name, company, email, stage, estimated_value, source, next_action, next_action_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["Priya Rao", "Pied Piper", "priya@pp.xyz", "new", 15000, "LinkedIn", "Intro email", "2026-04-25", null],
    },
  ];
  await db.batch(leadStmts, "write");

  const empStmts = [
    {
      sql: "INSERT INTO employees (name, role, email, employment_type, salary, start_date, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: ["Alex Rivera", "Lead Engineer", "alex@climbon.local", "full_time", 135000, "2023-06-01", 1],
    },
    {
      sql: "INSERT INTO employees (name, role, email, employment_type, salary, start_date, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: ["Morgan Lee", "Designer", "morgan@climbon.local", "full_time", 95000, "2024-02-15", 1],
    },
    {
      sql: "INSERT INTO employees (name, role, email, employment_type, salary, start_date, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: ["Taylor Kim", "Ops / PM", "taylor@climbon.local", "part_time", 48000, "2024-09-01", 1],
    },
  ];
  await db.batch(empStmts, "write");
}

console.log("Database ready at", URL);
