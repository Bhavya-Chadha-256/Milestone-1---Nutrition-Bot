# Architecture — Milestone 1 Nutrition Bot

## Tech Stack Decision

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | **Next.js 14 (App Router)** | Full-stack capability, easy Vercel deploy, RSC for performance |
| Backend API | **Next.js Route Handlers** | Collocated with frontend, no separate server needed for M1 |
| Model | **Anthropic Claude (claude-3-5-haiku)** | Native structured output via tool use, fast, cheap |
| Storage | **Supabase (Postgres)** | Managed Postgres, free tier, ready for M2 retrieval layer |
| Deployment | **Vercel** | Native Next.js hosting, zero-config |

> **Why not FastAPI?** The problem statement permits Next.js as a full-stack solution. Keeping everything in one Next.js project reduces deployment complexity for Milestone 1. Milestone 2 can extract the backend to FastAPI if a dedicated Python retrieval layer is needed.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│                                                                 │
│  ┌──────────────────┐   ┌──────────────────────────────────┐   │
│  │   Chat Panel      │   │       Sources Panel (empty)      │   │
│  │                  │   │                                  │   │
│  │  [User message]  │   │  ┌──────────────────────────┐   │   │
│  │  [Bot message]   │   │  │  Claim 1   source: null  │   │   │
│  │  [Bot message]   │   │  │  Claim 2   source: null  │   │   │
│  │                  │   │  │  ...                     │   │   │
│  │  [input box]     │   │  └──────────────────────────┘   │   │
│  └────────┬─────────┘   └──────────────────────────────────┘   │
│           │ POST /api/chat                                      │
└───────────┼─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js Route Handler                         │
│                   /api/chat/route.ts                            │
│                                                                 │
│   1. Receive { session_id, message }                            │
│   2. Scope guard check (keyword + semantic filter)              │
│   3. Load conversation history from Supabase                    │
│   4. Build messages array with system prompt                    │
│   5. Call Anthropic API (structured output via tool_use)        │
│   6. Validate response against Zod schema                       │
│   7. Persist user + assistant messages to Supabase              │
│   8. Return { answer, claims[] }                                │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌─────────────────────────────────────┐
│   Anthropic API      │    │         Supabase (Postgres)         │
│                      │    │                                     │
│  claude-3-5-haiku    │    │  Table: sessions                    │
│  tool_use mode       │    │  Table: messages                    │
│  → structured JSON   │    │  Table: failure_log (for M1 audit)  │
└──────────────────────┘    └─────────────────────────────────────┘
```

---

## Project Directory Structure

```
milestone-1-nutrition-bot/
│
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout, fonts, metadata
│   ├── page.tsx                      # Home → renders ChatShell
│   └── api/
│       └── chat/
│           └── route.ts              # POST /api/chat (core endpoint)
│
├── components/
│   ├── ChatShell.tsx                 # Top-level layout: panel split
│   ├── MessageList.tsx               # Scrollable message history
│   ├── MessageBubble.tsx             # Individual message (user/bot)
│   ├── InputBox.tsx                  # Textarea + Send button
│   └── SourcesPanel.tsx              # Right panel (empty in M1, ready for M2)
│
├── lib/
│   ├── anthropic.ts                  # Anthropic client + structured call
│   ├── schema.ts                     # Zod schema for response validation
│   ├── scopeGuard.ts                 # Code-level scope enforcement
│   ├── systemPrompt.ts               # System prompt string
│   └── db.ts                         # Supabase client + query helpers
│
├── types/
│   └── chat.ts                       # Shared TypeScript types
│
├── failure-log/
│   └── questions.md                  # 10 test questions + recorded results
│
├── .env.local                        # ANTHROPIC_API_KEY, SUPABASE_URL, etc.
├── next.config.ts
├── package.json
└── README.md
```

---

## Database Schema

### `sessions` table
```sql
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### `messages` table
```sql
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content     JSONB NOT NULL,   -- stores full structured response for assistant
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON messages(session_id, created_at);
```

> `content` for assistant rows stores the full `{ answer, claims[] }` object.  
> `content` for user rows stores `{ text: "..." }`.

### `failure_log` table *(for the M1 audit)*
```sql
CREATE TABLE failure_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT NOT NULL,
  category      TEXT NOT NULL,
  response_json JSONB,
  failure_types TEXT[],         -- e.g. ['unsupported_claim', 'shifting_number']
  run_at        TIMESTAMPTZ DEFAULT now()
);
```

