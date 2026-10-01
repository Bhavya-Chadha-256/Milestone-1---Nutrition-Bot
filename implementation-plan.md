# Implementation Plan — Milestone 1 Nutrition Bot

> **Stack:** Next.js 14 (App Router) · Groq (`openai/gpt-oss-120b` or `qwen/qwen3-27b`) · SQLite (better-sqlite3) · Vercel
> **Goal:** A deployed, scope-enforced nutrition chatbot with structured output and a recorded failure log.

---

## Phase Overview

| Phase | Name | Deliverable |
|-------|------|-------------|
| 0 | Project Scaffold | Repo + Next.js app + env wired |
| 1 | Database Setup | SQLite DB file + tables initialised |
| 2 | Backend Core | `/api/chat` endpoint working end-to-end |
| 3 | Scope Guard | Blocked queries never reach the model |
| 4 | Frontend UI | Chat panel + sources panel rendered |
| 5 | System Prompt | Prompt written, tuned, tested |
| 6 | Integration | Frontend ↔ Backend fully wired |
| 7 | Deploy | Live public URL on Vercel |
| 8 | Failure Log | 10 questions run and recorded |

---

## Phase 0 — Project Scaffold

**Goal:** Working Next.js repo with all dependencies installed and environment variables configured.

### Steps

**0.1 — Initialise the repo**
```bash
mkdir milestone-1-nutrition-bot && cd milestone-1-nutrition-bot
npx create-next-app@latest . \
  --typescript \
  --eslint \
  --tailwind=false \
  --src-dir=false \
  --app \
  --import-alias="@/*"
git init && git add . && git commit -m "chore: init Next.js app"
```

**0.2 — Install dependencies**
```bash
npm install groq-sdk better-sqlite3 zod uuid
npm install -D @types/uuid @types/better-sqlite3
npm install-scripts approve better-sqlite3
```

**0.3 — Create `.env.local`**
```bash
# .env.local
GROQ_API_KEY=gsk_...
SQLITE_DB_PATH=./nutrition-bot.db
```

**0.4 — Create directory skeleton**
```bash
mkdir -p app/api/chat components lib types failure-log
touch lib/groq.ts lib/schema.ts lib/scopeGuard.ts lib/systemPrompt.ts lib/db.ts
touch types/chat.ts
touch failure-log/questions.md
```

**0.5 — Push to GitHub**
```bash
git remote add origin https://github.com/<you>/milestone-1-nutrition-bot.git
git push -u origin main
```

### Exit Criteria
- `npm run dev` starts without errors
- `.env.local` has `GROQ_API_KEY` and `SQLITE_DB_PATH`
- Repo is pushed to GitHub

---

## Phase 1 — Database Setup

**Goal:** SQLite database file created with all three tables, accessible from the app via `better-sqlite3`.

### Steps

**1.1 — Install and approve better-sqlite3**
```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
npm install-scripts approve better-sqlite3
```

**1.2 — Create `lib/db.ts`**

```ts
// lib/db.ts
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.SQLITE_DB_PATH ?? "./nutrition-bot.db";

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(path.resolve(DB_PATH));
    _db.pragma("journal_mode = WAL");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
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

export function getHistory(sessionId: string): Array<{ role: string; content: string }> {
  const db = getDb();
  return db
    .prepare(`SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 20`)
    .all(sessionId) as Array<{ role: string; content: string }>;
}

export function saveMessages(sessionId: string, userText: string, assistantContent: object) {
  const db = getDb();
  const insert = db.prepare("INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)");
  db.transaction(() => {
    insert.run(crypto.randomUUID(), sessionId, "user", JSON.stringify({ text: userText }));
    insert.run(crypto.randomUUID(), sessionId, "assistant", JSON.stringify(assistantContent));
  })();
}
```

**1.3 — Smoke test**
```ts
// Quick test in a /api/db-test route (delete after confirming)
import { createSession, getHistory } from "@/lib/db";
const id = createSession();
console.log("Session created:", id);
console.log("History:", getHistory(id)); // []
```

### Exit Criteria
- All three tables are created in `nutrition-bot.db` on first server start
- `createSession()` returns a UUID without error
- `getHistory()` returns an empty array for a new session
- DB file appears at `SQLITE_DB_PATH`

---

## Phase 2 — Backend Core

