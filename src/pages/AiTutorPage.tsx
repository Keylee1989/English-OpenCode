import { useCallback, useEffect, useRef, useState } from "react";
import { getDayContent } from "@/content";
import { db } from "@/data/db";
import {
  buildStudentContext,
} from "@/engines/tutor/context-builder";
import { formatContextForAi } from "@/engines/tutor/context-format";
import { ROLEPLAY_SCENARIOS } from "@/engines/tutor/roleplay-engine";
import {
  getActiveAiProvider,
  isAiReady,
} from "@/ai/runtime";
import { isSpeechSupported, speakEn } from "@/speech/tts";
import {
  streamExplanation,
  analyzeError,
  generateDialogue,
  type DialogueDraft,
  type ErrorAnalysisResult,
} from "@/ai/tutor-service";
import {
  appendMessage,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
} from "@/ai/conversation-store";
import type { ConversationMessage, ConversationRow } from "@/data/db";
import { RoleplayRecorder } from "@/pages/RoleplayRecorder";
import { getAiBudgetStatus, getSessionAiUsage } from "@/ai/usage-tracker";

type Tab = "explain" | "errors" | "dialogue" | "roleplay";

interface ErrorRowLite {
  id: string;
  occurredAt: number;
  skill: string;
  category: string;
  descriptionZh: string;
  answerText?: string;
}

async function loadRecentErrors(): Promise<ErrorRowLite[]> {
  const rows = await db.errors.orderBy("occurredAt").reverse().limit(10).toArray();
  return rows.map((row) => ({
    id: row.id,
    occurredAt: row.occurredAt,
    skill: row.skill,
    category: row.category,
    descriptionZh: row.descriptionZh,
    answerText: row.answerText,
  }));
}

