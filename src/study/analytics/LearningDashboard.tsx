import { useEffect, useState } from "react";
import {
  getAnalyticsBundle,
  getEffectivenessReport,
  getFirstWeekHealth,
  getMemoryHealth,
  type AnalyticsBundle,
  type EffectivenessReport,
  type FirstWeekHealth,
  type MemoryHealth,
} from "@/study/analytics/analytics";
import { isBetaMode } from "@/study/beta-mode";
import BetaDashboardPage from "@/study/beta/BetaDashboard";
import CohortDashboardPage from "@/study/beta/CohortDashboard";
import WeeklyReport from "@/study/analytics/WeeklyReport";

/**
 * Phase 11-B Task 4: Learning Dashboard (read-only).
 * Renders behavior + effectiveness aggregates produced by analytics.ts.
 * Pure display: no writes, no study-flow coupling.
 */

function Bar({ value, max }: { value: number; max: number }) {
  const width = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      style={{
        background: "var(--surface-2, #e5e7eb)",
        borderRadius: 4,
        height: 8,
        minWidth: 80,
        flex: 1,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${width}%`,
          height: "100%",
          background: "var(--primary, #2563eb)",
          borderRadius: 4,
        }}
      />
    </div>
  );
}

export default function LearningDashboardPage() {
  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [failZh, setFailZh] = useState<string | null>(null);
  const [beta, setBeta] = useState(false);
  const [memory, setMemory] = useState<MemoryHealth | null>(null);
  const [firstWeek, setFirstWeek] = useState<FirstWeekHealth | null>(null);
  const [effectiveness, setEffectiveness] = useState<EffectivenessReport | null>(null);

  useEffect(() => {
    void getAnalyticsBundle(30).then(setBundle).catch((err) => {
      setFailZh(`加载分析失败：${err instanceof Error ? err.message : String(err)}`);
    });
    void getMemoryHealth().then(setMemory).catch(() => undefined);
    void getFirstWeekHealth().then(setFirstWeek);
    void getEffectivenessReport().then(setEffectiveness);
    void isBetaMode().then(setBeta);
  }, []);

  const maxMinutes = bundle
    ? Math.max(1, ...bundle.behavior.days.map((d) => d.minutes))
    : 1;

  return (
    <div className="page">
      <header className="step-header">
        <a href="#/" className="linklike">
          ← 首页
        </a>
        <span className="dim">学习数据分析（只读）</span>
      </header>

      {failZh && <p className="notice">{failZh}</p>}
      {!bundle && !failZh && (
        <div className="card">
          <p className="dim">正在汇总你的真实学习数据…</p>
        </div>
      )}

      {bundle && (
        <>
          {/* Phase 13 P1-1: weekly share-card report. */}
          <WeeklyReport />

          {/* Phase 14 P0-2: first-week health funnel. */}
          {firstWeek && (
            <section className="card" aria-label="First Week Health">
              <h2>First Week Health（首周健康度）</h2>
              <div className="status-line">
                <span className="label">Day1 完成率</span>
                <span className={firstWeek.day1CompletionPercent > 0 ? "badge ok" : "badge warn"}>
                  {firstWeek.day1CompletionPercent}%
                </span>
              </div>
              <div className="status-line">
                <span className="label">Day3 留存率</span>
                <span className={firstWeek.day3RetentionPercent > 0 ? "badge ok" : "badge muted"}>
                  {firstWeek.day3RetentionPercent}%
                </span>
              </div>
              <div className="status-line">
                <span className="label">Day7 留存率</span>
                <span className={firstWeek.day7RetentionPercent > 0 ? "badge ok" : "badge muted"}>
                  {firstWeek.day7RetentionPercent}%
                </span>
              </div>
            </section>
          )}

          <section className="card" aria-label="学习行为">
            <h2>学习行为（近 30 天）</h2>
            <p style={{ margin: "4px 0" }}>
              🔥 连续学习 <strong>{bundle.behavior.streakDays}</strong> 天（最佳{" "}
              {bundle.behavior.bestStreakDays}）· 活跃 {bundle.behavior.activeDays} 天
            </p>
            <p style={{ margin: "4px 0" }}>
              累计时长 <strong>{bundle.behavior.totalMinutes}</strong> 分钟 · 累计{" "}
              <strong>{bundle.behavior.totalXp}</strong> XP · 日均（活跃日）
              {" "}
              {bundle.behavior.avgMinutesPerActiveDay} 分钟
            </p>
            <div style={{ display: "grid", gap: 3, marginTop: 10 }}>
              {[...bundle.behavior.days].reverse().map((day) => (
                <div key={day.dateISO} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <small style={{ width: 84, color: "var(--text-dim, #6b7280)" }}>
                    {day.dateISO.slice(5)}
                  </small>
                  <Bar value={day.minutes} max={maxMinutes} />
                  <small style={{ width: 96, textAlign: "right", color: "var(--text-dim, #6b7280)" }}>
                    {day.minutes} 分 · {day.xp} XP
                  </small>
                </div>
              ))}
            </div>
          </section>

          <section className="card" aria-label="学习效果">
            <h2>学习效果</h2>
            <div className="status-line">
              <span className="label">词汇保持率</span>
              <span className={bundle.effectiveness.vocabularyRetentionPercent >= 70 ? "badge ok" : "badge warn"}>
                {bundle.effectiveness.vocabularyRetentionPercent}%（{bundle.effectiveness.gradedVocabItems} 个已测词）
              </span>
            </div>
            <div className="status-line">
              <span className="label">口语录音尝试</span>
              <span>{bundle.effectiveness.speakingAttemptCount} 次</span>
            </div>
            <div className="status-line">
              <span className="label">错误银行累计</span>
              <span>{bundle.effectiveness.errorTotal} 条</span>
            </div>
            {bundle.effectiveness.errorsWithFollowUp > 0 && (
              <div className="status-line">
                <span className="label">错误改善率（错后重做答对）</span>
                <span className={bundle.effectiveness.errorImprovementRatePercent >= 60 ? "badge ok" : "badge warn"}>
                  {bundle.effectiveness.errorImprovementRatePercent}%（{bundle.effectiveness.errorsWithFollowUp} 条有后续作答）
                </span>
              </div>
            )}

            {bundle.effectiveness.errorTopCategories.length > 0 && (
              <>
                <p className="fineprint" style={{ marginTop: 8 }}>
                  高频错误类型 Top 5：
                </p>
                <ul className="engine-list">
                  {bundle.effectiveness.errorTopCategories.map((item) => (
                    <li key={item.category}>
                      <span>{item.category}</span>
                      <span className="badge muted">{item.count} 次</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {bundle.completionCurve.length > 0 && (
              <>
                <p className="fineprint" style={{ marginTop: 8 }}>
                  课程完成率曲线（Day 1-{bundle.completionCurve.length}，已完成 100% / 学过课程未测 50%）：
                </p>
                <div style={{ display: "grid", gap: 3 }}>
                  {bundle.completionCurve.slice(-30).map((point) => (
                    <div key={point.day} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <small style={{ width: 56, color: "var(--text-dim, #6b7280)" }}>
                        Day {point.day}
                      </small>
                      <Bar value={point.percent} max={100} />
                      <small style={{ width: 40, textAlign: "right", color: "var(--text-dim, #6b7280)" }}>
                        {point.percent}%
                      </small>
                    </div>
                  ))}
                </div>
              </>
            )}

            {bundle.effectiveness.assessmentHistory.length > 0 && (
              <>
                <p className="fineprint" style={{ marginTop: 8 }}>
                  测评成长曲线：
                </p>
                <ul className="engine-list">
                  {bundle.effectiveness.assessmentHistory.map((row) => (
                    <li key={`${row.day}-${row.completedAt}`}>
                      <span>
                        Day {row.day} · {row.level}
                      </span>
                      <span className="badge info">{row.overallScore} 分</span>
                    </li>
                  ))}
                </ul>
                {bundle.effectiveness.assessmentGrowthPoints !== null && (
                  <p style={{ margin: "6px 0 0" }}>
                    阶段成长：<strong>+{bundle.effectiveness.assessmentGrowthPoints} 分</strong>
                    （首次 → 最近一次里程碑测评）
                  </p>
                )}
              </>
            )}
          </section>

          <p className="fineprint">
            数据截至 {new Date(bundle.generatedAt).toLocaleString()}。全部指标来自本地真实学习记录，只读展示。
          </p>

          {/* Phase 14 P0-3: learning effectiveness report. */}
          {effectiveness && (
            <section className="card" aria-label="学习效果报告">
              <h2>学习效果报告</h2>

              <p className="fineprint" style={{ margin: "6px 0 2px" }}>
                词汇
              </p>
              <div className="status-line">
                <span className="label">累计新学</span>
                <span>{effectiveness.vocabulary.newWordsIntroduced} 词</span>
              </div>
              <div className="status-line">
                <span className="label">已掌握（产出级）</span>
                <span className={effectiveness.vocabulary.masteredWords > 0 ? "badge ok" : "badge muted"}>
                  {effectiveness.vocabulary.masteredWords} 词
                </span>
              </div>
              <div className="status-line">
                <span className="label">遗忘风险</span>
                <span className={effectiveness.vocabulary.atRiskWords === 0 ? "badge ok" : "badge warn"}>
                  {effectiveness.vocabulary.atRiskWords} 词
                </span>
              </div>
              <div className="status-line">
                <span className="label">保持率</span>
                <span>{effectiveness.vocabulary.retentionPercent}%</span>
              </div>

              <p className="fineprint" style={{ margin: "8px 0 2px" }}>
                口语
              </p>
              <div className="status-line">
                <span className="label">录音尝试</span>
                <span>{effectiveness.speaking.attemptCount} 次</span>
              </div>
              <div className="status-line">
                <span className="label">自评分变化（近7天 vs 前7天）</span>
                <span>
                  {effectiveness.speaking.selfScoreAvgLast7Days ?? "—"}
                  {effectiveness.speaking.selfScoreAvgPrevious7Days !== null &&
                    ` （前值 ${effectiveness.speaking.selfScoreAvgPrevious7Days}）`}
                </span>
              </div>

              <p className="fineprint" style={{ margin: "8px 0 2px" }}>
                写作
              </p>
              <div className="status-line">
                <span className="label">Error Bank 写作条目</span>
                <span>{effectiveness.writing.errorBankCount} 条</span>
              </div>
              <div className="status-line">
                <span className="label">改善率</span>
                <span>
                  {effectiveness.writing.improvementRatePercent}%（{effectiveness.writing.improvedOfFollowUp}{" "}
                  条有后续作答）
                </span>
              </div>

              {effectiveness.assessments.length > 0 && (
                <>
                  <p className="fineprint" style={{ margin: "8px 0 2px" }}>
                    阶段测评
                  </p>
                  {effectiveness.assessments.map((row) => (
                    <div className="status-line" key={`${row.day}-${row.level}`}>
                      <span className="label">Day {row.day}</span>
                      <span>
                        {row.overallScore} 分 · {row.level}
                      </span>
                    </div>
                  ))}
                  {effectiveness.assessmentSkillDelta.length > 0 && (
                    <>
                      <p className="fineprint" style={{ margin: "4px 0 2px" }}>
                        技能变化（首次 → 最近）：
                      </p>
                      {effectiveness.assessmentSkillDelta.map((row) => (
                        <div className="status-line" key={row.skill}>
                          <span className="label">{row.skill}</span>
                          <span className={row.delta >= 0 ? "badge ok" : "badge warn"}>
                            {row.delta >= 0 ? "+" : ""}
                            {row.delta}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {/* Phase 13 P1-2: SRS memory health. */}
          {memory && (
            <section className="card" aria-label="记忆健康">
              <h2>记忆健康（SRS）</h2>
              <div className="status-line">
                <span className="label">到期未复习</span>
                <span className={memory.dueNotReviewed === 0 ? "badge ok" : "badge warn"}>
                  {memory.dueNotReviewed} 词
                </span>
              </div>
              <div className="status-line">
                <span className="label">近 7 天到期复习完成率</span>
                <span
                  className={
                    memory.reviewCompletionRatePercent >= 80
                      ? "badge ok"
                      : memory.reviewCompletionRatePercent >= 50
                        ? "badge warn"
                        : "badge muted"
                  }
                >
                  {memory.reviewCompletionRatePercent}%（{memory.dueInLast7Days} 词到期）
                </span>
              </div>
              <div className="status-line">
                <span className="label">遗忘风险词（有遗忘史或高难度）</span>
                <span className={memory.atRiskCount === 0 ? "badge muted" : "badge warn"}>
                  {memory.atRiskCount} / {memory.totalTrackedItems}
                </span>
              </div>
              <p className="fineprint" style={{ margin: "6px 0 0" }}>
                到期未复习的词会继续留在复习队列里，完成今日复习即可清零。
              </p>
            </section>
          )}

          {/* Phase 12/13: Beta funnel + cohort views. */}
          {beta && (
            <section aria-label="Beta Analytics">
              <BetaDashboardPage />
              <CohortDashboardPage />
            </section>
          )}
        </>
      )}
    </div>
  );
}
