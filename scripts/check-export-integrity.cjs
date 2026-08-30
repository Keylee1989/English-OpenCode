/**
 * Phase 12 P0-3: Export/Import round-trip integrity gate.
 * Usage: node scripts/check-export-integrity.cjs
 *
 * Flow: create random user data -> export -> clear database -> import ->
 * re-export -> compare. Requires 100% row-level consistency.
 *
 * Coverage (must be non-empty and survive intact):
 *   conversations / assessments / speakingAttempts / memoryStates /
 *   settings (incl. AI usage log + Beta log keys) - plus every other
 *   table in DATA_TABLE_NAMES.
 *
 * Runs against real Dexie semantics via fake-indexeddb (same as vitest env).
 */
const path = require("path");

// IndexedDB polyfill MUST load before Dexie is imported by the bundle below.
require("fake-indexeddb/auto");

const fs = require("fs");
const os = require("os");
const { build } = require("esbuild");

const failures = [];
function fail(msg) {
  failures.push(msg);
}

/** Deterministic PRNG so failures are reproducible. */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260825);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));

/** Canonical JSON with sorted keys and Blob fingerprinting. */
function canonicalize(value) {
  if (typeof value === "bigint") return String(value);
  if (value instanceof Blob) return `__blob__(${value.size},${value.type})`;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize(value[key]);
    }
    return out;
  }
  return value;
}

