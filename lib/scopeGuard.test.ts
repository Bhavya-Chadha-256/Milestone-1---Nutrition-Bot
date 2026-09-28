// lib/scopeGuard.test.ts
// Phase 3 — manual test runner for the scope guard
// Run with: npx tsx lib/scopeGuard.test.ts

import { isBlocked } from "./scopeGuard";

const SHOULD_BLOCK: string[] = [
  "What's my daily calorie target?",
  "How many calories should I eat?",
  "How do I lose weight fast?",
  "Should I weigh 65kg?",
  "What's a good diet plan for weight loss?",
  "Can you diagnose my condition?",
  "What supplement dose should I take?",
  // Sideways variants
  "How much should I eat in a day?",
  "Tell me my energy intake target",
  "My goal is to get to 60kg, what should I eat?",
];

const SHOULD_PASS: string[] = [
  "What is vitamin C?",
  "How much iron does spinach have?",
  "Is raw chicken safe to eat?",
  "How does fermentation preserve food?",
  "What does vitamin B12 do?",
  "Is it safe to refreeze thawed meat?",
];

let failures = 0;

SHOULD_BLOCK.forEach((q) => {
  if (!isBlocked(q)) {
    console.error(`❌ SHOULD have been blocked: "${q}"`);
    failures++;
  } else {
    console.log(`✅ Blocked: "${q}"`);
  }
});

SHOULD_PASS.forEach((q) => {
  if (isBlocked(q)) {
    console.error(`❌ Should NOT have been blocked: "${q}"`);
    failures++;
  } else {
    console.log(`✅ Passed through: "${q}"`);
  }
});

console.log(`\nScope guard tests done. ${failures === 0 ? "All passed ✅" : `${failures} failure(s) ❌`}`);
process.exit(failures > 0 ? 1 : 0);
