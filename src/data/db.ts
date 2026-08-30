/**
 * Local Persistence Layer - IndexedDB via Dexie.
 *
 * SCHEMA v2 (Phase 1):
 * - v1 tables kept: settings / learningEvents / memoryStates / errors
 * - new: abilities (Student Model v0 snapshots per skill),
 *        dailySessions (one row per calendar day of study),
 *        dayProgress (per curriculum day completion state)
 * - memoryStates rows now carry explicit counters:
 *        reviewCount / successCount / failureCount
 *
 * Migration: version(2) re-declares the full store set; v1 -> v2 needs no
 * data transformation (only additive fields), so no upgrade callback.
 *
 * NEVER store API keys here. AI credentials stay out of persistence until a
 * documented opt-in decision exists (see docs/architecture.md).
 */
import Dexie, { type EntityTable } from "dexie";
import { DEFAULT_SETTINGS, type AppSettings } from "@/core/types";

export const SCHEMA_VERSION = 7;
export const DB_NAME = "english360-gpt";

/** Key-value row for user preferences. */
export interface SettingsRow {
  key: string;
  value: unknown;
}

/**
 * Raw evidence of one observed interaction. Append-only.
 * Engines later derive ability estimates from this table.
 */
export interface LearningEventRow {
  id: string;
  occurredAt: number;
  itemId?: string;
  skill: string;
  interaction: string;
  correct: boolean | null;
  latencyMs?: number;
  difficulty?: number;
  /** How strongly this event feeds the Student Model (see student-model-v0). */
  evidenceWeight?: number;
  meta?: Record<string, unknown>;
}

/** Per-item long-term memory state (stability x difficulty model). */
export interface MemoryStateRow {
  itemId: string;
  /** "unseen" or one of MASTERY_STAGES. */
  stage: string;
  /** Days until ~90% recall probability at current review cadence. */
  stability: number;
  /** Intrinsic difficulty estimate (0 easy .. 1 hard); raised by lapses. */
  difficulty: number;
  dueAt: number;
  lastReviewedAt: number | null;
  successfulReps: number;
  lapses: number;
  reviewCount: number;
  successCount: number;
  failureCount: number;
  /** Times the learner produced the item (typing/production modes). */
  producedCount: number;
}

/** Error Bank entry (spec §36), enriched by the Phase 2 analysis engine. */
export interface ErrorRecordRow {
  id: string;
  occurredAt: number;
  skill: string;
  /** Raw bucket from the recorder, e.g. "vocabulary-mistake". */
  category: string;
  descriptionZh: string;
  severity: "low" | "medium" | "high";
  relatedItemIds: string[];
  resolvedAt: number | null;

  // --- Phase 2 enrichment (Error Analysis Engine v0) ---
  /** Canonical taxonomy label inferred at record time. */
  errorType?: string;
  possibleCauseZh?: string;
  /** Related knowledge node ids (confusion partners / grammar point). */
  relatedKnowledge?: string[];
  recommendedPracticeZh?: string;
  /** What the learner actually submitted (typing/building), when captured. */
  answerText?: string;
}

/** Student Model v0 ability snapshot per skill. */
export interface AbilityRow {
  skill: string;
  /** 0..100 continuous estimate. NOT percent-correct. */
  score: number;
  /** 0..1; grows with evidence count, caps below 1. */
  confidence: number;
  evidenceCount: number;
  lastUpdated: number;
  trend: "up" | "flat" | "down";
}

/** One row per calendar day with study activity. */
export interface DailySessionRow {
  dateISO: string;
  startedAt: number;
  endedAt: number | null;
  /** Ability snapshot taken when the day's first session opened. */
  dayStartAbilities: Record<string, { score: number; confidence: number }>;
  completedBlocks: string[];
  assessmentScore: number | null;
}

/** Curriculum progression per authored day. */
export interface DayProgressRow {
  day: number;
  status: "in-progress" | "completed";
  startedAt: number;
  lessonDoneAt: number | null;
  completedAt: number | null;
  score: number | null;
}

// ---------------------------------------------------------------------------
// Schema v3 (Phase 2): Knowledge Model persistence
// ---------------------------------------------------------------------------

/** Persisted milestone assessment session (Phase 3b). */
export interface AssessmentSessionRow {
  id: string;
  type: "milestone";
  day: number;
  startedAt: number;
  completedAt: number;
  overallScore: number;
  level: string;
  data: Record<string, unknown>;
}

