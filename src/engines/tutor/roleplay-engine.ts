/**
 * Interactive Role Play Engine v0 (Phase 5).
 *
 * Upgrades the fixed 5-round dialogue into a turn-by-turn role play:
 *   - the learner picks a scenario with FIXED roles (e.g. customer/waiter)
 *   - the AI opens the conversation in its role
 *   - each learner utterance gets: understanding -> corrections -> in-character
 *     reply, persisted to the conversation log
 * Integrations (all real, no fakes):
 *   - Error Bank: every accepted correction via storeEnrichedError()
 *   - SRS/Student Model: one `track()` evidence event per user turn
 *     (skill=speaking, interaction=conversation, correct = zero corrections)
 *   - Knowledge Model: relatedKnowledgeIds resolved from real lexicon matches
 * Degrades honestly when AI is unavailable or returns invalid output.
 */
import type { IAiProvider } from "@/ai/provider";
import {
  createConversation,
  getConversation,
  updateRoleplayMeta,
  appendMessage,
} from "@/ai/conversation-store";
import type { ConversationMessage } from "@/data/db";
import { storeEnrichedError } from "@/engines/errors/error-analysis-v0";
import { findLexical } from "@/content/vocab";
import { track } from "@/data/recorder";

export interface RoleplayScenario {
  id: string;
  nameZh: string;
  userRoleEn: string;
  userRoleZh: string;
  aiRoleEn: string;
  aiRoleZh: string;
  /** One-line English scene hint for the model. */
  sceneEnHint: string;
}

export const ROLEPLAY_SCENARIOS: readonly RoleplayScenario[] = [
  {
    id: "restaurant",
    nameZh: "餐厅点餐",
    userRoleEn: "customer",
    userRoleZh: "顾客",
    aiRoleEn: "server",
    aiRoleZh: "服务员",
    sceneEnHint: "A casual diner during lunch rush.",
  },
  {
    id: "airport",
    nameZh: "机场值机",
    userRoleEn: "passenger",
    userRoleZh: "旅客",
    aiRoleEn: "airline agent",
    aiRoleZh: "地勤工作人员",
    sceneEnHint: "The check-in counter at a busy airport.",
  },
  {
    id: "work",
    nameZh: "工作沟通",
    userRoleEn: "employee",
    userRoleZh: "员工",
    aiRoleEn: "coworker",
    aiRoleZh: "同事",
    sceneEnHint: "An open-plan office, planning tomorrow's deadline.",
  },
];

export function findScenario(id: string): RoleplayScenario | null {
  return ROLEPLAY_SCENARIOS.find((s) => s.id === id) ?? null;
}

export type RoleplayDifficulty = "easy" | "normal" | "hard";

export interface RoleplayTurnOutcome {
  ok: true;
  replyEn: string;
  replyZh: string;
  corrections: Array<{ wrong: string; right: string; noteZh: string }>;
  turn: number;
}

interface RoleplayReplyJson {
  corrections?: Array<{ wrong?: unknown; right?: unknown; noteZh?: unknown }>;
  replyEn?: unknown;
  replyZh?: unknown;
}

export function parseRoleplayReply(raw: string): RoleplayTurnOutcome | null {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  try {
    const obj = JSON.parse(text) as RoleplayReplyJson;
    if (typeof obj.replyEn !== "string" || typeof obj.replyZh !== "string") return null;
    if (obj.replyEn.length === 0) return null;
    const corrections = Array.isArray(obj.corrections)
      ? obj.corrections
          .filter(
            (c): c is { wrong: string; right: string; noteZh: string } =>
              !!c &&
              typeof c.wrong === "string" &&
              typeof c.right === "string" &&
              typeof c.noteZh === "string",
          )
          .slice(0, 5)
      : [];
    return { ok: true as const, corrections, replyEn: obj.replyEn, replyZh: obj.replyZh, turn: 0 };
  } catch {
    return null;
  }
}

function difficultyRule(difficulty: RoleplayDifficulty): string {
  switch (difficulty) {
    case "easy":
      return "Use very short, simple sentences (max 8 words).";
    case "hard":
      return "Use natural speed phrasing; you may add one complication per turn.";
    default:
      return "Use clear everyday American sentences (about 8-14 words).";
  }
}

