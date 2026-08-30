/**
 * English360 GPT - core domain type contracts.
 *
 * PHASE 0: these are shared vocabulary for the engine interfaces.
 * They define WHAT the system records and decides - no behavior yet.
 *
 * Design notes (from the master spec):
 * - Mastery is a ladder from passive exposure to real-world transfer,
 *   not a boolean "learned" flag.
 * - Ability is a continuous score with uncertainty, never "accuracy = ability".
 * - All persisted payloads are wrapped with a schema version for migrations.
 */

// ---------------------------------------------------------------------------
// Skills & mastery
// ---------------------------------------------------------------------------

export const SKILL_KEYS = [
  "vocabulary",
  "grammar",
  "phonics",
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
] as const;
export type SkillKey = (typeof SKILL_KEYS)[number];

/** Receptive -> productive mastery ladder (ordered low -> high). */
export const MASTERY_STAGES = [
  "seen",
  "recognized",
  "recalled",
  "produced",
  "used",
  "mastered",
  "transferred",
] as const;
export type MasteryStage = (typeof MASTERY_STAGES)[number];

/** Position of a mastery stage on the ladder (higher = stronger). */
export function masteryRank(stage: MasteryStage): number {
  return MASTERY_STAGES.indexOf(stage);
}

// ---------------------------------------------------------------------------
// Student model primitives
// ---------------------------------------------------------------------------

/** Continuous competency estimate. `score` is 0..100; `confidence` is 0..1. */
export interface AbilityScore {
  score: number;
  confidence: number;
  sampleSize: number;
  updatedAt: number;
}

/** Snapshot of measured ability across all skills plus an overall estimate. */
export interface StudentAbility {
  overall: AbilityScore;
  skills: Record<SkillKey, AbilityScore>;
}

/**
 * One observed interaction with the system. This is the atomic evidence the
 * Student Model learns from - never just "correct / incorrect".
 */
export interface LearningEvent {
  id: string;
  occurredAt: number;
  itemId?: string;
  skill: SkillKey;
  interaction: InteractionKind;
  /** null when the response could not be judged automatically. */
  correct: boolean | null;
  latencyMs?: number;
  /** Estimated difficulty of the material at interaction time (0..1). */
  difficulty?: number;
  meta?: Record<string, unknown>;
}

export const INTERACTION_KINDS = [
  "tap",
  "multiple-choice",
  "typing",
  "listening",
  "speaking",
  "pronunciation",
  "sentence-ordering",
  "fill-blank",
  "recall",
  "dictation",
  "shadowing",
  "roleplay",
  "free-response",
  "reading-comprehension",
  "writing",
  "conversation",
  "flashcard",
  "learn-new",
  "self-assess",
] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

// ---------------------------------------------------------------------------
// Knowledge items & memory state
// ---------------------------------------------------------------------------

export type KnowledgeItemType =
  | "word"
  | "chunk"
  | "collocation"
  | "grammar-point"
  | "phonics-rule"
  | "sentence-pattern"
  | "pragmatic-usage";

/** Minimal content-agnostic knowledge item. Rich lexical data arrives later. */
export interface KnowledgeItem {
  id: string;
  type: KnowledgeItemType;
  /** The English surface form, e.g. a word or full pattern. */
  surface: string;
  /** Simplified Chinese gloss / explanation for zero-basis scaffolding. */
  meaningZh?: string;
  ipa?: string;
  tags?: string[];
}

/**
 * Per-item long-term memory state tracked by the Memory/SRS engines.
 * Field semantics follow a two-component model (stability x difficulty).
 */
export interface MemoryState {
  itemId: string;
  stage: MasteryStage;
  /** Days until ~90% recall probability at current review cadence. */
  stability: number;
  /** Intrinsic difficulty estimate (0 easy .. 1 hard). */
  difficulty: number;
  dueAt: number;
  lastReviewedAt: number | null;
  successfulReps: number;
  lapses: number;
}

// ---------------------------------------------------------------------------
// Errors, assessments, planning
// ---------------------------------------------------------------------------

export interface ErrorRecord {
  id: string;
  occurredAt: number;
  skill: SkillKey;
  category: string;
  descriptionZh: string;
  severity: "low" | "medium" | "high";
  relatedItemIds: string[];
  resolvedAt: number | null;
}

export interface AssessmentResult {
  id: string;
  takenAt: number;
  kind: "milestone" | "final-proficiency" | "diagnostic";
  milestoneDay?: 30 | 90 | 180 | 270 | 360;
  ability: Partial<Record<SkillKey, AbilityScore>>;
  includedUnseenMaterial: boolean;
  notes?: string;
}

/** A single task chosen by the Daily Planner. */
export interface PlanTask {
  id: string;
  skill: SkillKey;
  reasonZh: string;
  estimatedMinutes: number;
  priority: "critical" | "high" | "normal";
}

export interface DailyPlan {
  dateISO: string;
  availableMinutes: number;
  tasks: PlanTask[];
}

// ---------------------------------------------------------------------------
// User settings (spec §22, §24)
// ---------------------------------------------------------------------------

export type AdaptiveMode = "auto" | "manual";
export type Intensity = "light" | "standard" | "intensive" | "extreme";
export type Strictness = "relaxed" | "standard" | "strict" | "extreme";
/** Chinese scaffold fades as ability grows; user may override. */
export type ScaffoldLevel =
  | "chinese-dominant"
  | "chinese-supported"
  | "english-with-support"
  | "english-immersive";

export interface AppSettings {
  adaptiveMode: AdaptiveMode;
  intensity: Intensity;
  strictness: Strictness;
  /** Suggested default per master spec: 240 minutes. Never enforced. */
  dailyMinutesTarget: number;
  scaffoldLevel: ScaffoldLevel;
  /** Auto-scaffold follows measured ability instead of the manual level. */
  autoScaffold: boolean;
  /**
   * Phase 11-C Task 6: study mode.
   * "beta-test" additionally records session lifecycle + drop-off +
   * difficulty feedback so real-learner testing can locate friction points.
   */
  studyMode: StudyMode;
}

export type StudyMode = "normal" | "beta-test";

export const DEFAULT_SETTINGS: AppSettings = {
  adaptiveMode: "auto",
  intensity: "standard",
  strictness: "standard",
  dailyMinutesTarget: 240,
  scaffoldLevel: "chinese-dominant",
  autoScaffold: true,
  studyMode: "normal",
};

// ---------------------------------------------------------------------------
// Persistence envelope
// ---------------------------------------------------------------------------

/** Every exported/imported dataset carries this envelope. */
export interface SchemaVersioned<T> {
  schemaVersion: number;
  data: T;
}
