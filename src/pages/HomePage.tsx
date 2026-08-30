import { useEffect, useState } from "react";
import { AUTHORED_DAYS, COURSE_TARGET_DAYS, getDayContent } from "@/content";
import { buildPlan, type DayPlan } from "@/engines/planner/planner-v0";
import { db } from "@/data/db";
import { getGamificationSnapshot, BADGES, computeWeeklyProgress } from "@/engines/gamification/gamification-v0";
import { shouldShowOnboarding } from "@/study/onboarding/onboarding-state";
import { OnboardingCard } from "@/study/onboarding/OnboardingCard";
import { loadBaselineCache } from "@/study/validation/baseline-model";
import { internalCefrOf } from "@/study/validation/cefr-mapping";

export default function HomePage({ onStart }: { onStart: () => void }) {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [dayScore, setDayScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Awaited<ReturnType<typeof getGamificationSnapshot>> | null>(null);
  // Phase 23 (P0-9): surface the latest milestone assessment estimate on the
  // dashboard. Null until the learner completes a validation/baseline run.
  const [latestCefr, setLatestCefr] = useState<string | null>(null);
  // Phase 13 P0-2: first-launch onboarding flow (shown once).
  const [onboarding, setOnboarding] = useState<"checking" | "show" | "done">("checking");

  useEffect(() => {
    void (async () => {
      const nextPlan = await buildPlan();
      setPlan(nextPlan);
      if (nextPlan.currentDay <= AUTHORED_DAYS) {
        const progress = await db.dayProgress.get(nextPlan.currentDay);
        setDayScore(progress?.status === "completed" ? (progress.score ?? null) : null);
      }
      setGame(await getGamificationSnapshot());
      const cache = await loadBaselineCache();
      if (cache.latest?.overall) {
        const derived = internalCefrOf(cache.latest.overall, "algorithm");
        setLatestCefr(`${derived.level}（置信 ${Math.round(derived.confidence * 100)}%）`);
      }
      const needed = await shouldShowOnboarding();
      setOnboarding(needed ? "show" : "done");
      setLoading(false);
    })();
  }, []);

  const day = plan?.currentDay ?? 1;
  const content = getDayContent(day);
  const allDone = day > AUTHORED_DAYS || plan?.blocks.every((b) => b.kind === "review" && b.dueCount === 0);

  return (
    <div className="page">
      <header className="home-header">
        <p className="home-kicker">English360 GPT</p>
        <h1 className="home-day">
          Day {day}
          <span className="home-day-total"> / {COURSE_TARGET_DAYS}</span>
        </h1>
        <p className="home-goal">
          {content ? `${content.titleZh} · ${content.goalZh}` : "今日以复习为主"}
          {dayScore !== null ? `（昨日小测 ${Math.round(dayScore)} 分）` : ""}
        </p>
        {latestCefr && (
          <p className="fineprint" style={{ margin: "4px 0 0" }}>
            最近测评水平估算：{latestCefr}（English360 内部估算，非官方 CEFR 认证）
          </p>
        )}
      </header>

      {onboarding === "show" && (
        <OnboardingCard onDone={() => setOnboarding("done")} />
      )}

      {game && (
        <section className="card" aria-label="学习激励">
          <p style={{ margin: 0 }}>
            ⭐ <strong>{game.xp}</strong> XP · 等级 {game.level} · 🔥 连续{" "}
            <strong>{game.streakDays}</strong> 天（最佳 {game.bestStreakDays}）
            {game.unlockedBadges.length > 0 && (
              <>
                {" · "}
                🏅 {game.unlockedBadges
                  .map((id) => BADGES.find((b) => b.id === id)?.nameZh ?? id)
                  .join("、")}
              </>
            )}
          </p>
          {(() => {
            const weekly = computeWeeklyProgress(game.weeklyGoalXp, game.xpAtWeekStart, game.xp);
            return (
              <p className="fineprint" style={{ margin: "4px 0 0" }}>
                本周目标：{weekly.earnedXp} / {weekly.goalXp} XP（{weekly.percent}%）
              </p>
            );
          })()}
        </section>
      )}

      <section className="card">
        <h2>今日任务</h2>
        {loading && <p className="dim">加载计划中…</p>}
        {!loading && plan && plan.blocks.length === 0 && (
          <p className="dim">今天暂无任务，休息一下。</p>
        )}
        <ul className="task-list">
          {plan?.blocks.map((block, index) => (
            <li key={`${block.kind}-${index}`} className="task-row">
              <span className="task-order">{index + 1}</span>
              <span className="task-main">
                <strong>{block.titleZh}</strong>
                <small>{block.reasonZh}</small>
              </span>
            </li>
          ))}
        </ul>
        {!loading && !allDone && (
          <button type="button" className="btn btn-primary btn-block" onClick={onStart}>
            开始学习
          </button>
        )}
      </section>

      <a href="#/tutor" role="button" className="btn option-btn btn-block">
        🤖 AI 英语导师（课程解释 · 错题分析 · 情景对话）
      </a>

      {plan?.notices.map((notice) => (
        <p className="notice" key={notice}>
          {notice}
        </p>
      ))}

      <p className="fineprint">
        已上线第 1-{AUTHORED_DAYS} 天真实课程；360 天为课程目标总量。能力数据全部来自你的真实练习，
        不做任何模拟。
      </p>
    </div>
  );
}