function buildSystemPrompt(
  scenario: RoleplayScenario,
  difficulty: RoleplayDifficulty,
  day?: number,
): string {
  return [
    `You are roleplaying as the ${scenario.aiRoleEn}. The LEARNER is the ${scenario.userRoleEn}.`,
    `Scene: ${scenario.sceneEnHint}.${day ? ` The learner is on day ${day} of an English course.` : ""}`,
    difficultyRule(difficulty),
    "Stay in character. Never write Chinese in your spoken line.",
    'Return STRICT JSON only: {"corrections":[{"wrong":"","right":"","noteZh":""}],"replyEn":"","replyZh":""}',
    "corrections fixes AT MOST the single biggest mistake in the learner's last line (empty array if none); noteZh is in Chinese.",
    "replyEn continues the scene and asks back or pushes the story forward.",
  ].join("\n");
}

function knowledgeMatchesFromText(text: string): string[] {
  const words = new Set(
    text
      .toLowerCase()
      .replace(/[^a-z' ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  const ids: string[] = [];
  for (const word of words) {
    const entry = findLexical(word);
    if (entry) ids.push(entry.id);
  }
  return ids.slice(0, 12);
}

function openingInstruction(scenario: RoleplayScenario): Array<{
  role: "system" | "user" | "assistant";
  content: string;
}> {
  return [
    {
      role: "user",
      content:
        `Start the scene with ONE short line as the ${scenario.aiRoleEn}, greeting the ${scenario.userRoleEn}.`,
    },
  ];
}

interface AiChatMessageLike {
  role: "system" | "user" | "assistant";
  content: string;
}

async function completeJson(
  provider: IAiProvider,
  messages: AiChatMessageLike[],
  signal?: AbortSignal,
): Promise<string> {
  const response = await provider.complete({ messages, temperature: 0.6, maxTokens: 400, signal, feature: "roleplay" });
  return response.text;
}

export interface StartRoleplayResult {
  ok: true;
  sessionId: string;
  opening: { en: string; zh: string };
}
export interface RoleplayFailure {
  ok: false;
  reasonZh: string;
}

export async function startRoleplay(
  provider: IAiProvider,
  scenarioId: string,
  options: { day?: number; difficulty?: RoleplayDifficulty; signal?: AbortSignal } = {},
): Promise<StartRoleplayResult | RoleplayFailure> {
  const scenario = findScenario(scenarioId);
  if (!scenario) return { ok: false, reasonZh: `未知场景：${scenarioId}` };
  const difficulty = options.difficulty ?? "normal";

  try {
    const raw = await completeJson(
      provider,
      [
        { role: "system", content: buildSystemPrompt(scenario, difficulty, options.day) },
        ...openingInstruction(scenario).map((m) => ({
          role: m.role as "user",
          content: `${m.content}\nReturn STRICT JSON only: {"corrections":[],"replyEn":"","replyZh":""}`,
        })),
      ],
      options.signal,
    );
    const parsed = parseRoleplayReply(raw);
    if (!parsed) {
      return { ok: false, reasonZh: "AI 开场白格式无效，请重试。" };
    }

    const row = await createConversation({
      type: "roleplay",
      relatedDay: options.day,
      initialMessages: [
        {
          role: "assistant",
          content: parsed.replyEn,
          noteZh: parsed.replyZh,
        },
      ],
    });
    await updateRoleplayMeta(row.id, {
      scenarioId: scenario.id,
      userRole: scenario.userRoleEn,
      aiRole: scenario.aiRoleEn,
      turn: 1,
      difficulty,
    });
    return {
      ok: true,
      sessionId: row.id,
      opening: { en: parsed.replyEn, zh: parsed.replyZh },
    };
  } catch (err) {
    return {
      ok: false,
      reasonZh: `AI 开场失败：${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Send one learner line; returns the AI's correction + in-character reply. */
export async function roleplayUserTurn(
  provider: IAiProvider,
  sessionId: string,
  userText: string,
  opts: { signal?: AbortSignal } = {},
): Promise<RoleplayTurnOutcome | RoleplayFailure> {
  const row = await getConversation(sessionId);
  if (!row || row.type !== "roleplay" || !row.meta) {
    return { ok: false, reasonZh: "会话不存在或不是角色扮演会话。" };
  }
  const scenario = findScenario(row.meta.scenarioId);
  if (!scenario) return { ok: false, reasonZh: "场景定义缺失。" };

  const trimmed = userText.trim();
  if (!trimmed) return { ok: false, reasonZh: "输入为空。" };

  const history: AiChatMessageLike[] = row.messages.map((m) => ({
    role: m.role,
    content: m.noteZh ? `${m.content}（${m.noteZh}）` : m.content,
  }));

  try {
    const raw = await completeJson(
      provider,
      [
        { role: "system", content: buildSystemPrompt(scenario, row.meta.difficulty, row.relatedDay) },
        ...(history as Array<{ role: "system" | "user" | "assistant"; content: string }>),
        { role: "user", content: trimmed },
      ],
      opts.signal,
    );
    const parsed = parseRoleplayReply(raw);
    if (!parsed) {
      return { ok: false, reasonZh: "AI 回复格式无效，本回合未计入。请重试。" };
    }

    const nextTurn = row.meta.turn + 1;

    // Persist both sides BEFORE side effects so the log never loses the turn.
    await appendMessage(sessionId, { role: "user", content: trimmed });
    await appendMessage(sessionId, {
      role: "assistant",
      content: parsed.replyEn,
      noteZh: parsed.replyZh,
    });
    await updateRoleplayMeta(sessionId, { ...row.meta, turn: nextTurn });

    // Knowledge Model linkage: real lexicon hits in the learner's line.
    const knowledgeIds = knowledgeMatchesFromText(trimmed);
    if (knowledgeIds.length > 0 && row.id) {
      const fresh = await getConversation(sessionId);
      if (fresh) {
        fresh.relatedKnowledgeIds = [
          ...new Set([...(fresh.relatedKnowledgeIds ?? []), ...knowledgeIds]),
        ].slice(0, 30);
        fresh.updatedAt = Date.now();
        await (await import("@/data/db")).db.conversations.put(fresh);
      }
    }

    // Error Bank: every accepted correction becomes a real record.
    for (const fix of parsed.corrections) {
      await storeEnrichedError(
        {
          occurredAt: Date.now(),
          skill: "speaking",
          category: "roleplay-mistake",
          descriptionZh: `“${fix.wrong}” → “${fix.right}”：${fix.noteZh}`,
          relatedItemIds: [],
        },
        {
          category: "roleplay-mistake",
          skill: "speaking",
          interaction: "conversation",
          answerText: trimmed,
        },
      );
    }

    // SRS / Student Model evidence for this conversational turn.
    await track({
      skill: "speaking",
      interaction: "conversation",
      correct: parsed.corrections.length === 0,
      production: true,
      difficulty: row.meta.difficulty === "hard" ? 0.7 : row.meta.difficulty === "easy" ? 0.3 : 0.5,
      meta: {
        sessionId,
        turn: nextTurn,
        corrections: parsed.corrections.length,
      },
    });

    return {
      ok: true,
      replyEn: parsed.replyEn,
      replyZh: parsed.replyZh,
      corrections: parsed.corrections,
      turn: nextTurn,
  };
  } catch (err) {
    return {
      ok: false,
      reasonZh: `AI 回复失败：${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Resume helper: rebuild the visible transcript + state from storage. */
export async function resumeRoleplay(
  sessionId: string,
): Promise<
  | {
      ok: true;
      scenario: RoleplayScenario;
      meta: NonNullable<import("@/data/db").RoleplayMeta>;
      messages: ConversationMessage[];
    }
  | RoleplayFailure
> {
  const row = await getConversation(sessionId);
  if (!row || row.type !== "roleplay" || !row.meta) {
    return { ok: false, reasonZh: "会话不存在或已损坏。" };
  }
  const scenario = findScenario(row.meta.scenarioId);
  if (!scenario) return { ok: false, reasonZh: "场景定义缺失。" };
  return { ok: true, scenario, meta: row.meta, messages: row.messages };
}