export default function AiTutorPage({ onBack }: { onBack?: () => void }) {
  // Phase 12 P1-2: AI History can hand off a target tab (e.g. roleplay resume).
  const [tab, setTab] = useState<Tab>(() => {
    const hint = sessionStorage.getItem("english360.tutor-tab");
    if (hint === "roleplay" || hint === "explain" || hint === "errors" || hint === "dialogue") {
      sessionStorage.removeItem("english360.tutor-tab");
      return hint;
    }
    return "explain";
  });
  const ready = isAiReady();
  // Phase 12 P0-2: soft budget warning (>=80% of a limit). Never blocks.
  const [budgetNoticeZh, setBudgetNoticeZh] = useState<string | null>(null);

  useEffect(() => {
    void getAiBudgetStatus().then((status) => {
      if (status.daily.level === "over100") {
        setBudgetNoticeZh(
          `今日 AI 用量已达软上限（${status.daily.usedTokens}/${status.daily.limitTokens} tokens）。` +
            "功能仍可使用，建议明天继续或调高上限。",
        );
      } else if (status.monthly.level === "over100") {
        setBudgetNoticeZh(
          `本月 AI 用量已达软上限（${status.monthly.usedTokens}/${status.monthly.limitTokens} tokens）。` +
            "功能仍可使用。",
        );
      } else if (status.daily.level === "warn80") {
        setBudgetNoticeZh(
          `今日AI使用量达到80%（${status.daily.usedTokens}/${status.daily.limitTokens} tokens），建议减少重复请求。`,
        );
      } else if (status.monthly.level === "warn80") {
        setBudgetNoticeZh(
          `本月AI使用量达到80%（${status.monthly.usedTokens}/${status.monthly.limitTokens} tokens），建议减少重复请求。`,
        );
      } else {
        setBudgetNoticeZh(null);
      }
    });
  }, []);

  return (
    <div className="page">
      <header className="step-header">
        {onBack ? (
          <button type="button" className="linklike" onClick={onBack}>
            ← 首页
          </button>
        ) : (
          <a href="#/" className="linklike">
            ← 首页
          </a>
        )}
        <span className="dim">AI 英语导师</span>
      </header>

      {!ready && (
        <p className="notice">
          AI 尚未连接：请先到「AI 设置」选择服务并输入本会话 API Key。
          核心学习功能不依赖 AI，可正常使用。
        </p>
      )}

      {budgetNoticeZh && (
        <p className="notice" role="status">
          💡 {budgetNoticeZh}
        </p>
      )}

      {/* Phase 13 P0-4: live session counter - transparency, never a limit. */}
      <SessionCounter watch={tab} />

      <nav className="task-list" aria-label="AI 导师功能">
        {(
          [
            ["explain", "课程解释"],
            ["errors", "错题分析"],
            ["dialogue", "情景对话"],
            ["roleplay", "角色扮演"],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "btn option-btn btn-block" : "btn btn-block"}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "explain" && <ExplainSection enabled={ready} />}
      {tab === "errors" && <ErrorSection enabled={ready} />}
      {tab === "dialogue" && <DialogueSection enabled={ready} />}
      {tab === "roleplay" && <RoleplaySection enabled={ready} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1) 课程解释 - streaming output + stop + history
// ---------------------------------------------------------------------------

/** Phase 13 P0-4: current-session AI usage (requests + estimated tokens). */
function SessionCounter({ watch }: { watch: unknown }) {
  const [usage, setUsage] = useState<Awaited<
    ReturnType<typeof getSessionAiUsage>
  > | null>(null);
  useEffect(() => {
    void getSessionAiUsage().then(setUsage);
  }, [watch]);
  if (!usage || usage.requests === 0) return null;
  return (
    <p className="fineprint" role="status">
      当前会话：AI requests: {usage.requests}
      {usage.failedRequests > 0 ? `（失败 ${usage.failedRequests}）` : ""} · Estimated
      tokens: {usage.estimatedTokens}
    </p>
  );
}

function ExplainSection({ enabled }: { enabled: boolean }) {
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<"idle" | "busy">("idle");
  const [answer, setAnswer] = useState<string | null>(null);
  const [failZh, setFailZh] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [history, setHistory] = useState<ConversationRow[]>([]);
  const continueRef = useRef<ConversationMessage[] | null>(null);

  const refreshHistory = useCallback(async () => {
    if (!enabled) return;
    setHistory(await listConversations({ type: "tutor", limit: 8 }));
  }, [enabled]);

  useEffect(() => {
    void refreshHistory();
    // Phase 11-A Task 3: honor a "continue conversation" handoff from AI History.
    const handedOff = sessionStorage.getItem("english360.tutor-continue-id");
    if (handedOff) {
      sessionStorage.removeItem("english360.tutor-continue-id");
      void getConversation(handedOff).then((row) => {
        if (!row) return;
        const msgs = row.messages ?? [];
        continueRef.current = msgs.slice(-6);
        setAnswer(
          msgs
            .map((m) => (m.noteZh ? `${m.content}\n${m.noteZh}` : m.content))
            .join("\n\n"),
        );
      });
    }
  }, [refreshHistory]);

  const run = async (customQuestion?: string): Promise<void> => {
    const provider = getActiveAiProvider();
    if (!provider) {
      setFailZh("AI 未配置，无法生成讲解。");
      return;
    }
    setPhase("busy");
    setFailZh(null);
    setAnswer(null);
    try {
      const ctx = await buildStudentContext();
      let questionZh: string;
      if (customQuestion) {
        questionZh = customQuestion;
      } else {
        const lesson = ctx.currentLesson;
        questionZh = lesson
          ? `请讲解今天的课程（${lesson.titleZh}）。目标：${lesson.goalZh}。句型：${lesson.patternTitleZh}。中文解释为主，配至少两个英文例句并附中文翻译，优先使用本课词汇。`
          : "请根据我的学习状态布置一个今天可完成的小任务。";
      }

      // Persist the user turn first (history is real even if generation fails).
      const convo = await createConversation({
        type: "tutor",
        relatedDay: ctx.currentDay,
        initialMessages: [{ role: "user", content: questionZh }],
      });

      const controller = new AbortController();
      abortRef.current = controller;
      let full = "";
      for await (const part of streamExplanation(provider, questionZh, {
        contextBlock: formatContextForAi(ctx),
        scaffoldLevel: ctx.scaffoldLevel,
        signal: controller.signal,
        history: continueRef.current ?? [],
        onDelta: (d) => setAnswer((prev) => (prev ?? "") + d),
      })) {
        if ("full" in part) full = part.full;
      }
      abortRef.current = null;
      setAnswer(full);
      await appendMessage(convo.id, { role: "assistant", content: full });
      void refreshHistory();
    } catch (err) {
      abortRef.current = null;
      if (err instanceof DOMException && err.name === "AbortError") {
        setFailZh("已停止生成（保留已输出部分）。");
      } else {
        setFailZh(`AI 讲解失败：${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setPhase("idle");
    }
  };

  const stop = (): void => {
    abortRef.current?.abort();
  };

  return (
    <section className="card">
      <h2>今日课程解释</h2>
      <p className="dim">基于当前课程与真实能力数据生成中文讲解 + 英文例句；支持边生成边显示。</p>
      <textarea
        className="text-input"
        rows={2}
        value={question}
        placeholder="可选：想问什么？（留空则讲解今日课程）"
        onChange={(event) => setQuestion(event.target.value)}
      />
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={!enabled || phase === "busy"}
        onClick={() => void run(question.trim() || undefined)}
      >
        {phase === "busy" ? "生成中…" : "生成讲解"}
      </button>
      {phase === "busy" && (
        <button type="button" className="btn option-btn btn-block" onClick={stop}>
          停止生成
        </button>
      )}
      {failZh && <p className="notice">{failZh}</p>}
      {answer && (
        <div className="example-box">
          <p style={{ whiteSpace: "pre-wrap" }}>{answer}</p>
        </div>
      )}

      <HistoryList
        rows={history}
        title="历史会话"
        onDelete={async (id) => {
          await deleteConversation(id);
          void refreshHistory();
        }}
        onContinue={(row) => {
          continueRef.current = row.messages.slice(-6);
          setAnswer(row.messages.map((m) => m.content).join("\n\n"));
        }}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2) 错题分析
// ---------------------------------------------------------------------------

function ErrorSection({ enabled }: { enabled: boolean }) {
  const [errors, setErrors] = useState<ErrorRowLite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "busy">("idle");
  const [analysis, setAnalysis] = useState<ErrorAnalysisResult | null>(null);
  const [failZh, setFailZh] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversationRow[]>([]);

  const refreshHistory = useCallback(async () => {
    if (!enabled) return;
    setHistory(await listConversations({ type: "error-analysis", limit: 8 }));
  }, [enabled]);

  useEffect(() => {
    void loadRecentErrors().then((rows) => {
      setErrors(rows);
      setSelectedId(rows[0]?.id ?? null);
    });
    void refreshHistory();
  }, [refreshHistory]);

  const run = async (): Promise<void> => {
    const provider = getActiveAiProvider();
    const row = errors.find((e) => e.id === selectedId);
    if (!provider || !row) return;
    setPhase("busy");
    setAnalysis(null);
    setFailZh(null);
    try {
      const ctx = await buildStudentContext();
      const outcome = await analyzeError(provider, {
        skill: row.skill,
        categoryZh: row.category,
        descriptionZh: row.descriptionZh,
        wrongEn: row.answerText,
        answerText: row.answerText,
        contextBlock: formatContextForAi(ctx),
      });
      if (!outcome.ok) {
        setFailZh(outcome.reasonZh);
        return;
      }
      setAnalysis(outcome.analysis);
      const convo = await createConversation({
        type: "error-analysis",
        relatedKnowledgeIds: [],
        initialMessages: [
          { role: "user", content: `${row.category}: ${row.descriptionZh}` },
          { role: "assistant", content: outcome.analysis.correctEn, noteZh: outcome.analysis.reasonZh },
        ],
      });
      void convo;
      void refreshHistory();
    } catch (err) {
      setFailZh(`错题分析失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPhase("idle");
    }
  };

  return (
    <section className="card">
      <h2>错题分析</h2>
      {errors.length === 0 ? (
        <p className="dim">错误银行还是空的——先去学习页做几道题吧。</p>
      ) : (
        <>
          <select
            className="text-input"
            value={selectedId ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {errors.map((row) => (
              <option key={row.id} value={row.id}>
                [{row.skill}] {row.category} · {row.descriptionZh.slice(0, 40)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!enabled || phase === "busy" || !selectedId}
            onClick={() => void run()}
          >
            {phase === "busy" ? "AI 分析中…" : "用 AI 分析这道错题"}
          </button>
          {failZh && <p className="notice">{failZh}</p>}
          {analysis && (
            <div className="example-box">
              <p><strong>错误原因：</strong>{analysis.reasonZh}</p>
              <p><strong>正确表达：</strong><code>{analysis.correctEn}</code></p>
              <p><strong>练习建议：</strong>{analysis.practiceAdviceZh}</p>
            </div>
          )}
          <HistoryList
            rows={history}
            title="分析历史"
            onDelete={async (id) => {
              await deleteConversation(id);
              void refreshHistory();
            }}
          />
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3) 情景对话（一次性 5 轮）
// ---------------------------------------------------------------------------

function DialogueSection({ enabled }: { enabled: boolean }) {
  const [phase, setPhase] = useState<"idle" | "busy">("idle");
  const [draft, setDraft] = useState<DialogueDraft | null>(null);
  const [dayInfo, setDayInfo] = useState<{ day: number; titleZh: string; goalZh: string; vocab: string[] } | null>(
    null,
  );
  const [failZh, setFailZh] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const ctx = await buildStudentContext();
      const day = ctx.currentDay;
      const content = getDayContent(day);
      setDayInfo({
        day,
        titleZh: content?.titleZh ?? `第 ${day} 天`,
        goalZh: content?.goalZh ?? "",
        vocab: content ? (content.vocabIds ?? []).map((id) => id.replace(/^w:/, "")) : [],
      });
    })();
  }, []);

  const run = async (): Promise<void> => {
    const provider = getActiveAiProvider();
    if (!provider || !dayInfo) return;
    setPhase("busy");
    setDraft(null);
    setFailZh(null);
    try {
      const ctx = await buildStudentContext();
      const outcome = await generateDialogue(provider, {
        day: dayInfo.day,
        titleZh: dayInfo.titleZh,
        goalZh: dayInfo.goalZh,
        vocabWords: dayInfo.vocab,
        contextBlock: formatContextForAi(ctx),
      });
      if (outcome.ok) {
        setDraft(outcome.dialogue);
        const convo = await createConversation({
          type: "dialogue",
          relatedDay: dayInfo.day,
          initialMessages: outcome.dialogue.rounds.map((r) => ({
            role: r.speaker === "A" ? ("user" as const) : ("assistant" as const),
            content: r.en,
            noteZh: r.zh,
          })),
        });
        void convo;
      } else {
        setFailZh(outcome.reasonZh);
      }
    } catch (err) {
      setFailZh(`情景对话生成失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPhase("idle");
    }
  };

  return (
    <section className="card">
      <h2>情景对话</h2>
      <p className="dim">根据第 {dayInfo?.day ?? "…"} 天主题生成 5 轮英文对话（A/B 交替）。</p>
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={!enabled || phase === "busy" || !dayInfo}
        onClick={() => void run()}
      >
        {phase === "busy" ? "AI 生成中…" : "生成本课情景对话"}
      </button>
      {failZh && <p className="notice">{failZh}</p>}
      {draft && (
        <div className="example-box">
          <p className="dim">场景：{draft.sceneZh}</p>
          {draft.rounds.map((round, index) => (
            <p key={index}>
              <strong>{round.speaker}:</strong> {round.en}
              <br />
              <span className="dim">{round.zh}</span>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4) 角色扮演（交互式）
// ---------------------------------------------------------------------------

function RoleplaySection({ enabled }: { enabled: boolean }) {
  const [scenarioId, setScenarioId] = useState(ROLEPLAY_SCENARIOS[0].id);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Array<{ who: "ai" | "me"; en: string; zh?: string }>>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "busy">("idle");
  const [failZh, setFailZh] = useState<string | null>(null);
  const [lastCorrections, setLastCorrections] = useState<
    Array<{ wrong: string; right: string; noteZh: string }>
  >([]);
  const [turnCount, setTurnCount] = useState(0);

  // Phase 12 P1-2: resume a saved roleplay conversation from AI History.
  useEffect(() => {
    const resumeId = sessionStorage.getItem("english360.roleplay-resume-id");
    if (!resumeId) return;
    sessionStorage.removeItem("english360.roleplay-resume-id");
    void (async () => {
      try {
        const engine = await import("@/engines/tutor/roleplay-engine");
        const result = await engine.resumeRoleplay(resumeId);
        if (!result.ok) {
          setFailZh(result.reasonZh);
          return;
        }
        setScenarioId(result.meta.scenarioId);
        setSessionId(resumeId);
        setTurnCount(result.meta.turn);
        // Rebuild the visible transcript from the stored message log.
        const restored = result.messages
          .filter((m) => m.role !== "system")
          .slice(-12)
          .map((m) => ({
            who: m.role === "user" ? ("me" as const) : ("ai" as const),
            en: m.content,
            zh: m.noteZh,
          }));
        if (restored.length > 0 && restored[0].who !== "ai") restored.shift();
        setTurns(restored);
      } catch (err) {
        setFailZh(`恢复会话失败：${err instanceof Error ? err.message : String(err)}`);
      }
    })();
  }, []);

  const start = async (): Promise<void> => {
    const provider = getActiveAiProvider();
    if (!provider) {
      setFailZh("AI 未配置。");
      return;
    }
    setPhase("busy");
    setTurns([]);
    setLastCorrections([]);
    setFailZh(null);
    const scenario = ROLEPLAY_SCENARIOS.find((s) => s.id === scenarioId)!;
    try {
      const ctx = await buildStudentContext();
      const result = await import("@/engines/tutor/roleplay-engine").then((m) =>
        m.startRoleplay(provider, scenarioId, {
          day: ctx.currentDay,
        }),
      );
      if (!result.ok) {
        setFailZh(result.reasonZh);
        return;
      }
      setSessionId(result.sessionId);
      setTurns([{ who: "ai", en: result.opening.en, zh: result.opening.zh }]);
      setTurnCount(1);
      void scenario;
    } catch (err) {
      setFailZh(`启动失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPhase("idle");
    }
  };

  const send = async (): Promise<void> => {
    const provider = getActiveAiProvider();
    if (!provider || !sessionId || !input.trim()) return;
    setPhase("busy");
    setFailZh(null);
    const engine = await import("@/engines/tutor/roleplay-engine");
    const outcome = await engine.roleplayUserTurn(provider, sessionId, input.trim());
    if (!outcome.ok) {
      setFailZh(outcome.reasonZh);
      setPhase("idle");
      return;
    }
    setTurns((prev) => [
      ...prev,
      { who: "me", en: input.trim() },
      { who: "ai", en: outcome.replyEn, zh: outcome.replyZh },
    ]);
    setLastCorrections(outcome.corrections);
    setTurnCount(outcome.turn);
    setInput("");
    setPhase("idle");
  };

  return (
    <section className="card">
      <h2>角色扮演</h2>
      {!sessionId ? (
        <>
          <p className="dim">选择场景后，AI 先开口，你用英文接话（每回合自动纠错）。</p>
          <select
            className="text-input"
            value={scenarioId}
            onChange={(event) => setScenarioId(event.target.value)}
          >
            {ROLEPLAY_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameZh}（你={s.userRoleZh} / AI={s.aiRoleZh}）
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!enabled || phase === "busy"}
            onClick={() => void start()}
          >
            {phase === "busy" ? "AI 准备中…" : "开始对话"}
          </button>
        </>
      ) : (
        <>
          <div className="example-box">
            {turns.map((t, i) => (
              <p key={i}>
                <strong>{t.who === "ai" ? "对方" : "我"}:</strong> {t.en}
                {t.who === "ai" && isSpeechSupported() && (
                  <>{" "}<button type="button" className="linklike" onClick={() => void speakEn(t.en).catch(() => undefined)}>🔊</button></>
                )}
                {t.zh && (
                  <>
                    <br />
                    <span className="dim">{t.zh}</span>
                  </>
                )}
              </p>
            ))}
          </div>
          <p className="fineprint">第 {turnCount} 轮 · 纠错会自动写入错误银行</p>
          <RoleplayRecorder sessionId={sessionId} lastAiEn={turns.filter((t) => t.who === "ai").at(-1)?.en ?? ""} />
          {lastCorrections.length > 0 && (
            <ul className="fineprint">
              {lastCorrections.map((c, i) => (
                <li key={i}>
                  <code>{c.wrong}</code> → <code>{c.right}</code> · {c.noteZh}
                </li>
              ))}
            </ul>
          )}
          <textarea
            className="text-input"
            rows={2}
            value={input}
            placeholder="用英文回复…"
            onChange={(event) => setInput(event.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!enabled || phase === "busy" || !input.trim()}
            onClick={() => void send()}
          >
            {phase === "busy" ? "对方思考中…" : "发送"}
          </button>
        </>
      )}
      {failZh && <p className="notice">{failZh}</p>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared history list
// ---------------------------------------------------------------------------

function HistoryList({
  rows,
  title,
  onDelete,
  onContinue,
}: {
  rows: ConversationRow[];
  title: string;
  onDelete: (id: string) => Promise<void>;
  onContinue?: (row: ConversationRow) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="fineprint">{title}（{rows.length}）</p>
      <ul className="task-list">
        {rows.map((row) => (
          <li key={row.id} className="task-row">
            <span className="task-main">
              <small>{new Date(row.updatedAt).toLocaleString()}</small>
              <small>{row.messages.length} 条消息</small>
            </span>
            <span>
              <button
                type="button"
                className="linklike"
                onClick={() => setOpenId(openId === row.id ? null : row.id)}
              >
                {openId === row.id ? "收起" : "查看"}
              </button>
              {onContinue && (
                <button type="button" className="linklike" onClick={() => onContinue(row)}>
                  继续
                </button>
              )}
              <button
                type="button"
                className="linklike"
                onClick={() => void onDelete(row.id)}
              >
                删除
              </button>
            </span>
            {openId === row.id && (
              <div className="example-box" style={{ width: "100%" }}>
                {(getMessagesSafe(row)).map((m, i) => (
                  <p key={i}>
                    <strong>{m.role}:</strong> {m.content}
                  </p>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function getMessagesSafe(row: ConversationRow): ConversationMessage[] {
  return row.messages ?? [];
}