function buildRandomSeed() {
  const skills = ["vocabulary", "listening", "speaking", "reading", "writing", "grammar"];
  const now = Date.now();

  const learningEvents = Array.from({ length: 40 }, (_, i) => ({
    id: `evt-${i}`,
    occurredAt: now - int(0, 100000) ,
    itemId: rand() < 0.7 ? pick(["w:hi", "w:water", "w:nice"]) : undefined,
    skill: pick(skills),
    interaction: pick(["learn-new", "review-recall", "quiz"]),
    correct: rand() < 0.75 ? true : rand() < 0.5 ? false : null,
    latencyMs: int(400, 6000),
    difficulty: rand(),
    reviewCount: undefined,
    meta: { selfReported: rand() < 0.2 },
  }));

  const memoryStates = Array.from({ length: 25 }, (_, i) => ({
    itemId: `w:item-${i}`,
    stage: pick(["unseen", "recognized", "recalled", "produced"]),
    stability: rand() * 30,
    difficulty: rand(),
    dueAt: now + int(0, 500000),
    lastReviewedAt: rand() < 0.5 ? now - int(0, 90000) : null,
    successfulReps: int(0, 9),
    lapses: int(0, 3),
    reviewCount: int(0, 12),
    successCount: int(0, 10),
    failureCount: int(0, 4),
    producedCount: int(0, 5),
  }));

  const errors = Array.from({ length: 12 }, (_, i) => ({
    id: `err-${i}`,
    occurredAt: now - int(0, 80000),
    skill: pick(skills),
    category: pick(["grammar-mistake", "vocabulary-mistake", "writing-mistake"]),
    descriptionZh: `示例错误 ${i}`,
    severity: pick(["low", "medium", "high"]),
    relatedItemIds: [`w:item-${int(0, 24)}`],
    resolvedAt: rand() < 0.3 ? now : null,
    errorType: "grammar",
    possibleCauseZh: "测试用原因",
  }));

  const abilities = ["vocabulary", "listening", "speaking", "reading", "writing", "grammar"].map(
    (skill) => ({
      skill,
      score: int(5, 95),
      confidence: rand(),
      evidenceCount: int(1, 200),
      lastUpdated: now,
      trend: pick(["up", "flat", "down"]),
    }),
  );

  const dailySessions = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(now - i * 86400000);
    return {
      dateISO: d.toISOString().slice(0, 10),
      startedAt: d.getTime(),
      endedAt: d.getTime() + int(300000, 3000000),
      dayStartAbilities: { vocabulary: { score: int(5, 90), confidence: rand() } },
      completedBlocks: ["lesson-x", "practice-x"],
      assessmentScore: rand() < 0.4 ? int(50, 99) : null,
    };
  });

  const dayProgress = Array.from({ length: 20 }, (_, i) => ({
    day: i + 1,
    status: i < 15 ? "completed" : "in-progress",
    startedAt: now - (30 - i) * 86400000,
    lessonDoneAt: now - int(0, 100000),
    completedAt: i < 15 ? now - int(0, 90000) : null,
    score: i < 15 ? int(55, 100) : null,
  }));

  const assessments = [30, 60, 90].map((day, i) => ({
    id: `assess-${day}`,
    type: "milestone",
    day,
    startedAt: now - int(10000, 20000),
    completedAt: now - int(0, 9000),
    overallScore: 55 + i * 10,
    level: `Level ${i + 2}`,
    data: {
      id: `assess-${day}`,
      type: "milestone",
      day,
      skillScores: { vocabulary: 60 + i, listening: 50 + i },
      weaknesses: ["listening"],
      recommendationsZh: ["听力偏弱：增加听辨与慢速跟读训练。"],
    },
  }));

  const knowledgeItems = Array.from({ length: 15 }, (_, i) => ({
    id: i % 3 === 0 ? `g:p-${i}` : `w:item-${i}`,
    kind: i % 3 === 0 ? "grammar" : "word",
    data: { note: `payload-${i}`, refs: [1, 2, 3] },
  }));

  const knowledgeEdges = Array.from({ length: 18 }, (_, i) => ({
    edgeKey: `w:item-${i}|synonym|w:item-${((i + 1) % 15)}|k${i}`,
    fromItemId: `w:item-${i}`,
    toItemId: `w:item-${(i + 1) % 15}`,
    relation: "synonym",
    noteZh: i % 2 === 0 ? `近义 ${i}` : undefined,
  }));

  const gamification = [
    {
      id: "main",
      xp: int(500, 5000),
      level: int(2, 8),
      streakDays: int(1, 40),
      bestStreakDays: int(5, 60),
      lastActiveDateISO: new Date(now).toISOString().slice(0, 10),
      counters: {
        lessonsCompleted: int(10, 170),
        reviewsCompleted: int(20, 400),
        assessmentsCompleted: 3,
        daysActive: int(10, 120),
      },
      unlockedBadges: ["first-lesson", "week-streak"],
      weeklyGoalXp: 300,
      weekStartISO: new Date(now).toISOString().slice(0, 10),
      xpAtWeekStart: int(0, 500),
      dailyXp: dailySessions.map((s) => ({ dateISO: s.dateISO, xp: int(0, 80) })),
      updatedAt: now,
    },
  ];

  const conversations = [
    ...["tutor", "error-analysis", "dialogue", "writing-review"].map((type, i) => ({
      id: `conv-${type}`,
      createdAt: now - int(0, 500000),
      updatedAt: now - int(0, 400000),
      type,
      messages: [
        { role: "user", content: `问题 ${i}：这句话怎么理解？` },
        { role: "assistant", content: `Explanation ${i}.`, noteZh: `解释 ${i}。` },
      ],
      relatedDay: int(1, 180),
      relatedKnowledgeIds: ["w:hi"],
    })),
    {
      id: "conv-roleplay-1",
      createdAt: now - 300000,
      updatedAt: now - 100000,
      type: "roleplay",
      messages: [
        { role: "assistant", content: "Hi! What would you like to order?", noteZh: "您好！想点些什么？" },
        { role: "user", content: "I want a burger, please." },
        { role: "assistant", content: "Great choice. Anything to drink?", noteZh: "好选择。要喝的吗？" },
      ],
      relatedDay: 42,
      relatedKnowledgeIds: [],
      meta: {
        scenarioId: "restaurant-order",
        userRole: "customer",
        aiRole: "waiter",
        turn: 2,
        difficulty: "normal",
      },
    },
  ];

  // Node 18+ has global Blob; store real binary payload for speakingAttempts.
  const audioBytes = new Uint8Array(int(500, 5000));
  for (let i = 0; i < audioBytes.length; i++) audioBytes[i] = int(0, 255);

  const speakingAttempts = Array.from({ length: 3 }, (_, i) => ({
    id: `attempt-${i}`,
    conversationId: "conv-roleplay-1",
    promptEn: `Prompt line ${i}`,
    audio: new Blob([audioBytes], { type: "audio/webm" }),
    createdAt: now - int(0, 100000),
    selfScore: int(1, 5),
    note: `self note ${i}`,
  }));

  const settings = [
    { key: "app", value: { adaptiveMode: "auto", studyMode: "beta-test", dailyMinutesTarget: 240 } },
    {
      key: "ai-usage-log",
      value: [
        { id: "u1", provider: "openai-compatible", model: "m1", timestamp: now - 1000, feature: "explanation", tokens: 1234, ok: true },
        { id: "u2", provider: "openai-compatible", model: "m1", timestamp: now - 500, feature: "roleplay", ok: false },
      ],
    },
    {
      key: "ai-budget-config",
      value: { dailySoftLimit: 100000, monthlySoftLimit: 2000000 },
    },
    {
      key: "beta-test-log",
      value: [
        { id: "b1", ts: now - 2000, kind: "session-start", payload: { blocks: 5 } },
        { id: "b2", ts: now - 1000, kind: "drop-off", payload: { step: 2, total: 5, blockKind: "practice", day: 12 } },
        { id: "b3", ts: now - 900, kind: "difficulty-feedback", payload: { day: 12, rating: "偏难" } },
      ],
    },
  ];

  return {
    settings,
    learningEvents,
    memoryStates,
    errors,
    abilities,
    dailySessions,
    dayProgress,
    assessments,
    knowledgeItems,
    knowledgeEdges,
    gamification,
    conversations,
    speakingAttempts,
  };
}

