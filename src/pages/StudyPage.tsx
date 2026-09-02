import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allVocab, getDayContent } from "@/content";
import type { DayContent, VocabEntry } from "@/content/types";
import {
  applyReview,
  introduceItem,
  type DueCardView,
} from "@/engines/memory/memory-engine-v0";
import { buildPlan, type DayPlan, type PlanBlock } from "@/engines/planner/planner-v0";
import { track } from "@/data/recorder";
import {
  ensureDailySession,
  completeDay,
  finishDailySession,
  markBlockDone,
  markLessonDone,
} from "@/study/session";
import { gradeExercise, normalizeText } from "@/study/grade";
import {
  buildAssessmentExercises,
  buildPracticeExercises,
  buildReviewExercise,
  interactionFor,
  isProductionType,
} from "@/study/generate-exercises";
import {
  generateRemedialExercises,
  storeEnrichedError,
  type RemedialSpec,
} from "@/engines/errors/error-analysis-v0";
import { explainWordZh } from "@/phonics/decode";
import { isSpeechSupported, speakEn, stopSpeaking } from "@/speech/tts";
import { ShadowingRecorder } from "@/components/ShadowingRecorder";
import type { Exercise, ExerciseAnswer } from "@/study/exercise-types";
import { getActiveAiProvider, isAiReady } from "@/ai/runtime";
import { evaluateWriting, type WritingEvaluation } from "@/ai/tutor-service";
import {
  MILESTONE_DAYS,
  getAssessmentHistory,
  levelForScore,
  submitAssessment,
  type AssessmentSession,
} from "@/engines/assessment/assessment-v0";
import { isBetaMode, logBetaEvent } from "@/study/beta-mode";
import {
  isTelemetrySkill,
  recordBlockCompletion,
  type TelemetrySkill,
} from "@/study/telemetry/skill-telemetry";

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

const SKILL_LABEL_ZH: Record<string, string> = {
  vocabulary: "词汇 Vocabulary",
  listening: "听力 Listening",
  speaking: "口语 Speaking",
  reading: "阅读 Reading",
  writing: "写作 Writing",
  grammar: "语法 Grammar",
};

/** Ordered skill rows shown on the milestone result card. */
const MILESTONE_SKILL_ORDER = [
  "vocabulary",
  "listening",
  "speaking",
  "reading",
  "writing",
];

