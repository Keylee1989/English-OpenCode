/**
 * Phase 15-H: Resource Engine — unified ResourceItem view over the four
 * content libraries (reading / audio / video / speaking / writing).
 * Pure projection layer: no writes, no schema, no study-flow coupling.
 */
import { READING_ARTICLES } from "@/content/resources/reading-library";
import { LISTENING_RESOURCES } from "@/content/resources/audio-library";
import { VIDEO_RESOURCES } from "@/content/resources/video-library";
import { DEBATE_TOPICS, PRESENTATION_TRACKS } from "@/content/resources/speaking-c2";
import { SPEAKING_TASKS } from "@/content/resources/speaking-c2-p19";
import { WRITING_TASKS, type WritingTask } from "@/content/resources/writing-c2";
import { GRAMMAR_C2_TOPICS } from "@/content/grammar/c2/grammar-c2";
import type { ResourceLevel } from "@/content/resources/reading-library";

export type ResourceItemType =
  | "reading"
  | "audio"
  | "video"
  | "grammar"
  | "vocab"
  | "speaking"
  | "writing";

export type ResourceSourceKind =
  /** Authored, bundled into the app, usable offline. */
  | "inApp"
  /** Real-language landing page off this app (podcast / broadcast / video). */
  | "externalAuthentic";

export interface ResourceItem {
  id: string;
  type: ResourceItemType;
  title: string;
  level: ResourceLevel;
  /** External landing page when the asset is off-device. */
  url?: string;
  offlineAvailable: boolean;
  sourceKind: ResourceSourceKind;
  skill: "vocabulary" | "listening" | "speaking" | "reading" | "writing" | "grammar" | "phonics";
  categoryZh: string;
  minutes?: number;
  detailZh?: string;
}

function readingItems(): ResourceItem[] {
  return READING_ARTICLES.map((article) => ({
    id: article.id,
    type: "reading" as const,
    title: `${String(article.number).padStart(2, "0")} · ${article.title}`,
    level: article.difficulty,
    offlineAvailable: true,
    sourceKind: "inApp" as const,
    skill: "reading" as const,
    categoryZh: article.categoryZh,
    minutes: article.minutes,
    detailZh: `${article.wordCount} 词 · ${article.questions.length} 道理解题 + 概念图/观点任务`,
  }));
}

function audioItems(): ResourceItem[] {
  return LISTENING_RESOURCES.map((res) => ({
    id: res.id,
    type: "audio" as const,
    title: `${String(res.number).padStart(2, "0")} · ${res.title}`,
    level: res.level,
    url: res.url,
    offlineAvailable: false,
    sourceKind: "externalAuthentic" as const,
    skill: "listening" as const,
    categoryZh: res.categoryZh,
    minutes: res.typicalMinutes,
    detailZh: `来源：${res.source} · ${res.keyVocabulary.slice(0, 3).join(" / ")}`,
  }));
}

function videoItems(): ResourceItem[] {
  return VIDEO_RESOURCES.map((res) => ({
    id: res.id,
    type: "video" as const,
    title: `${String(res.number).padStart(2, "0")} · ${res.title}`,
    level: res.level,
    url: res.url,
    offlineAvailable: false,
    sourceKind: "externalAuthentic" as const,
    skill: res.skillFocus,
    categoryZh: res.categoryZh,
    minutes: res.durationMinutes,
    detailZh: `来源：${res.source}`,
  }));
}

function grammarItems(): ResourceItem[] {
  return GRAMMAR_C2_TOPICS.map((topic) => ({
    id: `grammar-${topic.id}`,
    type: "grammar" as const,
    title: topic.titleEn,
    level: "C2" as const,
    offlineAvailable: true,
    sourceKind: "inApp" as const,
    skill: "grammar" as const,
    categoryZh: topic.category,
    detailZh: topic.titleZh,
  }));
}

export function speakingResourceCount(): number {
  return DEBATE_TOPICS.length + PRESENTATION_TRACKS.length + SPEAKING_TASKS.length;
}

export function speakingItems(): ResourceItem[] {
  return [
    ...SPEAKING_TASKS.map((task) => ({
      id: task.id,
      type: "speaking" as const,
      title: `#${task.number} [${task.category}] ${task.prompt.slice(0, 60)}...`,
      level: task.difficulty as ResourceLevel,
      offlineAvailable: true,
      sourceKind: "inApp" as const,
      skill: "speaking" as const,
      categoryZh: task.category,
      detailZh: `${task.sampleStructure.length} 步结构 · ${task.keyPhrases.length} 个关键表达`,
    })),
    ...DEBATE_TOPICS.map((topic) => ({
      id: topic.id,
      type: "speaking" as const,
      title: `Debate #${topic.number}: ${topic.resolution}`,
      level: "C1" as const,
      offlineAvailable: true,
      sourceKind: "inApp" as const,
      skill: "speaking" as const,
      categoryZh: topic.categoryZh,
      detailZh: "按 Claim→Evidence→Counterargument→Conclusion 四步准备",
    })),
    ...PRESENTATION_TRACKS.map((track) => ({
      id: track.id,
      type: "speaking" as const,
      title: track.titleEn,
      level: "C2" as const,
      offlineAvailable: true,
      sourceKind: "inApp" as const,
      skill: "speaking" as const,
      categoryZh: `${track.minutes} 分钟演讲`,
      detailZh: track.assessmentFocusZh,
    })),
  ];
}

export function writingItems(): ResourceItem[] {
  return WRITING_TASKS.map((task: WritingTask) => ({
    id: task.id,
    type: "writing" as const,
    title: `#${task.number} [${task.genre}] ${task.promptEn.slice(0, 60)}...`,
    level: "C2" as const,
    offlineAvailable: true,
    sourceKind: "inApp" as const,
    skill: "writing" as const,
    categoryZh: task.genre,
    detailZh: `${task.targetWords[0]}–${task.targetWords[1]} 词 · 重点：${task.focusZh}`,
  }));
}

let cachedAll: ResourceItem[] | null = null;

/** Unified resource list (built once per session; read-only). */
export function getAllResources(): ResourceItem[] {
  if (!cachedAll) {
    cachedAll = [
      ...readingItems(),
      ...audioItems(),
      ...videoItems(),
      ...grammarItems(),
      ...writingItems(),
      ...speakingItems(),
    ];
  }
  return cachedAll;
}