---

## API Contract

### `POST /api/chat`

**Request**
```ts
{
  session_id: string | null,  // null → server creates new session
  message: string
}
```

**Response — success (200)**
```ts
{
  session_id: string,
  answer: string,
  claims: Array<{
    claim_text: string,
    source: null              // always null in Milestone 1
  }>
}
```

**Response — scope violation (200, declined)**
```ts
{
  session_id: string,
  answer: "I'm not able to provide calorie targets, weight recommendations, or medical advice. Please consult a registered dietitian or your doctor.",
  claims: []
}
```

**Response — schema parse failure (500)**
```ts
{
  error: "MODEL_PARSE_ERROR",
  message: "Response did not match expected schema"
}
```

> The endpoint always returns HTTP 200 for declined questions (it's a valid bot response, not an error). Schema failures are 500.

---

## Response Schema (Zod)

```ts
// lib/schema.ts
import { z } from "zod";

export const ClaimSchema = z.object({
  claim_text: z.string(),
  source: z.null(),
});

export const ChatResponseSchema = z.object({
  answer: z.string(),
  claims: z.array(ClaimSchema),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;
```

The Anthropic call uses **tool_use** to guarantee structured output:

```ts
// lib/anthropic.ts
const tool = {
  name: "nutrition_response",
  description: "Return a structured nutrition answer",
  input_schema: {
    type: "object",
    properties: {
      answer: { type: "string" },
      claims: {
        type: "array",
        items: {
          type: "object",
          properties: {
            claim_text: { type: "string" },
            source: { type: "null" }
          },
          required: ["claim_text", "source"]
        }
      }
    },
    required: ["answer", "claims"]
  }
};
```

The model is forced to call this tool, so the output is always structured JSON — no prose parsing.

---

## Scope Guard — Enforced in Code

```ts
// lib/scopeGuard.ts

const BLOCKED_PATTERNS = [
  /\bcalorie\s*(target|goal|limit|intake|count|deficit|surplus)\b/i,
  /\bhow\s+many\s+calories\b/i,
  /\blose\s+weight\b/i,
  /\bgain\s+weight\b/i,
  /\bshould\s+i\s+weigh\b/i,
  /\bbmi\b/i,
  /\bdiet\s+plan\b/i,
  /\bweight\s+loss\s+plan\b/i,
  /\bmedical\s+advice\b/i,
  /\btreat\s+(my|a)\b/i,
  /\bcure\b/i,
  /\bdiagnos(e|is)\b/i,
  /\bprescri(be|ption)\b/i,
  /\bsupplement\s+dose\b/i,
];

export function isBlocked(message: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(message));
}
```

**Flow in the route handler:**
```
1. Receive message
2. isBlocked(message) → true  → return decline response immediately (no LLM call)
3. isBlocked(message) → false → proceed to LLM
```

> The system prompt also instructs the model to decline these topics, providing a second line of defence.

---

## System Prompt

```
lib/systemPrompt.ts
```

```ts
export const SYSTEM_PROMPT = `
You are a nutrition information assistant. You answer questions about food,
nutrition, and food safety. You do not provide personalised dietary advice.

How you answer:
- Be factual and specific. Cite the claim you are making inline.
- Keep answers between 2 and 5 sentences unless a list is clearly better.
- Break complex answers into short bullet points.
- Never make up authority names, studies, or publications.
- If you are uncertain, say so explicitly rather than hedging vaguely.

What you will not do:
- Provide calorie targets, caloric deficits, or caloric surpluses for any person.
- Recommend what a person should weigh or how to lose or gain weight.
- Give medical advice, diagnose conditions, or suggest treatments.
- Name specific supplement dosages for an individual.

If a user asks for any of the above, respond:
"I'm not able to provide [specific thing they asked for]. Please consult a
registered dietitian or your doctor for personalised guidance."

Every response must be structured as a list of factual claims. Each claim is
a single verifiable statement. Do not combine multiple facts into one claim.
`.trim();
```

---

## Request Lifecycle (Step-by-Step)

```
Client sends POST /api/chat
         │
         ▼
[1] Parse request body → { session_id, message }
         │
         ▼
[2] scopeGuard.isBlocked(message)?
    ├── YES → return decline response (no DB write for assistant turn)
    └── NO  ↓
         │
         ▼
[3] If session_id is null → INSERT into sessions → get new session_id
         │
         ▼
[4] Load last N messages from messages table (conversation history)
         │
         ▼
[5] Build Anthropic messages array:
    [{ role: "user", content: history[0] }, ..., { role: "user", content: message }]
         │
         ▼
[6] Call Anthropic API with:
    - system: SYSTEM_PROMPT
    - tool_choice: { type: "tool", name: "nutrition_response" }
    - tools: [nutrition_response tool definition]
         │
         ▼
[7] Extract tool_use block from response
         │
         ▼
[8] Parse tool input through Zod ChatResponseSchema
    ├── FAIL → throw 500 MODEL_PARSE_ERROR
    └── OK   ↓
         │
         ▼
[9] INSERT user message into messages table
    INSERT assistant message (full structured JSON) into messages table
         │
         ▼
[10] Return { session_id, answer, claims } to client
```

---

## Frontend Component Architecture

```
app/page.tsx
  └── <ChatShell>
        ├── <MessageList>
        │     └── <MessageBubble> × N     (role: user | assistant)
        ├── <InputBox>                    (textarea + send button)
        └── <SourcesPanel>               (empty in M1; renders claims[] stubs)
```

### State Shape (in `ChatShell`)

```ts
type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  claims: Array<{ claim_text: string; source: null }>;
  timestamp: Date;
};

const [sessionId, setSessionId]   = useState<string | null>(null);
const [messages, setMessages]     = useState<Message[]>([]);
const [isLoading, setIsLoading]   = useState(false);
```

### Send Flow

```
User submits message
  → Optimistically append user message to messages[]
  → POST /api/chat { session_id, message }
  → On response: append assistant message to messages[]
  → Pass claims[] to <SourcesPanel> (rendered as empty slots in M1)
  → Store returned session_id (used in all future requests)
```

---

## Environment Variables

```bash
# .env.local

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # server-side only, never exposed to browser
```

> `SUPABASE_SERVICE_ROLE_KEY` is used only in Route Handlers (server-side). The browser never touches it. `NEXT_PUBLIC_SUPABASE_URL` is safe to expose.

---

## Deployment

### Vercel (Frontend + API Routes)

```bash
# One-time setup
vercel link
vercel env add ANTHROPIC_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Deploy
vercel --prod
```

- All Next.js Route Handlers deploy as Vercel Serverless Functions automatically.
- No separate backend server required.

### Supabase

- Create a new project on supabase.com
- Run the SQL from the **Database Schema** section above in the SQL Editor
- Copy the project URL and `service_role` key into Vercel env vars

---

## Failure Log Structure

File: `failure-log/questions.md`

```markdown
## Question 1 — [Category: Nutrient Requirements]
**Q:** How much vitamin D does an adult need daily?

### Run 1
- Answer: ...
- Claims: ...
- Failures: [ ] unsupported_claim  [ ] shifting_number  [ ] phantom_source  [ ] should_have_declined  [ ] hedged_into_uselessness

### Run 2
...

### Run 3
...

---
## Failure Summary

| Category              | Count |
|-----------------------|-------|
| Unsupported claims    | N     |
| Shifting numbers      | N     |
| Phantom sources       | N     |
| Should have declined  | N     |
| Hedged uselessly      | N     |
| **Total**             | N     |
```

---

## What Milestone 2 Plugs In

This architecture is intentionally built so M2 changes **nothing structural**:

| What M2 adds | Where it lands |
|---|---|
| Vector search / RAG retrieval | Inside `/api/chat/route.ts`, before the LLM call |
| Real source URLs | `source` field in `ClaimSchema` changes from `z.null()` to `z.string().url()` |
| Source documents storage | New `documents` table in Supabase |
| Citations in Sources Panel | `<SourcesPanel>` already receives `claims[]` — just renders links instead of empty slots |

The frontend, API contract, and database structure require **zero breaking changes**.

## Phase 2 Additional Components
- **StitchApp UI Shell:** Replaces standard chat shell to integrate a three-pane tab system (Chat, Logs, Excel) along with a Conversation History sidebar.
- **Client-Side Log Aggregation:** Captures interactions within the session and maps them to the mock dataset or local state to populate the categorization and Excel views.