/** A knowledge node: lexical entry or grammar point. */
export interface KnowledgeItemRow {
  id: string; // "w:hi" | "g:p:im" | "r:<type>:<knowledge>"
  kind: "word" | "grammar" | "remedial";
  /** Full payload: LexicalEntry for words, GrammarPointNode for grammar. */
  data: unknown;
}

export type KnowledgeRelationType =
  | "synonym"
  | "antonym"
  | "word-family"
  | "collocation"
  | "confusion-pair";

// ---------------------------------------------------------------------------
// Schema v6 (Phase 5): AI conversation history
// ---------------------------------------------------------------------------

export type ConversationType = "tutor" | "error-analysis" | "dialogue" | "writing-review" | "roleplay";

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
  /** Optional zh translation shown under an assistant English line. */
  noteZh?: string;
}

/** Roleplay state (Phase 5) - stored on roleplay conversations. */
export interface RoleplayMeta {
  scenarioId: string;
  /** The learner's fixed role in this scenario, e.g. "customer". */
  userRole: string;
  aiRole: string;
  turn: number;
  difficulty: "easy" | "normal" | "hard";
}

/** Phase 6: one recorded speaking attempt linked to a roleplay conversation. */
export interface SpeakingAttemptRow {
  id: string;
  conversationId: string;
  /** The AI line the learner was responding to. */
  promptEn: string;
  audio: Blob;
  createdAt: number;
  /** Learner self-score 1..5. The system NEVER auto-scores pronunciation. */
  selfScore: number | null;
  note?: string;
}

export interface ConversationRow {
  id: string;
  createdAt: number;
  updatedAt: number;
  type: ConversationType;
  messages: ConversationMessage[];
  relatedDay?: number;
  relatedKnowledgeIds?: string[];
  meta?: RoleplayMeta;
}

/** Single-row gamification state ("main"). XP/streak/badges - all earned. */
export interface GamificationRow {
  id: "main";
  xp: number;
  level: number;
  streakDays: number;
  bestStreakDays: number;
  /** ISO date of the last day that granted XP (drives streak math). */
  lastActiveDateISO: string | null;
  counters: {
    lessonsCompleted: number;
    reviewsCompleted: number;
    assessmentsCompleted: number;
    daysActive: number;
  };
  unlockedBadges: string[];
  /** Weekly goal (XP). Default 300; user-tunable in Phase 5 report UI. */
  weeklyGoalXp: number;
  /** ISO Monday of the current XP week (drives weekly progress reset). */
  weekStartISO: string | null;
  /** Cumulative xp when the current week started. */
  xpAtWeekStart: number;
  /** True daily XP log, oldest first, capped at the last 90 days. */
  dailyXp: WeeklyProgressPoint[];
  updatedAt: number;
}

/** Phase 5 weekly goal + true daily XP curve (capped ring). */
export interface WeeklyProgressPoint {
  dateISO: string;
  xp: number;
}

/** One directed relation edge between two knowledge nodes. */
export interface KnowledgeEdgeRow {
  /** Deterministic key: `${fromItemId}|${relation}|${toItemId}` */
  edgeKey: string;
  fromItemId: string;
  toItemId: string;
  relation: KnowledgeRelationType;
  /** Optional human note, e.g. why two words are confused. */
  noteZh?: string;
}

