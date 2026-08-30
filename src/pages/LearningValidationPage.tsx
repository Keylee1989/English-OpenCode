import { useEffect, useMemo, useState } from "react";
import { getActiveAiProvider } from "@/ai/runtime";
import { gradeProductiveBatch, productiveEvidenceOf } from "@/ai/baseline-ai";
import { track } from "@/data/recorder";
import {
  buildAllRounds,
  SKILL_LABELS_ZH,
  type SkillRound,
} from "@/study/validation/run-baseline";
import { gradeProbeAnswer, estimateFromSkillAnswers } from "@/study/validation/session";
import {
  overallFromSkills,
  emptySkillRecord,
  loadBaselineCache,
  persistBaselineResult,
  bandDeltaFrom,
  compareBaselines,
  withBaselineMetadata,
  BASELINE_SKILLS,
  type BaselineResult,
} from "@/study/validation/baseline-model";
import type { Probe, ProbeAnswer } from "@/study/validation/banks/types";
import { internalCefrOf } from "@/study/validation/cefr-mapping";

/**
 * Adaptive Learning Validation / Baseline System (Phase 20 P1, expanded).
 *
 * Runs a short, adaptive band sweep across the six core skills (vocabulary,
 * grammar, reading, listening, speaking, writing), records evidence per probe,
 * estimates a per-skill and overall CEFR-ALIGNED level with an honest
 * confidence + limitations disclosure, and persists a baseline that later
 * rounds compare against (Day 30/60/90/180/360 deltas).
 *
 * Truthfulness: the result is an ESTIMATE, never official CEFR certification.
 * Productive speaking/writing probes use an optional AI grader and otherwise a
 * structured learner self-report (never fabricated auto-scores).
 */

type Phase = "loading" | "quiz" | "result";

interface AnswerRec {
  text: string;
  selfAssess: boolean;
}

function daySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function isProductiveOpen(p: Probe): boolean {
  return p.kind === "speaking-opinion" || p.kind === "writing-essay";
}

