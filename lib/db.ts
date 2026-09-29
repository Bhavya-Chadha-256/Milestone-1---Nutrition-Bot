// lib/db.ts
// Phase 1 — SQLite database layer via better-sqlite3
// All operations are synchronous (better-sqlite3 API).

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.SQLITE_DB_PATH ?? "./nutrition-bot.db";

// Singleton connection — one per server process
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(path.resolve(/*turbopackIgnore: true*/ DB_PATH));
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

// ── Schema init (idempotent) ────────────────────────────────

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id           TEXT PRIMARY KEY,
      session_id   TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role         TEXT CHECK(role IN ('user','assistant')) NOT NULL,
      content      TEXT NOT NULL,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session
      ON messages(session_id, created_at);

    CREATE TABLE IF NOT EXISTS failure_log (
      id            TEXT PRIMARY KEY,
      question      TEXT NOT NULL,
      category      TEXT NOT NULL,
      response_json TEXT,
      failure_types TEXT,
      run_at        TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ── Session helpers ─────────────────────────────────────────

export function createSession(): string {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO sessions (id) VALUES (?)").run(id);
  return id;
}

export function sessionExists(id: string): boolean {
  const db = getDb();
  return db.prepare("SELECT 1 FROM sessions WHERE id = ?").get(id) !== undefined;
}

// ── Message helpers ─────────────────────────────────────────

export interface RawMessage {
  role: string;
  content: string; // JSON string
}

export function getHistory(sessionId: string): RawMessage[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT role, content
       FROM messages
       WHERE session_id = ?
       ORDER BY created_at ASC
       LIMIT 20`
    )
    .all(sessionId) as RawMessage[];
}

export function saveMessages(
  sessionId: string,
  userText: string,
  assistantContent: object
): void {
  const db = getDb();
  const insert = db.prepare(
    "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)"
  );

  db.transaction(() => {
    insert.run(
      crypto.randomUUID(),
      sessionId,
      "user",
      JSON.stringify({ text: userText })
    );
    insert.run(
      crypto.randomUUID(),
      sessionId,
      "assistant",
      JSON.stringify(assistantContent)
    );
  })();
}

// ── Failure Log Helpers ─────────────────────────────────────

export function logFailure(
  question: string,
  category: string,
  responseJson: string,
  failureTypes: string[]
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO failure_log (id, question, category, response_json, failure_types) VALUES (?, ?, ?, ?, ?)"
  ).run(crypto.randomUUID(), question, category, responseJson, JSON.stringify(failureTypes));
}

export function getFailureLogs() {
  const db = getDb();
  return db.prepare("SELECT * FROM failure_log ORDER BY run_at DESC").all();
}

export function getAllQueries() {
  const db = getDb();
  const messages = db.prepare("SELECT * FROM messages ORDER BY created_at ASC").all();
  const queries = [];
  
  let lastUser: any = null;
  for (const m of messages as any[]) {
    try {
      const content = JSON.parse(m.content);
      if (m.role === 'user') {
        lastUser = { ...m, content };
      } else if (m.role === 'assistant' && lastUser && lastUser.session_id === m.session_id) {
        
        let assignedCategory = "All Categories";
        const lower = lastUser.content.text.toLowerCase();
        if (lower.includes("fasting") || lower.includes("16:8") || lower.includes("intermittent") || lower.includes("sweetener") || lower.includes("diet soda") || lower.includes("seed oil") || lower.includes("breakfast") || lower.includes("coffee") || lower.includes("egg") || lower.includes("cholesterol") || lower.includes("debate") || lower.includes("good or bad")) {
          assignedCategory = "Questions where nobody has a clear answer";
        } else if (lower.includes("steam") || lower.includes("boil") || lower.includes("fry") || lower.includes("smoke point") || lower.includes("microwave") || lower.includes("cook") || lower.includes("sous-vide") || lower.includes("reheat") || lower.includes("fridge") || lower.includes("freeze") || lower.includes("leftover") || lower.includes("wash") || lower.includes("clean") || lower.includes("bacteria") || lower.includes("salmonella")) {
          assignedCategory = "Food safety and storage";
        } else {
          assignedCategory = "Nutrient requirements";
        }

        queries.push({
          id: m.id,
          code: `LOG-${m.id.substring(0,4).toUpperCase()}`,
          sessionId: m.session_id,
          targetMsgId: lastUser.id,
          question: lastUser.content.text,
          answer: content.answer || "Declined",
          category: assignedCategory,
          claimsCount: content.claims ? content.claims.length : 0,
          timestamp: m.created_at,
          status: "Verified Response",
          tags: ["Global Database", assignedCategory.split(" ")[0]]
        });
        lastUser = null;
      }
    } catch(e) {}
  }
  return queries.reverse();
}