function averageSkillScore(session: AssessmentSession): number {
  const values = Object.values(session.skillScores);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Phase 11-A Task 1: instant milestone feedback card. Pure presentation over
 * the already-persisted AssessmentSession - no schema or grading changes.
 */
function MilestoneResultCard({
  session,
  previous,
  onContinue,
}: {
  session: AssessmentSession;
  previous: AssessmentSession | null;
  onContinue: () => void;
}) {
  const overall = averageSkillScore(session);
  const prevOverall = previous ? averageSkillScore(previous) : null;
  const delta =
    prevOverall === null ? null : overall - prevOverall;
  const improvedSkills = previous
    ? MILESTONE_SKILL_ORDER.filter(
        (skill) =>
          session.skillScores[skill] !== undefined &&
          previous.skillScores[skill] !== undefined &&
          session.skillScores[skill] > previous.skillScores[skill],
      )
    : [];
  return (
    <div className="card feedback fb-ok">
      <p className="fb-title">⭐ Milestone Completed · Day {session.day} 测评完成</p>
      <p>
        你的当前水平：<strong>{levelForScore(overall)}</strong>（综合 {overall} 分）
      </p>
      <div className="example-box">
        {MILESTONE_SKILL_ORDER.map((skill) => (
          <p key={skill} style={{ margin: "2px 0" }}>
            {SKILL_LABEL_ZH[skill] ?? skill}：
            <strong>{session.skillScores[skill] ?? "--"}</strong>
            {previous && previous.skillScores[skill] !== undefined && (
              <span className="dim">
                {" "}
                （上次 {previous.skillScores[skill]}）
              </span>
            )}
          </p>
        ))}
      </div>
      <p>
        相比上一次：
        {delta === null ? (
          <span className="dim">首次测评，已建立基准。</span>
        ) : delta >= 0 ? (
          <strong>+{delta}%</strong>
        ) : (
          <strong style={{ color: "var(--warn, #b45309)" }}>{delta}%</strong>
        )}
      </p>
      <p>
        提升项：
        {improvedSkills.length === 0 ? (
          <span className="dim">暂无（保持稳定也是进步）</span>
        ) : (
          improvedSkills.map((s) => SKILL_LABEL_ZH[s] ?? s).join("、")
        )}
      </p>
      <div>
        下一阶段建议：
        <ul style={{ margin: "4px 0 8px" }}>
          {session.recommendationsZh.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={onContinue}
      >
        继续学习计划
      </button>
    </div>
  );
}

function SpeakButton({ text }: { text: string }) {
  const [failed, setFailed] = useState(false);
  if (!isSpeechSupported()) return null;
  return (
    <span className="speak-wrap">
      <button
        type="button"
        className="btn btn-speak"
        aria-label="播放发音"
        onClick={() => {
          setFailed(false);
          speakEn(text).catch(() => setFailed(true));
        }}
      >
        🔊 播放
      </button>
      {failed && <span className="badge warn">播放失败</span>}
    </span>
  );
}

interface RunnerResult {
  correct: boolean | null;
  skipped?: boolean;
  /** Raw submitted text for typing/building answers (spelling analysis). */
  answerText?: string;
}

/** Renders one exercise of any type; grading + feedback included. */
function ExerciseRunner({
  exercise,
  onDone,
}: {
  exercise: Exercise;
  onDone: (result: RunnerResult) => void;
}) {
  const startedAt = useRef(Date.now());
  const [phase, setPhase] = useState<"answering" | "feedback">("answering");
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const submittedRef = useRef<string | undefined>(undefined);

  const audioMissing = Boolean(exercise.requiresAudio) && !isSpeechSupported();

  useEffect(() => {
    startedAt.current = Date.now();
    setPhase("answering");
    setText("");
    setPicked([]);
    setLastCorrect(null);
    submittedRef.current = undefined;
    return () => stopSpeaking();
  }, [exercise.id]);

  const finishWith = useCallback(
    (answer: ExerciseAnswer) => {
      if (answer.kind === "text") {
        submittedRef.current = answer.text;
      } else if (answer.kind === "tokens" && exercise.type === "sentence-order") {
        submittedRef.current = answer.order.map((i) => exercise.tokens[i]).join(" ");
      } else {
        submittedRef.current = undefined;
      }
      const result = gradeExercise(exercise, answer);
      setLastCorrect(result.correct);
      setPhase("feedback");
    },
    [exercise],
  );

  if (audioMissing) {
    return (
      <div className="card">
        <p className="dim">
          当前浏览器不支持语音合成，此听力/口语题已跳过。iOS Safari 支持语音，建议用 iPhone 学习。
        </p>
        <button
          type="button"
          className="btn btn-block"
          onClick={() => onDone({ correct: null, skipped: true })}
        >
          跳过此题
        </button>
      </div>
    );
  }

  if (phase === "feedback") {
    let answerText: string | undefined;
    let explain: string | undefined;
    switch (exercise.type) {
      case "mcq-meaning":
        answerText = `${exercise.wordEn} = ${exercise.optionsZh[exercise.answerIndex]}`;
        explain = exercise.explainZh;
        break;
      case "mcq-reverse":
        answerText = `${exercise.promptZh} = ${exercise.optionsEn[exercise.answerIndex]}`;
        explain = exercise.explainZh;
        break;
      case "mcq-listening-word":
        answerText = exercise.optionsEn[exercise.answerIndex];
        break;
      case "fill-blank":
        answerText = exercise.template.replace("___", exercise.answer);
        explain = exercise.explainZh;
        break;
      case "recall-type":
        answerText = exercise.answer;
        break;
      case "sentence-order":
        answerText = exercise.answer;
        break;
      case "shadowing":
        answerText = exercise.en;
        explain = "跟读结果为自评，不计入自动评分；多听示范、大声模仿即可。";
        break;
      case "listen-judge":
        answerText = exercise.isSame ? "一致" : "不一致（实际播放的是另一句）";
        break;
      case "phonics-discriminate":
        answerText = exercise.targetWord;
        explain = `听辨要点：${exercise.tipZh}`;
        break;
      case "grammar-correct":
        answerText = exercise.optionsEn[exercise.answerIndex];
        explain = exercise.explainZh;
        break;
      case "translate-zh-en":
        answerText = exercise.modelAnswer;
        explain = "以课程例句为准；意思一致即可接受。";
        break;
      case "guided-production":
        answerText = exercise.modelAnswer;
        explain =
          "自评对照完成——造句是真实输出练习，系统不做自动评分，只记录你的产出证据。";
        break;
      case "reading-comprehension":
        answerText = exercise.optionsEn[exercise.answerIndex];
        explain = exercise.explainZh;
        break;
    }
    return (
      <div className={`card feedback ${lastCorrect ? "fb-ok" : "fb-bad"}`}>
        <p className="fb-title">{lastCorrect ? "✓ 正确" : "✗ 答错了"}</p>
        {answerText && (
          <p>
            正确答案：<strong>{answerText}</strong>
          </p>
        )}
        {explain && <p className="dim">{explain}</p>}
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() =>
            onDone({
              correct: lastCorrect,
              answerText: submittedRef.current,
            })
          }
        >
          下一题
        </button>
      </div>
    );
  }

  switch (exercise.type) {
    case "mcq-meaning":
      return (
        <div className="card">
          <p className="ex-kicker">选出中文意思</p>
          <h2 className="ex-word">
            {exercise.wordEn} <SpeakButton text={exercise.wordEn} />
          </h2>
          {exercise.optionsZh.map((option) => (
            <button
              key={option}
              type="button"
              className="btn option-btn"
              onClick={() => finishWith({ kind: "choice", index: exercise.optionsZh.indexOf(option) })}
            >
              {option}
            </button>
          ))}
        </div>
      );
    case "mcq-reverse":
      return (
        <div className="card">
          <p className="ex-kicker">选出对应的英文</p>
          <h2 className="ex-word">{exercise.promptZh}</h2>
          {exercise.optionsEn.map((option) => (
            <button
              key={option}
              type="button"
              className="btn option-btn"
              onClick={() => finishWith({ kind: "choice", index: exercise.optionsEn.indexOf(option) })}
            >
              {option}
            </button>
          ))}
        </div>
      );
    case "mcq-listening-word":
      return (
        <div className="card">
          <p className="ex-kicker">听音选词</p>
          <h2 className="ex-word">先播放，再选出你听到的单词</h2>
          <div className="listen-play">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void speakEn(exercise.speakText).catch(() => undefined)}
            >
              ▶ 播放单词
            </button>
          </div>
          {exercise.optionsEn.map((option) => (
            <button
              key={option}
              type="button"
              className="btn option-btn"
              onClick={() => finishWith({ kind: "choice", index: exercise.optionsEn.indexOf(option) })}
            >
              {option}
            </button>
          ))}
        </div>
      );
    case "listen-judge":
      return (
        <div className="card">
          <p className="ex-kicker">听句子做判断</p>
          <div className="listen-play">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void speakEn(exercise.speakText).catch(() => undefined)}
            >
              ▶ 播放句子
            </button>
          </div>
          <p className="dim">屏幕上的句子：</p>
          <h3>{exercise.displaySentence}</h3>
          <p className="dim">{exercise.zh}</p>
          <p>播放的语音和屏幕上的句子一致吗？</p>
          <div className="row-2">
            <button type="button" className="btn option-btn" onClick={() => finishWith({ kind: "yes" })}>
              一致
            </button>
            <button type="button" className="btn option-btn" onClick={() => finishWith({ kind: "no" })}>
              不一致
            </button>
          </div>
        </div>
      );
    case "fill-blank":
    case "recall-type": {
      const prompt = exercise.type === "fill-blank" ? exercise.template : exercise.promptZh;
      const kicker =
        exercise.type === "fill-blank" ? "填空（输入英文）" : "主动回忆：中文 → 英文";
      const placeholder =
        exercise.type === "fill-blank" ? "填入空格处的词" : "输入英文";
      return (
        <div className="card">
          <p className="ex-kicker">{kicker}</p>
          <h2 className="ex-word">{prompt}</h2>
          {exercise.type === "fill-blank" && <p className="dim">{exercise.zh}</p>}
          <input
            className="text-input"
            value={text}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && text.trim().length > 0) {
                finishWith({ kind: "text", text });
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={text.trim().length === 0}
            onClick={() => finishWith({ kind: "text", text })}
          >
            提交
          </button>
        </div>
      );
    }
    case "sentence-order": {
      const used = picked.map((i) => exercise.tokens[i]);
      return (
        <div className="card">
          <p className="ex-kicker">连词成句（点击单词）</p>
          <p className="dim">{exercise.zh}</p>
          <div className="built-area" aria-live="polite">
            {used.length > 0 ? used.join(" ") : "点击下方单词组句…"}
          </div>
          <div className="chip-row">
            {exercise.tokens.map((token, index) => (
              <button
                key={`${token}-${index}`}
                type="button"
                className="chip"
                disabled={picked.includes(index)}
                onClick={() => setPicked((prev) => [...prev, index])}
              >
                {token}
              </button>
            ))}
          </div>
          <div className="row-2">
            <button
              type="button"
              className="btn"
              onClick={() => setPicked((prev) => prev.slice(0, -1))}
            >
              撤销
            </button>
            <button type="button" className="btn" onClick={() => setPicked([])}>
              清空
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={used.length !== exercise.tokens.length}
            onClick={() => finishWith({ kind: "tokens", order: picked })}
          >
            提交
          </button>
        </div>
      );
    }
    case "shadowing":
      return (
        <ShadowingRecorder
          en={exercise.en}
          zh={exercise.zh}
          itemKey={exercise.id}
          onSelfRated={(answer) => finishWith(answer)}
        />
      );
    case "phonics-discriminate":
      return (
        <div className="card">
          <p className="ex-kicker">听辨训练（最小对立对）</p>
          <p>播放的是哪一个单词？</p>
          <div className="listen-play">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void speakEn(exercise.speakText).catch(() => undefined)}
            >
              ▶ 播放
            </button>
            <span style={{ marginLeft: 8 }}>
              <SpeakButton text={exercise.speakText} />
            </span>
          </div>
          {exercise.optionsEn.map((option) => (
            <button
              key={option}
              type="button"
              className="btn option-btn"
              onClick={() =>
                finishWith({ kind: "choice", index: exercise.optionsEn.indexOf(option) })
              }
            >
              {option}
            </button>
          ))}
        </div>
      );
    case "grammar-correct":
      return (
        <div className="card">
          <p className="ex-kicker">改错：下面哪句是正确的？</p>
          <h3 className="ex-word wrong-sentence">{exercise.promptEn}</h3>
          {exercise.optionsEn.map((option) => (
            <button
              key={option}
              type="button"
              className="btn option-btn"
              onClick={() =>
                finishWith({ kind: "choice", index: exercise.optionsEn.indexOf(option) })
              }
            >
              {option}
            </button>
          ))}
        </div>
      );
    case "translate-zh-en":
      return (
        <div className="card">
          <p className="ex-kicker">中译英（输入完整句子）</p>
          <h2 className="ex-word">{exercise.promptZh}</h2>
          {exercise.hintEn && <p className="dim">{exercise.hintEn}</p>}
          <input
            className="text-input"
            value={text}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            placeholder="输入英文句子"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && text.trim().length > 0) {
                finishWith({ kind: "text", text });
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={text.trim().length === 0}
            onClick={() => finishWith({ kind: "text", text })}
          >
            提交
          </button>
        </div>
      );
    case "guided-production": {
      const written = text.trim();
      return (
        <div className="card">
          <p className="ex-kicker">造句练习</p>
          <h2 className="ex-word">{exercise.cueZh}</h2>
          <textarea
            className="text-input"
            rows={3}
            value={text}
            placeholder="在这里写你的英文句子…"
            onChange={(event) => setText(event.target.value)}
          />
          <p className="fineprint">
            写完后对照参考答案自评。系统不自动评分——这是诚实的产出练习。
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={written.length === 0}
            onClick={() => finishWith({ kind: "production-matched" })}
          >
            对照答案：我写得基本一致
          </button>
          <button
            type="button"
            className="btn option-btn"
            disabled={written.length === 0}
            onClick={() => finishWith({ kind: "production-off" })}
          >
            对照答案：差别较大
          </button>
        </div>
      );
    }
    case "reading-comprehension":
      return (
        <div className="card">
          <p className="ex-kicker">阅读理解</p>
          <p>{exercise.passage.en}</p>
          <p className="dim">{exercise.passage.zh}</p>
          <h3>{exercise.questionEn}</h3>
          {exercise.optionsEn.map((option) => (
            <button
              key={option}
              type="button"
              className="btn option-btn"
              onClick={() =>
                finishWith({ kind: "choice", index: exercise.optionsEn.indexOf(option) })
              }
            >
              {option}
            </button>
          ))}
        </div>
      );
  }
}