export default function LearningValidationPage({
  onBack,
}: {
  onBack?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [rounds, setRounds] = useState<SkillRound[]>([]);
  // Flat ordered walk across all skills.
  const [order, setOrder] = useState<Array<{ si: number; pi: number }>>([]);
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerRec>>({});
  const [aiGradeMap, setAiGradeMap] = useState<Map<string, boolean>>(new Map());
  const [aiNoteZh, setAiNoteZh] = useState<string | null>(null);
  const [failZh, setFailZh] = useState<string | null>(null);
  const [result, setResult] = useState<BaselineResult | null>(null);
  const [baseline, setBaseline] = useState<BaselineResult | null>(null);
  const [history, setHistory] = useState<BaselineResult[]>([]);

  useEffect(() => {
    void startSession(false);
  }, []);

  async function startSession(reshuffle: boolean): Promise<void> {
    setPhase("loading");
    setFailZh(null);
    setAnswers({});
    setAiGradeMap(new Map());
    setAiNoteZh(null);
    setResult(null);
    try {
      const { rounds: rds } = buildAllRounds(reshuffle ? Date.now() : daySeed());
      if (rds.length === 0 || rds.every((r) => r.probes.length === 0)) {
        setFailZh("无可用校验题，请稍后再试。");
        setPhase("result");
        return;
      }
      const ord: Array<{ si: number; pi: number }> = [];
      rds.forEach((r, si) => r.probes.forEach((_, pi) => ord.push({ si, pi })));
      const cache = await loadBaselineCache();
      setBaseline(cache.baseline);
      setHistory(cache.history);
      setRounds(rds);
      setOrder(ord);
      setCursor(0);
      setPhase("quiz");
    } catch {
      setFailZh("加载自适应校验失败，请重试。");
      setPhase("result");
    }
  }

  const keyFor = (si: number, pi: number): string => `${rounds[si]?.skill}-${rounds[si]?.probes[pi]?.id}`;
  const currentPair = order[cursor];
  const currentProbe: Probe | undefined =
    currentPair !== undefined ? rounds[currentPair.si]?.probes[currentPair.pi] : undefined;
  const currentSkill = currentPair !== undefined ? rounds[currentPair.si]?.skill : undefined;
  const currentKey = currentPair !== undefined ? keyFor(currentPair.si, currentPair.pi) : "";

  const answer: AnswerRec | undefined = currentKey ? answers[currentKey] : undefined;

  const canNext = useMemo(() => {
    if (!currentProbe) return false;
    const a = answer;
    if (isProductiveOpen(currentProbe)) {
      // open production requires a response or an explicit self-report.
      return (a?.text ?? "").trim().length >= 2 || (a?.selfAssess ?? false) === true;
    }
    return (a?.text ?? "").trim().length > 0;
  }, [currentProbe, answer]);

  function setText(value: string): void {
    if (!currentKey) return;
    setAnswers((prev) => ({
      ...prev,
      [currentKey]: { text: value, selfAssess: prev[currentKey]?.selfAssess ?? false },
    }));
  }

  function toggleSelfAssess(): void {
    if (!currentKey) return;
    const a = answers[currentKey];
    const next = a ? { ...a, selfAssess: !a.selfAssess } : { text: "", selfAssess: true };
    setAnswers((prev) => ({ ...prev, [currentKey]: next }));
  }

  function selectOption(opt: string): void {
    if (!currentKey) return;
    setAnswers((prev) => ({ ...prev, [currentKey]: { text: opt, selfAssess: false } }));
  }

  function advance(): void {
    if (!canNext) return;
    if (cursor + 1 < order.length) {
      setCursor((c) => c + 1);
    } else {
      void finishSession();
    }
  }

  async function finishSession(): Promise<void> {
    setPhase("loading");
    const provider = getActiveAiProvider();
    const providerName = provider ? `${provider.providerId}/${provider.modelId}` : null;

    // AI-grade open productive probes when a provider is available.
    const openIdx: Array<{ round: SkillRound; si: number; pi: number; probe: Probe; response: string }> = [];
    for (const si of rounds.keys()) {
      const round = rounds[si];
      for (let pi = 0; pi < round.probes.length; pi++) {
        const probe = round.probes[pi];
        const key = keyFor(si, pi);
        const a = answers[key];
        if (!a) continue;
        if (isProductiveOpen(probe) && (a.text ?? "").trim().length >= 2) {
          openIdx.push({ round, si, pi, probe, response: a.text.trim() });
        }
      }
    }

    if (openIdx.length > 0 && provider) {
      try {
        const graded = await gradeProductiveBatch(
          provider,
          openIdx.map((x) => ({ index: x.si * 1000 + x.pi, probe: x.probe, response: x.response })),
        );
        if (graded) {
          const m = new Map<string, boolean>();
          for (const g of graded) {
            const detail = openIdx.find((o) => o.si * 1000 + o.pi === g.index);
            if (detail) m.set(keyFor(detail.si, detail.pi), g.correct);
          }
          setAiGradeMap(m);
          const used = graded.filter((g) => openIdx.some((o) => o.si * 1000 + o.pi === g.index)).length;
          if (used > 0) {
            const evidence = productiveEvidenceOf(graded, openIdx.map((o) => ({ index: o.si * 1000 + o.pi, skill: `${SKILL_LABELS_ZH[o.probe.skill]}` })));
            const perSkill = evidence
              .filter((e) => e.evidenceZh)
              .slice(0, 3)
              .map((e) => `【${e.skill}】${e.evidenceZh}`)
              .join("；");
            setAiNoteZh(
              perSkill
                ? `由 ${providerName} 对开放式作答完成判分。判分依据：${perSkill}`
                : `由 ${providerName} 对开放式作答完成判分。`,
            );
          }
        } else {
          setAiNoteZh("AI 未返回有效判分，开放式题目改用自评。");
        }
      } catch {
        setAiNoteZh("AI 判分出错，开放式题目改用自评。");
      }
    } else if (openIdx.length > 0 && !provider) {
      setAiNoteZh("尚未连接 AI，口语/写作类开放式题目按你的自评记录（连接后在「AI 设置」可由 AI 判分）。");
    }

    // Build per-skill estimates from answers.
    const skills = emptySkillRecord();
    const testedItems: string[] = [];

    for (const si of rounds.keys()) {
      const round = rounds[si];
      const skill = round.skill;
      const graded: Record<number, ProbeAnswer | null> = {};
      for (let pi = 0; pi < round.probes.length; pi++) {
        const probe = round.probes[pi];
        const key = keyFor(si, pi);
        const a = answers[key];
        if (!a) continue;
        testedItems.push(probe.id);
        let correct: boolean | null;
        if (isProductiveOpen(probe)) {
          correct = aiGradeMap.get(key) ?? a.selfAssess;
        } else {
          const grad = gradeProbeAnswer(probe, a.text);
          correct = grad?.correct ?? null;
        }
        graded[pi] = correct === null ? null : { correct, answerText: a.text };
      }
      const { estimate } = estimateFromSkillAnswers(skill, round.probes, graded);
      skills[skill] = estimate;
    }

    const resultBaselineRaw = overallFromSkills(skills, 1, testedItems, undefined, [
      "本结果为测试算法给出的 CEFR 对齐估算（estimate），非官方 CEFR 认证。",
      aiGradeMap.size > 0
        ? "口语/写作已由 AI 判分。"
        : "未连接 AI，口语/写作开放式题目按自评记录，置信度相应降低。",
    ]);

    // Phase 22 (P0-6): attach longitudinal metadata (objective/self-report split).
    let objectiveCount = 0;
    for (const si of rounds.keys()) {
      const round = rounds[si];
      for (let pi = 0; pi < round.probes.length; pi++) {
        const probe = round.probes[pi];
        const key = keyFor(si, pi);
        const a = answers[key];
        if (!a) continue;
        if (!isProductiveOpen(probe) || aiGradeMap.get(key) !== undefined) objectiveCount++;
      }
    }
    const resultBaseline = withBaselineMetadata(resultBaselineRaw, {
      objectiveCount,
      evidenceIds: testedItems,
    });

    await persistBaselineResult(resultBaseline);

    // Telemetry: record one summary event per assessed skill.
    for (const s of BASELINE_SKILLS) {
      const est = skills[s];
      if (est && est.trials > 0) {
        await track({
          skill: s,
          interaction: "self-assess",
          correct: null,
          meta: {
            source: "adaptive-baseline",
            level: est.level,
            score: est.score,
            confidence: est.confidence,
          },
        });
      }
    }

    const cache = await loadBaselineCache();
    setBaseline(cache.baseline);
    setHistory(cache.history);
    setResult(resultBaseline);
    setPhase("result");
  }

  // ---------- rendering ----------
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
        <span className="dim">能力基线校验</span>
      </header>

      {phase === "loading" && <p className="dim">加载中…</p>}

      {phase === "quiz" && currentProbe && currentSkill && (
        <div className="card">
          <p className="step-progress">
            <span className="tag">{SKILL_LABELS_ZH[currentSkill]}</span> 校验 {cursor + 1} / {order.length}
            <span className="dim">（目标 {currentProbe.band}）</span>
          </p>
          {!isProductiveOpen(currentProbe) && currentProbe.kind === "listening-dictation" && (
            <p className="notice">此题为听力题：请朗读/播放口语句子后填入缺失单词。</p>
          )}
          <p className="dim">{currentProbe.promptZh}</p>
          <div className="en-prompt">{currentProbe.promptEn}</div>

          {currentProbe.options && currentProbe.options.length > 0 ? (
            <div className="option-list">
              {currentProbe.options.map((opt) => {
                const chosen = answer?.text === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`btn option-btn btn-block ${chosen ? "btn-selected" : ""}`}
                    onClick={() => selectOption(opt)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : currentProbe.kind === "speaking-opinion" || currentProbe.kind === "writing-essay" ? (
            <div>
              <textarea
                className="text-input area"
                value={answer?.text ?? ""}
                onChange={(e) => setText(e.target.value)}
                placeholder={currentProbe.kind === "speaking-opinion" ? "用英文口述并写下要点…" : "用英文作答…"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <label className="selfcheck">
                <input type="checkbox" checked={answer?.selfAssess ?? false} onChange={toggleSelfAssess} />
                我能自信、完整地完成此题（自评）
              </label>
            </div>
          ) : (
            <input
              className="text-input"
              value={answer?.text ?? ""}
              onChange={(e) => setText(e.target.value)}
              placeholder={"输入答案…"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
          )}

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!canNext}
            onClick={advance}
          >
            {cursor + 1 < order.length ? "下一题" : "完成并记录基线"}
          </button>
        </div>
      )}

      {phase === "result" && (
        <div className="card">
          <h2>能力基线（估算）</h2>
          {failZh && <p className="notice">{failZh}</p>}
          {result && (
            <>
              <p className="overall">
                综合 <strong>{result.overall.level}</strong>（{result.overall.score.toFixed(1)}）
                <span className="dim">  置信度 {(result.overall.confidence * 100).toFixed(0)}%</span>
              </p>
              {(() => {
                const derived = internalCefrOf(result.overall, "algorithm");
                return (
                  <p className="dim">来源：测试算法估算（{derived.caveatZh}）</p>
                );
              })()}
              {baseline && baseline.timestamp !== result.timestamp && (() => {
                const cmp = compareBaselines(baseline, result);
                return (
                  <p className="delta">
                    vs 首测 {baseline.overall.level}：
                    {cmp.overallBandDelta !== null && cmp.overallBandDelta !== 0
                      ? `${cmp.overallBandDelta > 0 ? "提升" : "回落"} ${Math.abs(cmp.overallBandDelta)} 档`
                      : "档位持平"}
                    <span className="dim">
                      {" "}
                      （评分 {cmp.overallRatingDelta !== null && cmp.overallRatingDelta >= 0 ? "+" : ""}
                      {cmp.overallRatingDelta ?? 0}，置信度
                      {cmp.overallConfidenceDelta !== null && cmp.overallConfidenceDelta >= 0 ? "+" : ""}
                      {(cmp.overallConfidenceDelta ?? 0).toFixed(3)}）
                    </span>
                  </p>
                );
              })()}
              <table className="skill-table">
                <thead>
                  <tr>
                    <th>技能</th>
                    <th>档位</th>
                    <th>分数</th>
                    <th>置信度</th>
                    <th>题量</th>
                  </tr>
                </thead>
                <tbody>
                  {BASELINE_SKILLS.map((s) => {
                    const est = result.skills[s];
                    const d = baseline ? bandDeltaFrom(result, baseline).skills?.[s] ?? 0 : 0;
                    return (
                      <tr key={s}>
                        <td>{SKILL_LABELS_ZH[s]}</td>
                        <td>{est.level}</td>
                        <td>{est.score.toFixed(0)}</td>
                        <td>{(est.confidence * 100).toFixed(0)}%</td>
                        <td>{est.trials}{d !== 0 && <span className="dim">（{d > 0 ? "+" : ""}{d}档）</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="tested">
                本次共测试 {result.testedItems.length} 题，正确 {result.stats.correct}。
                {typeof result.objectiveRatio === "number" && (
                  <span className="dim">
                    {" "}
                    （客观 {Math.round(result.objectiveRatio * 100)}%，自评{" "}
                    {Math.round((result.selfReportedRatio ?? 0) * 100)}%）
                  </span>
                )}
              </p>
              {history.length > 1 && (
                <p className="dim">
                  历史记录 {history.length} 次，可在多次校验后跟踪 Day 30/60/90/180/360 的档位变化。
                </p>
              )}
              <ul className="limitations">
                {result.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
              {aiNoteZh && <p className="notice">{aiNoteZh}</p>}
            </>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => void startSession(true)}
          >
            再次校验
          </button>
        </div>
      )}
    </div>
  );
}
