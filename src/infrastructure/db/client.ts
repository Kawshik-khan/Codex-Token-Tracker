import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { getDatabasePath } from "../config.js";
import * as schema from "./schema.js";

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

export function openSqlite(path = getDatabasePath()): Database.Database {
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      project_path TEXT NOT NULL,
      project_name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      timestamp INTEGER NOT NULL,
      model TEXT NOT NULL,
      project_path TEXT NOT NULL,
      project_name TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cached_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      cost REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monthly_limit INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_project_idx ON sessions(project_name);
    CREATE INDEX IF NOT EXISTS sessions_started_idx ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS requests_session_idx ON requests(session_id);
    CREATE INDEX IF NOT EXISTS requests_timestamp_idx ON requests(timestamp);
    CREATE INDEX IF NOT EXISTS requests_project_timestamp_idx ON requests(project_name, timestamp);
    CREATE INDEX IF NOT EXISTS requests_model_idx ON requests(model);
  `);
  return sqlite;
}

export function openDb(path = getDatabasePath()): DbClient {
  return drizzle(openSqlite(path), { schema });
}