**Goal:** `POST /api/chat` receives a message, calls the Groq model with structured output (JSON mode), validates the schema, persists to SQLite, and returns `{ session_id, answer, claims }`.

### Steps

**2.1 — Define TypeScript types (`types/chat.ts`)**

```ts
export type Claim = { claim_text: string; source: null; };
export type ChatResponse = { answer: string; claims: Claim[]; };
export type ApiResponse = { session_id: string; } & ChatResponse;
```

**2.2 — Define Zod schema (`lib/schema.ts`)**

```ts
import { z } from "zod";
export const ClaimSchema = z.object({ claim_text: z.string().min(1), source: z.null() });
export const ChatResponseSchema = z.object({ answer: z.string().min(1), claims: z.array(ClaimSchema) });
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
```

**2.3 — Write the Groq client (`lib/groq.ts`)**

Uses `response_format: { type: "json_object" }` and validates output with Zod.
Primary model: `openai/gpt-oss-120b`. Fallback: `qwen/qwen3-27b`.

**2.4 — Write the route handler (`app/api/chat/route.ts`)**

Flow: validate input → scope guard → resolve session → fetch history → call model → persist → respond.

**2.5 — Manual smoke test**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": null, "message": "What is vitamin C?"}'
```

Expected: `{ session_id: "uuid...", answer: "...", claims: [{claim_text: "...", source: null}] }`

### Exit Criteria
- Endpoint returns valid `{ session_id, answer, claims }` for a nutrition question
- Schema validation throws 500 if model output is wrong
- Messages are persisted to the SQLite `messages` table

---

## Phase 3 — Scope Guard

**Goal:** All blocked query types are rejected in code before the model is called.

### Steps

**3.1 — Implement `lib/scopeGuard.ts`**

Regex patterns blocking: calorie targets, weight recommendations, medical advice.

**3.2 — Test the guard directly**
```bash
npx tsx lib/scopeGuard.test.ts
```

**3.3 — Test via curl**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": null, "message": "What is my daily calorie target?"}'
```

**3.4 — Sideways attack testing**

Manually test rephrased variants. Add patterns if any slip through.

### Exit Criteria
- All 7 test queries are blocked
- All 4 pass-through queries reach the model
- Declined response returns in < 50ms (no model call)

---

## Phase 4 — Frontend UI

**Goal:** A styled chat interface with a message list, input box, and an empty sources panel wired to receive `claims[]`.

### Steps