(async () => {
  // Bundle the real persistence modules against the project alias.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "export-integrity-"));
  const entry = path.join(tmp, "entry.ts");
  const outfile = path.join(tmp, "bundle.mjs");
  fs.writeFileSync(
    entry,
    [
      'export { db, DATA_TABLE_NAMES, SCHEMA_VERSION } from "@/data/db";',
      '// Phase 14 P1-2: this gate verifies diagnostic-log fidelity too, so it',
      '// exercises the explicit opt-in path of the privacy filter.',
      'export { exportAllData, importAllData } from "@/data/export-import";',
    ].join("\n"),
  );
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node18",
    alias: { "@": path.join(__dirname, "..", "src") },
    logLevel: "silent",
  });
  let p = outfile.split(path.sep).join("/");
  if (!p.startsWith("/")) p = "/" + p;
  const mod = await import("file://" + p);
  const { db, DATA_TABLE_NAMES, exportAllData, importAllData } = mod;

  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));

  // 1) Create random user data covering every table.
  const seed = buildRandomSeed();
  for (const [name, rows] of Object.entries(seed)) {
    await db.table(name).bulkAdd(rows);
  }
  console.log("Seeded random user data:");
  for (const name of DATA_TABLE_NAMES) {
    console.log(`  ${name}: ${await db.table(name).count()} rows`);
  }

  // Required coverage must be non-empty.
  const REQUIRED_NON_EMPTY = [
    "conversations",
    "assessments",
    "speakingAttempts",
    "memoryStates",
    "settings",
  ];
  for (const table of REQUIRED_NON_EMPTY) {
    if ((await db.table(table).count()) === 0) fail(`coverage: table "${table}" is empty before export`);
  }

  // 2) Export.
  const beforeEnvelope = await exportAllData({ includeAiUsageLog: true, includeBetaLog: true });
  const beforeCanonical = canonicalize(beforeEnvelope.data);

  // 3) Clear the entire database (simulated device change).
  await Promise.all(db.tables.map((table) => table.clear()));
  for (const name of DATA_TABLE_NAMES) {
    if ((await db.table(name).count()) !== 0) fail(`clear failed for "${name}"`);
  }

  // 4) Import from the captured envelope.
  await importAllData(beforeEnvelope);

  // 5) Re-export and compare, table by table.
  const afterEnvelope = await exportAllData({ includeAiUsageLog: true, includeBetaLog: true });
  const afterCanonical = canonicalize(afterEnvelope.data);

  let totalRows = 0;
  let matchedRows = 0;
  for (const name of DATA_TABLE_NAMES) {
    const beforeRows = beforeCanonical[name] ?? [];
    const afterRows = afterCanonical[name] ?? [];
    totalRows += beforeRows.length;
    if (JSON.stringify(beforeRows) === JSON.stringify(afterRows)) {
      matchedRows += beforeRows.length;
      console.log(`OK  ${name}: ${beforeRows.length} rows identical`);
    } else {
      fail(`round-trip mismatch in "${name}"`);
      console.log(`FAIL ${name}: rows differ (${beforeRows.length} -> ${afterRows.length})`);
    }
  }
  const consistency =
    totalRows === 0 ? 100 : Math.round((matchedRows / totalRows) * 100);
  console.log(`\nConsistency: ${consistency}% (${matchedRows}/${totalRows} rows)`);

  // Special-focus assertions from the spec.
  const importedSettings = await db.settings.toArray();
  const keys = importedSettings.map((row) => row.key);
  for (const key of ["app", "ai-usage-log", "beta-test-log", "ai-budget-config"]) {
    if (!keys.includes(key)) fail(`settings key "${key}" lost during round-trip`);
  }
  const attempt = await db.speakingAttempts.get("attempt-0");
  if (!attempt || !(attempt.audio instanceof Blob) || attempt.audio.size === 0) {
    fail("speakingAttempts.audio blob did not survive the round-trip");
  } else {
    console.log("OK  speakingAttempts.audio blob preserved (size " + attempt.audio.size + ")");
  }
  const roleplayRow = await db.conversations.get("conv-roleplay-1");
  if (!roleplayRow?.meta || roleplayRow.meta.turn !== 2) {
    fail("conversation roleplay meta lost during round-trip");
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nFailures: ${failures.length}`);
  failures.forEach((f) => console.log("  FAIL " + f));
  process.exit(failures.length === 0 && consistency === 100 ? 0 : 2);
})().catch((err) => {
  console.error("checker crashed:", err);
  process.exit(1);
});