/** Runs a list of exercises sequentially. onEach persists evidence. */
function ExerciseSequence({
  exercises,
  onEach,
  onFinish,
  emptyTextZh,
}: {
  exercises: Exercise[];
  onEach: (
    exercise: Exercise,
    result: RunnerResult,
    latencyMs: number,
  ) => Promise<void>;
  onFinish: () => void;
  emptyTextZh: string;
}) {
  const [index, setIndex] = useState(0);
  const busy = useRef(false);

  if (exercises.length === 0) {
    return (
      <div className="card">
        <p className="dim">{emptyTextZh}</p>
        <button type="button" className="btn btn-block" onClick={onFinish}>
          继续
        </button>
      </div>
    );
  }

  const exercise = exercises[index];
  return (
    <>
      <p className="step-progress">
        第 {index + 1} / {exercises.length} 题
      </p>
      <ExerciseRunner
        key={exercise.id}
        exercise={exercise}
        onDone={(result) => {
          if (busy.current) return;
          busy.current = true;
          void onEach(exercise, result, Date.now()).then(() => {
            busy.current = false;
            if (index + 1 >= exercises.length) onFinish();
            else setIndex(index + 1);
          });
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Block implementations
// ---------------------------------------------------------------------------

/** Independent Reading study step (Phase 3b). */
function ReadingCard({ dayContent, onFinish }: { dayContent: DayContent; onFinish: () => void }) {
  const passages = dayContent.reading ?? [];
  return (
    <div className="card">
      <p className="step-progress">阅读练习</p>
      {passages.map((passage) => (
        <div key={passage.en} className="example-box">
          <p>
            <strong>{passage.en}</strong>{" "}
            <SpeakButton text={passage.en} />
          </p>
          <p className="dim">{passage.zh}</p>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => {
          void track({
            skill: "reading",
            interaction: "reading-comprehension",
            correct: null,
            meta: { selfReported: true },
          })
            .then(() =>
              // Phase 14 P0-1: block-level skill telemetry.
              recordBlockCompletion({
                day: dayContent.day,
                blockKind: "reading",
                skills: ["reading"],
                completed: true,
              }),
            )
            .then(onFinish);
        }}
      >
        我读完了
      </button>
    </div>
  );
}

/** Independent Writing study step (Phase 3b): real output + self-check.
 *  Phase 4-B: optional AI grading (evaluateWriting) with honest degradation;
 *  accepted corrections are recorded into the Error Bank. */
function WritingCard({ dayContent, onFinish }: { dayContent: DayContent; onFinish: () => void }) {
  const prompt = dayContent.writingPrompt;
  const [text, setText] = useState("");
  const aiReady = isAiReady();
  const [aiPhase, setAiPhase] = useState<"idle" | "grading">("idle");
  const [aiResult, setAiResult] = useState<WritingEvaluation | null>(null);
  const [aiFailZh, setAiFailZh] = useState<string | null>(null);
  // Phase 23 (P0-4): in-session "revise -> re-evaluate" loop. The learner can
  // edit their sentence after feedback and submit again to see the score delta.
  // Display-only: does not change persistence or grading criteria.
  const [aiHistory, setAiHistory] = useState<Array<{ score: number }>>([]);

  if (!prompt) {
    return (
      <div className="card">
        <button type="button" className="btn btn-block" onClick={onFinish}>
          继续
        </button>
      </div>
    );
  }

  // Phase 14 P0-1: both self-eval exits emit the same writing telemetry once.
  const finishWriting = async (): Promise<void> => {
    await recordBlockCompletion({
      day: dayContent.day,
      blockKind: "writing",
      skills: ["writing"],
      completed: true,
    });
    onFinish();
  };

  const runAiReview = async (): Promise<void> => {
    const provider = getActiveAiProvider();
    if (!provider) {
      setAiFailZh("AI 未配置：请先在「AI 设置」中连接服务。以下自评按钮不受影响。");
      return;
    }
    setAiPhase("grading");
    setAiFailZh(null);
    const submission = text.trim();
    try {
      const outcome = await evaluateWriting(provider, {
        promptEn: `${prompt.zh}（参考句式：${prompt.hintEn}）`,
        submission,
      });
      if (!outcome.ok) {
        setAiFailZh(outcome.reasonZh);
        return;
      }
      setAiResult(outcome.evaluation);
      setAiHistory((prev) => [...prev, { score: outcome.evaluation.score }]);
      // Accepted corrections become real Error Bank records (skill: writing).
      for (const fix of outcome.evaluation.corrections.slice(0, 5)) {
        await storeEnrichedError(
          {
            occurredAt: Date.now(),
            skill: "writing",
            category: "writing-mistake",
            descriptionZh: `“${fix.wrong}” → “${fix.right}”：${fix.noteZh}`,
            relatedItemIds: [],
          },
          {
            category: "writing-mistake",
            skill: "writing",
            interaction: "writing",
            answerText: submission,
          },
        );
      }
    } catch (err) {
      setAiFailZh(`AI 批改失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAiPhase("idle");
    }
  };

  return (
    <div className="card">
      <p className="step-progress">写作练习</p>
      <h2>{prompt.zh}</h2>
      <textarea
        className="text-input"
        rows={3}
        value={text}
        placeholder="在这里写你的英文句子…"
        onChange={(event) => setText(event.target.value)}
      />
      <p className="fineprint">参考句式：{prompt.hintEn}（系统不自动评分）</p>

      {aiReady && (
        <button
          type="button"
          className="btn option-btn btn-block"
          disabled={text.trim().length === 0 || aiPhase === "grading"}
          onClick={() => void runAiReview()}
        >
          {aiPhase === "grading" ? "AI 批改中…" : "AI 批改我的句子"}
        </button>
      )}
      {!aiReady && (
        <p className="fineprint">
          AI 批改未启用（可在「AI 设置」中配置后使用）。下方自评按钮始终可用。
        </p>
      )}

      {aiResult && (
        <div className="example-box">
          <p>
            <strong>AI 评分：{aiResult.score} / 100</strong>
            {aiHistory.length >= 2 && (
              <span className="dim">
                {" "}
                较上次{" "}
                {aiResult.score > aiHistory[aiHistory.length - 2].score
                  ? "▲ +"
                  : aiResult.score < aiHistory[aiHistory.length - 2].score
                    ? "▼ "
                    : "="}
                {Math.abs(aiResult.score - aiHistory[aiHistory.length - 2].score)}
              </span>
            )}
          </p>
          {aiResult.corrections.length === 0 ? (
            <p className="dim">没有发现需要修改的地方。</p>
          ) : (
            <ul>
              {aiResult.corrections.map((fix, index) => (
                <li key={`${fix.wrong}-${index}`}>
                  原句：<code>{fix.wrong}</code> → 修改：<code>{fix.right}</code>
                  <br />
                  <span className="dim">{fix.noteZh}</span>
                </li>
              ))}
            </ul>
          )}
          <p>改进建议：{aiResult.feedbackZh}</p>
          <p className="fineprint">以上修改已写入错误银行，复习计划会自动安排巩固。</p>
          {aiReady && (
            <button
              type="button"
              className="btn option-btn btn-block"
              disabled={text.trim().length === 0 || aiPhase === "grading"}
              onClick={() => void runAiReview()}
            >
              {aiPhase === "grading" ? "批改中…" : "修改后再评估（看进步）"}
            </button>
          )}
        </div>
      )}
      {aiFailZh && <p className="notice">{aiFailZh}</p>}

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={text.trim().length === 0}
        onClick={() => {
          void track({
            skill: "writing",
            interaction: "free-response",
            correct: true,
            production: true,
            selfReported: true,
            meta: { answerText: text.trim() },
          }).then(() => finishWriting());
        }}
      >
        对照参考：我写得基本一致
      </button>
      <button
        type="button"
        className="btn option-btn"
        disabled={text.trim().length === 0}
        onClick={() => {
          void track({
            skill: "writing",
            interaction: "free-response",
            correct: false,
            production: true,
            selfReported: true,
            errorCategory: "writing-mistake",
            errorDescriptionZh: "写作自评差距较大",
            meta: { answerText: text.trim() },
          }).then(() => finishWriting());
        }}
      >
        对照参考：差别较大
      </button>
    </div>
  );
}

const VOCAB_POOL = allVocab();

/** Targeted drills built from Error Analysis remedial specs (Phase 2). */
function DrillFlow({ specs, onFinish }: { specs: RemedialSpec[]; onFinish: () => void }) {
  const exercises = useMemo(() => generateRemedialExercises(specs), [specs]);
  // Phase 14 P0-1: derive the skills these drills actually target.
  const drillSkills = useMemo(() => {
    const skills = new Set<string>(
      specs.map((spec) =>
        spec.kind === "items" ? "vocabulary" : spec.kind === "phonics" ? "phonics" : "grammar",
      ),
    );
    return [...skills].filter(
      (skill): skill is Parameters<typeof recordBlockCompletion>[0]["skills"][number] =>
        skill === "vocabulary" || skill === "phonics" || skill === "grammar",
    );
  }, [specs]);

  const handleEach = async (
    exercise: Exercise,
    result: RunnerResult,
    latencyMs: number,
  ): Promise<void> => {
    const mapping = interactionFor(exercise.type);
    const itemId = "itemId" in exercise ? exercise.itemId : undefined;

    if (result.skipped) {
      await track({
        skill: mapping.skill,
        interaction: mapping.interaction,
        itemId,
        correct: null,
        meta: { isDrill: true, skipped: true },
      });
      return;
    }

    await track({
      skill: mapping.skill,
      interaction: mapping.interaction,
      itemId,
      correct: result.correct,
      difficulty: 0.5,
      latencyMs,
      production: isProductionType(exercise.type),
      errorCategory: result.correct ? undefined : "drill-retry-mistake",
      errorDescriptionZh: "专项训练中再次答错",
      meta: {
        isDrill: true,
        ...(result.answerText ? { answerText: result.answerText } : {}),
      },
    });
    if (itemId && result.correct !== null) {
      await applyReview({
        itemId,
        grade: result.correct ? 1 : 0,
        production: isProductionType(exercise.type),
      });
    }
  };

  return (
    <ExerciseSequence
      exercises={exercises}
      onEach={handleEach}
      onFinish={() => {
        void recordBlockCompletion({
          day: 0, // drills are day-agnostic remediation
          blockKind: "drill",
          skills: drillSkills.length > 0 ? drillSkills : ["grammar"],
          completed: true,
        }).then(onFinish);
      }}
      emptyTextZh="没有可生成的专项练习，直接继续。"
    />
  );
}

function ReviewFlow({ cards, onFinish }: { cards: DueCardView[]; onFinish: () => void }) {
  const exercises = useMemo(
    () =>
      cards
        .map((card) => buildReviewExercise(card, VOCAB_POOL))
        .filter((exercise): exercise is Exercise => exercise !== null),
    [cards],
  );

  const handleEach = async (
    exercise: Exercise,
    result: RunnerResult,
    latencyMs: number,
  ): Promise<void> => {
    const mapping = interactionFor(exercise.type);
    const itemId = "itemId" in exercise ? exercise.itemId : undefined;

    if (result.skipped) {
      await track({
        skill: mapping.skill,
        interaction: mapping.interaction,
        itemId,
        correct: null,
        meta: { isReview: true, skipped: true },
      });
      return;
    }

    await track({
      skill: mapping.skill,
      interaction: mapping.interaction,
      itemId,
      correct: result.correct,
      difficulty: 0.5,
      latencyMs,
      production: isProductionType(exercise.type),
      errorCategory: result.correct ? undefined : "review-recall-failure",
      errorDescriptionZh: "复习时未能正确回忆",
      meta: {
        isReview: true,
        ...(result.answerText ? { answerText: result.answerText } : {}),
      },
    });
    if (itemId && result.correct !== null) {
      await applyReview({
        itemId,
        grade: result.correct ? 1 : 0,
        production: isProductionType(exercise.type),
      });
    }
  };

  return (
    <ExerciseSequence
      exercises={exercises}
      onEach={handleEach}
      onFinish={() => {
        // Phase 14 P0-1: review block = vocabulary spiral telemetry.
        void recordBlockCompletion({
          day: 0,
          blockKind: "review",
          skills: ["vocabulary"],
          completed: true,
        }).then(onFinish);
      }}
      emptyTextZh="没有可运行的复习题（缺少内容映射），直接继续。"
    />
  );
}

function LessonFlow({ dayContent, onFinish }: { dayContent: DayContent; onFinish: () => void }) {
  // -1 = intro; 0..n-1 = vocab cards; n = pattern card (final lesson step).
  const [index, setIndex] = useState(-1);
  const totalVocab = dayContent.vocab.length;
  // Phase 11-C Task 6: difficulty feedback UI is visible in beta mode only.
  const [beta, setBeta] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  // Phase 14 P0-1: last one-tap rating travels with the lesson telemetry row.
  const ratingRef = useRef<"偏易" | "适中" | "偏难" | undefined>(undefined);

  useEffect(() => {
    void isBetaMode().then(setBeta);
  }, []);

  const vocabDone = async (entry: VocabEntry): Promise<void> => {
    await track({
      skill: "vocabulary",
      interaction: "learn-new",
      itemId: entry.id,
      correct: null,
      difficulty: entry.difficulty,
    });
    await introduceItem(entry.id, entry.difficulty);
    setIndex(index + 1);
  };

  const finishPattern = async (): Promise<void> => {
    await markLessonDone(dayContent.day);
    await logBetaEvent("lesson-complete", { day: dayContent.day });
    // Phase 14 P0-1: skill telemetry for the lesson block.
    await recordBlockCompletion({
      day: dayContent.day,
      blockKind: "lesson",
      skills: ["vocabulary"],
      completed: true,
      difficultyFeedback: ratingRef.current,
    });
    onFinish();
  };

  if (index === -1) {
    return (
      <div className="card">
        <h2>{dayContent.titleZh}</h2>
        <p className="dim">{dayContent.goalZh}</p>
        <p>
          <strong>拼读提示：</strong>
          {dayContent.phonicsNoteZh}
        </p>
        {/* Phase 11-C Task 7: new-user orientation - what / how / why. */}
        {dayContent.day <= 30 && (
          <p className="hint-box">
            学什么：今天的生词和句型 · 怎么学：先看词卡，再学句型，最后练习巩固 ·
            为什么：当堂多次接触记得更牢
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setIndex(0)}
        >
          开始学单词（{totalVocab} 个）
        </button>
        {/* Phase 11-C Task 6: beta-only one-tap difficulty feedback. */}
        {beta && (
          <div style={{ marginTop: 8 }}>
            {feedbackSent ? (
              <p className="fineprint">难度反馈已记录，谢谢！</p>
            ) : (
              <>
                <p className="fineprint" style={{ margin: "4px 0" }}>
                  Beta 反馈：本课感觉…
                </p>
                <div className="row-2">
                  {(["偏易", "适中", "偏难"] as const).map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className="btn option-btn"
                      onClick={() => {
                        setFeedbackSent(true);
                        ratingRef.current = rating;
                        void logBetaEvent("difficulty-feedback", {
                          day: dayContent.day,
                          skill: "vocabulary",
                          rating,
                        });
                      }}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  if (index >= totalVocab) {
    const pattern = dayContent.pattern;
    return (
      <div className="card">
        <p className="step-progress">今日句型</p>
        <h2>{pattern.titleZh}</h2>
        <p>{pattern.explainZh}</p>
        <div className="example-box">
          {pattern.examples.map((example) => (
            <p key={example.en}>
              <strong>{example.en}</strong> <SpeakButton text={example.en} />
              <br />
              <span className="dim">{example.zh}</span>
            </p>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => void finishPattern()}
        >
          明白了，去练习
        </button>
      </div>
    );
  }

  const entry = dayContent.vocab[index];
  return (
    <div className="card word-card">
      <p className="step-progress">
        生词 {index + 1} / {totalVocab}
      </p>
      <h1 className="word-big">{entry.word}</h1>
      <p className="ipa">{entry.ipa}</p>
      <SpeakButton text={entry.word} />
      <p className="decode-line">
        拼读：<strong>{explainWordZh(entry.word)}</strong>
      </p>
      <p className="word-zh">{entry.zh}</p>
      <p className="dim">{entry.pos}</p>
      {entry.phonicsHintZh && <p className="hint-box">拼读：{entry.phonicsHintZh}</p>}
      <div className="example-box">
        <p>
          <strong>{entry.example.en}</strong> <SpeakButton text={entry.example.en} />
        </p>
        <p className="dim">{entry.example.zh}</p>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => void vocabDone(entry)}
      >
        我记住了
      </button>
    </div>
  );
}

function summarizeExercise(exercise: Exercise): string {
  switch (exercise.type) {
    case "mcq-meaning":
      return `${exercise.wordEn} 的意思`;
    case "mcq-reverse":
      return `“${exercise.promptZh}”对应的英文`;
    case "mcq-listening-word":
      return "听音辨词";
    case "listen-judge":
      return "听句判断";
    case "fill-blank":
      return normalizeText(exercise.template);
    case "recall-type":
      return `“${exercise.promptZh}”的英文拼写`;
    case "sentence-order":
      return "连词成句";
    case "shadowing":
      return "跟读自评";
    case "phonics-discriminate":
      return "最小对立听辨";
    case "grammar-correct":
      return "句子改错";
    case "translate-zh-en":
      return "中译英";
    case "guided-production":
      return "造句输出";
    case "reading-comprehension":
      return "阅读理解";
  }
}

function findVocabLocal(itemId: string): VocabEntry | null {
  return VOCAB_POOL.find((entry) => entry.id === itemId) ?? null;
}

function PracticeOrAssessment({
  dayContent,
  mode,
  extraListening,
  extraRecall,
  onFinish,
  onMilestone,
}: {
  dayContent: DayContent;
  mode: "practice" | "assessment";
  extraListening: boolean;
  extraRecall: boolean;
  onFinish: () => void;
  /** Phase 11-A: receives the persisted session right after a milestone assessment. */
  onMilestone?: (session: AssessmentSession) => void;
}) {
  const audio = isSpeechSupported();
  const exercises = useMemo(
    () =>
      mode === "practice"
        ? buildPracticeExercises(dayContent, {
            audioAvailable: audio,
            extraListening,
            extraRecall,
          })
        : buildAssessmentExercises(dayContent, { audioAvailable: audio }),
    [dayContent, mode, audio, extraListening, extraRecall],
  );

  let correctCount = 0;
  // Phase 6: collect per-skill outcomes so milestone days persist a session.
  const assessmentOutcomes: Array<{ skill: string; correct: boolean | null; selfReported: boolean }> = [];
  // Phase 14 P0-1: every skill this practice/assessment actually exercised.
  // (SkillKey includes "pronunciation", which the telemetry enum folds away.)
  const touchedSkills = new Set<string>();

  const handleEach = async (
    exercise: Exercise,
    result: RunnerResult,
    latencyMs: number,
  ): Promise<void> => {
    const mapping = interactionFor(exercise.type);
    const itemId = "itemId" in exercise ? exercise.itemId : undefined;
    touchedSkills.add(mapping.skill);

    if (result.skipped) {
      if (mode === "assessment") {
        assessmentOutcomes.push({ skill: mapping.skill, correct: null, selfReported: false });
      }
      await track({
        skill: mapping.skill,
        interaction: mapping.interaction,
        itemId,
        correct: null,
        meta: { skipped: true },
      });
      return;
    }

    if (result.correct) correctCount += 1;
    if (mode === "assessment") {
      assessmentOutcomes.push({ skill: mapping.skill, correct: result.correct, selfReported: false });
    }
    const entry = itemId ? findVocabLocal(itemId) : null;
    await track({
      skill: mapping.skill,
      interaction: mapping.interaction,
      itemId,
      correct: result.correct,
      difficulty: entry?.difficulty ?? 0.4,
      latencyMs,
      production: isProductionType(exercise.type),
      errorCategory: result.correct ? undefined : `${mapping.skill}-mistake`,
      errorDescriptionZh: result.correct
        ? undefined
        : `练习答错：${summarizeExercise(exercise)}`,
      meta: {
        ...(result.answerText ? { answerText: result.answerText } : {}),
        ...(mapping.skill === "grammar" && exercise.type !== "phonics-discriminate"
          ? { grammarNodeId: `g:${dayContent.pattern.id}` }
          : {}),
      },
    });
    // Practice/assessment retrievals count as real repetitions in the SRS:
    // a correct first retrieval schedules tomorrow's review; a failure
    // keeps the item near-now for re-testing.
    if (itemId && !result.skipped && result.correct !== null) {
      await applyReview({
        itemId,
        grade: result.correct ? 1 : 0,
        production: isProductionType(exercise.type),
      });
    }
  };

  const handleFinish = async (): Promise<void> => {
    // Phase 14 P0-1: per-skill block completion telemetry.
    await recordBlockCompletion({
      day: dayContent.day,
      blockKind: mode === "assessment" ? "assessment" : "practice",
      skills: [...touchedSkills].filter((skill): skill is TelemetrySkill =>
        isTelemetrySkill(skill),
      ),
      completed: true,
    });
    if (mode === "assessment") {
      const score =
        exercises.length > 0 ? Math.round((correctCount / exercises.length) * 100) : 0;
      await completeDay(dayContent.day, score);
      await markBlockDone(`assessment-${dayContent.day}`);
      // Phase 6: milestone days persist a formal session for the Growth Report.
      if ((MILESTONE_DAYS as readonly number[]).includes(dayContent.day)) {
        try {
          const session = await submitAssessment(
            dayContent.day,
            assessmentOutcomes.map((outcome) => ({
              skill: outcome.skill,
              correct: outcome.correct,
              selfReported: false,
            })),
          );
          // Phase 11-A Task 1: instant result card replaces the plain "next".
          if (onMilestone) {
            await finishDailySession();
            onMilestone(session);
            return;
          }
        } catch {
          // Never block the flow; the daily score is still saved above.
        }
      }
      await finishDailySession();
    } else {
      await markBlockDone(`practice-${dayContent.day}`);
    }
    onFinish();
  };

  return (
    <ExerciseSequence
      key={mode}
      exercises={exercises}
      onEach={handleEach}
      onFinish={() => void handleFinish()}
      emptyTextZh="本环节没有可用题目（可能因设备不支持语音且无替代题）。"
    />
  );
}

// ---------------------------------------------------------------------------
// Study page controller
// ---------------------------------------------------------------------------

export default function StudyPage({ onExit }: { onExit: () => void }) {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState(false);
  // Phase 11-A Task 1: when set, the milestone instant result card is shown.
  const [milestoneView, setMilestoneView] = useState<{
    session: AssessmentSession;
    previous: AssessmentSession | null;
  } | null>(null);
  const goNextRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    void (async () => {
      await ensureDailySession();
      const nextPlan = await buildPlan();
      setPlan(nextPlan);
      setReady(true);
      // Phase 11-C Task 6: beta telemetry - session lifecycle.
      if (await isBetaMode()) {
        await logBetaEvent("session-start", { blocks: nextPlan.blocks.length });
      }
    })();
  }, []);

  // Beta telemetry: a completed full-session run.
  useEffect(() => {
    if (finished) void logBetaEvent("session-end", {});
  }, [finished]);

  if (!ready || !plan) {
    return (
      <div className="page">
        <p className="dim">准备学习计划…</p>
      </div>
    );
  }

  // Phase 11-A Task 1: instant milestone feedback pauses the step flow.
  if (milestoneView) {
    return (
      <div className="page">
        <MilestoneResultCard
          session={milestoneView.session}
          previous={milestoneView.previous}
          onContinue={() => {
            setMilestoneView(null);
            goNextRef.current?.();
          }}
        />
      </div>
    );
  }

  if (finished) {
    return (
      <div className="page">
        <div className="card">
          <h2>今日学习完成 🎉</h2>
          <p className="dim">学习证据已保存，能力模型与复习计划已更新。</p>
          <a href="#/report" role="button" className="btn btn-primary btn-block">
            查看今日学习报告
          </a>
          <button type="button" className="btn btn-block" onClick={onExit}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // Phase 3b: interleave independent Reading / Writing study steps
  // right after the Lesson block (flow order per master spec).
  type LocalBlock =
    | PlanBlock
    | { kind: "reading"; day: number }
    | { kind: "writing"; day: number };

  const baseBlocks = plan.blocks.filter(
    (block) => block.kind !== "review" || block.dueCount > 0,
  );
  const blocks: LocalBlock[] = [];
  for (const block of baseBlocks) {
    blocks.push(block);
    if (block.kind === "lesson") {
      const dayContent = getDayContent(block.day);
      if (dayContent?.reading?.length) blocks.push({ kind: "reading", day: block.day });
      if (dayContent?.writingPrompt) blocks.push({ kind: "writing", day: block.day });
    }
  }

  if (blocks.length === 0) {
    return (
      <div className="page">
        <div className="card">
          <h2>今天没有待办任务</h2>
          <p className="dim">复习队列是空的，课程也已完成或暂未开放。</p>
          <button type="button" className="btn btn-primary btn-block" onClick={onExit}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const step = Math.min(stepIndex, blocks.length - 1);
  const block: LocalBlock = blocks[step];
  const content = "day" in block ? getDayContent(block.day) : null;

  const goNext = () => {
    if (step + 1 >= blocks.length) setFinished(true);
    else setStepIndex(step + 1);
  };
  goNextRef.current = goNext;

  // Gamification v0: review/drill blocks earn XP via markBlockDone prefixes.
  const reviewDone = () => {
    void markBlockDone("review").catch(() => undefined).then(goNext, goNext);
  };
  const drillDone = () => {
    void markBlockDone("drill-completed").catch(() => undefined).then(goNext, goNext);
  };

  let body;
  if (block.kind === "reading") {
    const rc = getDayContent(block.day);
    body = rc ? <ReadingCard dayContent={rc} onFinish={goNext} /> : <div className="card"><p className="dim">无阅读内容。</p><button type="button" className="btn btn-block" onClick={goNext}>跳过</button></div>;
  } else if (block.kind === "writing") {
    const wc = getDayContent(block.day);
    body = wc ? <WritingCard dayContent={wc} onFinish={goNext} /> : <div className="card"><p className="dim">无写作任务。</p><button type="button" className="btn btn-block" onClick={goNext}>跳过</button></div>;
  } else if (block.kind === "review") {
    body = <ReviewFlow cards={plan.dueCards} onFinish={reviewDone} />;
  } else if (block.kind === "drill") {
    body = <DrillFlow specs={block.specs} onFinish={drillDone} />;
  } else if (!content) {
    body = (
      <div className="card">
        <p className="dim">该天内容尚未上线。</p>
        <button type="button" className="btn btn-block" onClick={goNext}>
          跳过
        </button>
      </div>
    );
  } else if (block.kind === "lesson") {
    body = <LessonFlow dayContent={content} onFinish={goNext} />;
  } else if (block.kind === "practice") {
    body = (
      <PracticeOrAssessment
        dayContent={content}
        mode="practice"
        extraListening={block.extraListening}
        extraRecall={block.extraRecall}
        onFinish={goNext}
      />
    );
  } else {
    body = (
      <PracticeOrAssessment
        dayContent={content}
        mode="assessment"
        extraListening={false}
        extraRecall={false}
        onFinish={goNext}
        onMilestone={(session) => {
          void (async () => {
            // Previous milestone (older than this one) powers the delta view.
            let previous: AssessmentSession | null = null;
            try {
              const history = await getAssessmentHistory();
              previous =
                history.find(
                  (row) => row.day !== session.day && row.completedAt < session.completedAt,
                ) ?? null;
            } catch {
              previous = null;
            }
            setMilestoneView({ session, previous });
          })();
        }}
      />
    );
  }

  return (
    <div className="page">
      <header className="step-header">
        <button
          type="button"
          className="linklike"
          onClick={() => {
            // Phase 11-C/12: beta mode records WHERE the learner gave up
            // (step index + block kind + curriculum day) for funnel analysis.
            if (!finished && blocks.length > 0) {
              void logBetaEvent("drop-off", {
                step: stepIndex + 1,
                total: blocks.length,
                blockKind: "kind" in block ? block.kind : "unknown",
                day: "day" in block ? block.day : null,
                titleZh: "titleZh" in block ? block.titleZh : null,
              });
            }
            onExit();
          }}
        >
          ← 首页
        </button>
        <span className="dim">
          步骤 {step + 1}/{blocks.length} · {"titleZh" in block ? block.titleZh : "阅读与写作"}
        </span>
      </header>
      {body}
    </div>
  );
}