**4.1** — Define shared types in `types/chat.ts` (add `Message` type)
**4.2** — Build `components/SourcesPanel.tsx` — renders claim stubs
**4.3** — Build `components/MessageBubble.tsx` — user right, assistant left
**4.4** — Build `components/MessageList.tsx` — scrollable, auto-scrolls to bottom
**4.5** — Build `components/InputBox.tsx` — Enter to send, disabled while loading
**4.6** — Build `components/ChatShell.tsx` — two-column layout, holds all state
**4.7** — Wire into `app/page.tsx`
**4.8** — Style `app/globals.css`: dark mode, teal accent (#00c896), Inter font

### Exit Criteria
- `npm run dev` renders the two-panel UI without errors
- Sending a message shows an optimistic user bubble immediately
- Sources panel renders "No sources yet" placeholder
- UI is responsive

---

## Phase 5 — System Prompt

**Goal:** A well-tuned system prompt that produces consistent, appropriately-scoped answers.

### Steps

**5.1** — Write initial prompt in `lib/systemPrompt.ts`
**5.2** — Define fixed test question set (10 questions)
**5.3** — Iterate: run 10 questions, flag issues, adjust, re-run
**5.4** — Lock the prompt before the failure log run

### Exit Criteria
- All 10 fixed questions return well-scoped, factual answers
- Numbers are consistent across 3 runs of the same question
- Declined topics are declined by the prompt (second layer behind scope guard)

---

## Phase 6 — Integration

**Goal:** Frontend and backend fully wired. Session persistence across page refreshes.

### Steps

**6.1** — Wire `POST /api/chat` fetch in `ChatShell`
**6.2** — Pass last assistant message's `claims[]` to `SourcesPanel`
**6.3** — Persist `sessionId` to `localStorage`
**6.4** — Implement error states (network error, 500)
**6.5** — End-to-end test checklist

### Exit Criteria
- Full conversation flow works without errors
- Claims render in sources panel for every assistant message
- Session ID is stable across page refresh
- Blocked queries never trigger a SQLite write for an assistant row

---

## Phase 7 — Deploy

**Goal:** App is live at a public URL on Vercel.

> **SQLite note:** `better-sqlite3` writes to a local file. On Vercel, set `SQLITE_DB_PATH=/tmp/nutrition-bot.db` for a writable path. Data will not persist across cold starts — acceptable for demo/failure-log purposes. For persistent storage, swap to Turso/LibSQL (same API surface).

### Steps

**7.1** — Push final code
**7.2** — Deploy via `npx vercel --prod` or Vercel dashboard
**7.3** — Add env vars: `GROQ_API_KEY`, `SQLITE_DB_PATH=/tmp/nutrition-bot.db`
**7.4** — Post-deploy smoke tests

### Exit Criteria
- App is accessible at a public HTTPS URL
- Both API smoke tests pass on production
- No build errors or runtime crashes in Vercel logs

---

## Phase 8 — Failure Log

**Goal:** Run 10 prepared questions, record every failure type, produce a grouped failure report.

### 10 Questions

| # | Question | Category |
|---|----------|----------|
| 1 | How much protein does an adult need per day? | Nutrient requirements |
| 2 | What is the recommended daily intake of vitamin D? | Nutrient requirements |
| 3 | How much iron does a pregnant woman need? | Nutrient requirements |
| 4 | How long can cooked rice sit at room temperature? | Food safety & storage |
| 5 | Is it safe to refreeze meat that has been thawed? | Food safety & storage |
| 6 | How should raw chicken be stored in the fridge? | Food safety & storage |
| 7 | Does boiling vegetables destroy their nutrients? | Cooking methods |
| 8 | What happens to olive oil when it is heated past its smoke point? | Cooking methods |
| 9 | Is coffee good or bad for you? | No clear answer |
| 10 | Are eggs good or bad for cardiovascular health? | No clear answer |

### Failure Types
- Unsupported claim
- Shifting number (across 3 runs)
- Phantom source
- Should have declined
- Hedged into uselessness

### Exit Criteria
- All 10 questions run (3 times each = 30 runs)
- Every failure recorded and categorised
- Grouped summary table filled in
- `failure-log/questions.md` committed
- Nothing patched or hardcoded around

---

## Final Submission Checklist

```
Infrastructure
  [ ] SQLite DB initialised and tables verified locally
  [ ] App deployed at a public Vercel URL
  [ ] GitHub repo is public (or shared)

Backend
  [ ] POST /api/chat returns { session_id, answer, claims[] }
  [ ] Every response validates against Zod schema
  [ ] Schema parse failure returns 500, not a broken 200
  [ ] Model calls happen server-side only (GROQ_API_KEY never exposed to client)

Scope Guard
  [ ] Calorie targets → declined
  [ ] Weight recommendations → declined
  [ ] Medical advice → declined
  [ ] Sideways/rephrased variants → also declined
  [ ] Guard lives in code (not only in the prompt)

Schema
  [ ] claims[] is present on every response
  [ ] source is null on every claim
  [ ] No claim bundles multiple facts

Frontend
  [ ] Message list renders correctly
  [ ] Sources panel is present and receives claims[]
  [ ] Input is disabled while loading
  [ ] Error states are user-friendly

Failure Log
  [ ] 10 questions across 4 categories
  [ ] 3 runs per question
  [ ] All failures recorded and categorised
  [ ] Grouped summary table with counts
  [ ] Nothing patched or hardcoded around
```

---

## What This Unlocks for Milestone 2

| M1 Component | M2 Extension | Change Required |
|---|---|---|
| `source: null` in schema | `source: string or null` | 1-line Zod change |
| Empty `SourcesPanel` | Renders source links | UI only, no contract change |
| `callModel()` in `groq.ts` | Retrieval step inserted before model call | New function, same interface |
| `messages` table in SQLite | `documents` table added | Additive migration only |
| Failure log baseline | M2 re-runs same 10 questions | Direct comparison |

## Phase 2 Implementation
- **Step 1:** Extract the monolithic React component from the Stitch prototype into `StitchApp.tsx`.
- **Step 2:** Refactor the `handleSendMessage` function to interact directly with the `/api/chat` route instead of static mocks.
- **Step 3:** Inject global styles (colors, animations, scrollbars) required by the Stitch prototype into `globals.css`.
- **Step 4:** Integrate the new `StitchApp` component into the main `page.tsx` route.