export class English360Database extends Dexie {
  settings!: EntityTable<SettingsRow, "key">;
  learningEvents!: EntityTable<LearningEventRow, "id">;
  memoryStates!: EntityTable<MemoryStateRow, "itemId">;
  errors!: EntityTable<ErrorRecordRow, "id">;
  abilities!: EntityTable<AbilityRow, "skill">;
  dailySessions!: EntityTable<DailySessionRow, "dateISO">;
  dayProgress!: EntityTable<DayProgressRow, "day">;
  assessments!: EntityTable<AssessmentSessionRow, "id">;
  knowledgeItems!: EntityTable<KnowledgeItemRow, "id">;
  knowledgeEdges!: EntityTable<KnowledgeEdgeRow, "edgeKey">;
  gamification!: EntityTable<GamificationRow, "id">;
  conversations!: EntityTable<ConversationRow, "id">;
  speakingAttempts!: EntityTable<SpeakingAttemptRow, "id">;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      settings: "key",
      learningEvents: "id, occurredAt, skill, itemId",
      memoryStates: "itemId, dueAt, stage",
      errors: "id, occurredAt, category, skill",
    });
    this.version(2).stores({
      settings: "key",
      learningEvents: "id, occurredAt, skill, itemId",
      memoryStates: "itemId, dueAt, stage",
      errors: "id, occurredAt, category, skill",
      abilities: "skill",
      dailySessions: "dateISO, startedAt",
      dayProgress: "day, status",
      assessments: "id, completedAt",
    });
    this.version(4).stores({
      settings: "key",
      learningEvents: "id, occurredAt, skill, itemId",
      memoryStates: "itemId, dueAt, stage",
      errors: "id, occurredAt, category, skill",
      abilities: "skill",
      dailySessions: "dateISO, startedAt",
      dayProgress: "day, status",
      knowledgeItems: "id, kind",
      knowledgeEdges: "edgeKey, fromItemId, toItemId, relation",
      assessments: "id, completedAt",
    });
    this.version(3).stores({
      settings: "key",
      learningEvents: "id, occurredAt, skill, itemId",
      memoryStates: "itemId, dueAt, stage",
      errors: "id, occurredAt, category, skill",
      abilities: "skill",
      dailySessions: "dateISO, startedAt",
      dayProgress: "day, status",
      knowledgeItems: "id, kind",
      knowledgeEdges: "edgeKey, fromItemId, toItemId, relation",
      // Kept from v2 so every migration stays additive-only.
      assessments: "id, completedAt",
    });
    this.version(5).stores({
      settings: "key",
      learningEvents: "id, occurredAt, skill, itemId",
      memoryStates: "itemId, dueAt, stage",
      errors: "id, occurredAt, category, skill",
      abilities: "skill",
      dailySessions: "dateISO, startedAt",
      dayProgress: "day, status",
      knowledgeItems: "id, kind",
      knowledgeEdges: "edgeKey, fromItemId, toItemId, relation",
      assessments: "id, completedAt",
      gamification: "id",
    });
    // v6 (Phase 5): AI conversation history. Additive; no data migration.
    this.version(6).stores({
      settings: "key",
      learningEvents: "id, occurredAt, skill, itemId",
      memoryStates: "itemId, dueAt, stage",
      errors: "id, occurredAt, category, skill",
      abilities: "skill",
      dailySessions: "dateISO, startedAt",
      dayProgress: "day, status",
      knowledgeItems: "id, kind",
      knowledgeEdges: "edgeKey, fromItemId, toItemId, relation",
      assessments: "id, completedAt",
      gamification: "id",
      conversations: "id, updatedAt, type, [type+updatedAt]",
      speakingAttempts: "id, conversationId, createdAt",
    });
    // v7 (Phase 6): compound pagination index + speaking attempts + assessment day index.
    this.version(7).stores({
      settings: "key",
      learningEvents: "id, occurredAt, skill, itemId",
      memoryStates: "itemId, dueAt, stage",
      errors: "id, occurredAt, category, skill",
      abilities: "skill",
      dailySessions: "dateISO, startedAt",
      dayProgress: "day, status",
      knowledgeItems: "id, kind",
      knowledgeEdges: "edgeKey, fromItemId, toItemId, relation",
      assessments: "id, completedAt, day",
      gamification: "id",
      conversations: "id, updatedAt, type, [type+updatedAt]",
      speakingAttempts: "id, conversationId, createdAt",
    });
  }
}

export const db = new English360Database();

/** Tables included in export/import bundles. Keep in sync with schema. */
export const DATA_TABLE_NAMES = [
  "settings",
  "learningEvents",
  "memoryStates",
  "errors",
  "abilities",
  "dailySessions",
  "dayProgress",
  "assessments",
  "knowledgeItems",
  "knowledgeEdges",
  "gamification",
  "conversations",
  "speakingAttempts",
] as const;

export async function loadSettings(): Promise<AppSettings> {
  const row = await db.settings.get("app");
  if (!row) return { ...DEFAULT_SETTINGS };
  // Shallow-merge so newly introduced settings fall back to defaults.
  const stored = (row.value ?? {}) as Partial<AppSettings>;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ key: "app", value: settings });
}
