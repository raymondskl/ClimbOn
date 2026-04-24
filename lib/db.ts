import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "climbon.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  _db = db;
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(occurred_on);
    CREATE INDEX IF NOT EXISTS idx_tx_project ON transactions(project_id);
    CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
    CREATE INDEX IF NOT EXISTS idx_dataset_rows ON dataset_rows(dataset_id, point_date);
  `);
}

export function resetDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
}
