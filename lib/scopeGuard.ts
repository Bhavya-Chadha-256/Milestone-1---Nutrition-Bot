// lib/scopeGuard.ts
// Phase 3 — Regex-based scope guard
// Runs synchronously before any model or DB call.

const BLOCKED_PATTERNS = [
  // Calorie / energy targets
  /\bcalorie\s*(target|goal|limit|intake|count|deficit|surplus)\b/i,
  /\bhow\s+many\s+calories\b/i,
  /\bdaily\s+calorie\b/i,
  /\bcaloric\s*(intake|need|requirement)\b/i,
  /\benergy\s+(intake|target|goal|need|requirement)\b/i,
  /\bhow\s+much\s+(should|can)\s+i\s+eat\b/i,

  // Weight recommendations
  /\blose\s+weight\b/i,
  /\bgain\s+weight\b/i,
  /\bshould\s+i\s+weigh\b/i,
  /\bideal\s+weight\b/i,
  /\bbmi\b/i,
  /\bweight\s+loss\b/i,
  /\bweight\s+management\b/i,
  /\bget\s+to\s+\d+\s*kg\b/i,
  /\breach\s+\d+\s*kg\b/i,

  // Medical advice
  /\bmedical\s+advice\b/i,
  /\btreat\s+(my|a|the)\b/i,
  /\bcure\s+(my|a|the)\b/i,
  /\bdiagnos(e|is)\b/i,
  /\bprescri(be|ption)\b/i,
  /\bsupplement\s+dose\b/i,
  /\bshould\s+i\s+take\s+(a\s+)?(supplement|vitamin|pill|medication)\b/i,
];

export function isBlocked(message: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(message));
}
