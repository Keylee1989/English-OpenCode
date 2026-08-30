import { useEffect, useState } from "react";
import {
  buildAdaptiveDiagnosis,
  type AdaptiveDiagnosis,
} from "@/study/adaptive/adaptive-runtime";
import { SKILL_LABEL_ZH, CEFR_SCORE } from "@/study/adaptive/learner-profile";
import { BLOCK_LABEL_ZH } from "@/study/adaptive/adaptive-plan";

/**
 * Phase 21 — Diagnosis & Plan page (#/diagnosis).
 *
 * Surfaces the closed loop to the learner:
 *   Baseline -> Profile -> Priority -> Difficulty -> AdaptivePlan
 *
 * Honesty contract enforced at the view boundary — the internal-estimates
 * disclaimer (非官方 CEFR) is rendered whenever a CEFR band is displayed.
 */

function bandBadge(band: string, selfReported?: boolean): string {
  return `${band}${selfReported ? "（自评）" : ""}`;
}

const DECISION_LABEL: Record<string, string> = {
  too_easy: "偏易",
  easy: "偏易",
  appropriate: "适中",
  hard: "偏难",
  too_hard: "偏难",
};

export default function DiagnosisPage() {
  const [diag, setDiag] = useState<AdaptiveDiagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    buildAdaptiveDiagnosis()
      .then((d) => {
        if (alive) setDiag(d);
      })
      .catch((err) => {
        if (alive) setError(String(err instanceof Error ? err.message : err));
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="page">
        <header className="step-header">
          <a href="#/" className="linklike">← 首页</a>
          <span className="dim">自适应诊断</span>
        </header>
        <section className="card">
          <p className="dim">诊断加载失败：{error}</p>
        </section>
      </div>
    );
  }

  if (!diag) {
    return (
      <div className="page">
        <header className="step-header">
          <a href="#/" className="linklike">← 首页</a>
          <span className="dim">自适应诊断</span>
        </header>
        <section className="card">
          <p className="dim">正在读取基线并计算诊断…</p>
        </section>
      </div>
    );
  }

  const { hasBaseline, profile, priorities, plan, difficulty, dueReviewCount, honestyLabel } = diag;

  return (
    <div className="page">
      <header className="step-header">
        <a href="#/" className="linklike">← 首页</a>
        <span className="dim">Diagnosis & Plan · 自适应诊断与计划</span>
      </header>

      <section className="card">
        <h2>{hasBaseline ? "当前能力画像（内部估算）" : "尚未完成基线评测"}</h2>
        <p className="fineprint" style={{ margin: "4px 0 8px" }}>{honestyLabel}</p>
        {!hasBaseline && <p className="dim">完成基线评测后才会生成个性化疗程。</p>}

        {profile && (
          <>
            <h3>六项技能（English360 内部估算，非官方 CEFR）</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {profile.skills.map((s) => (
                <li key={s.skill} style={{ margin: "6px 0" }}>
                  <span style={{ display: "inline-block", width: 56 }}>{SKILL_LABEL_ZH[s.skill] ?? s.skill}</span>
                  <span className={`badge ${s.band === "C2" ? "warn" : s.band === "C1" ? "info" : "muted"}`}>
                    {bandBadge(s.band, s.selfReported)}
                  </span>
                  {" "}
                  <span className="dim">评分 {Math.round(s.score)}/{CEFR_SCORE} · 置信 {Math.round(s.confidence * 100)}%</span>
                </li>
              ))}
            </ul>

            {profile.weakestSkills.length > 0 && (
              <p className="dim" style={{ marginTop: 8 }}>
                薄弱项：{profile.weakestSkills.map((s) => SKILL_LABEL_ZH[s.skill]).join("、")}；
                强度建议：{profile.recommendedIntensity === "high" ? "高" : profile.recommendedIntensity === "moderate" ? "中" : "轻"}
                （每日约 {profile.recommendedDailyMinutes} 分钟）。
              </p>
            )}
            {profile.notesZh.map((n, i) => (
              <p key={i} className="fineprint" style={{ margin: "4px 0" }}>{n}</p>
            ))}
          </>
        )}
      </section>

      {plan && (
        <section className="card">
          <h2>今日自适应计划（{plan.dateISO}）</h2>
          <p className="dim">总时长约 {plan.totalMinutes} 分钟 · 强度 {plan.profileIntensity}</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {plan.blocks.map((b, i) => (
              <li key={`${b.kind}-${i}`} style={{ margin: "6px 0" }}>
                <strong>{BLOCK_LABEL_ZH[b.kind]}</strong>
                {b.skill ? ` · ${SKILL_LABEL_ZH[b.skill] ?? b.skill}` : ""}
                {" "}· 约 {b.minutes} 分钟
                <div className="fineprint" style={{ margin: "2px 0 0" }}>{b.reasonZh}</div>
              </li>
            ))}
          </ul>
          {plan.notesZh.map((n, i) => (
            <p key={i} className="fineprint" style={{ margin: "4px 0" }}>{n}</p>
          ))}
        </section>
      )}

      {priorities.length > 0 && (
        <section className="card">
          <h2>技能优先级（权重）</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {priorities.map((p) => (
              <li key={p.skill} style={{ margin: "4px 0" }}>
                {SKILL_LABEL_ZH[p.skill] ?? p.skill}
                {" "}
                <span className="dim">权重 {(p.weight * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {Object.keys(difficulty).length > 0 && (
        <section className="card">
          <h2>下次练习难度档位（内部估算）</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {Object.entries(difficulty).map(([skill, d]) => (
              <li key={skill} style={{ margin: "4px 0" }}>
                {SKILL_LABEL_ZH[skill] ?? skill} →{" "}
                <span className={`badge ${(d?.nextBand ?? "A1") === "C2" ? "warn" : (d?.nextBand ?? "A1") === "C1" ? "info" : "muted"}`}>
                  {d?.nextBand ?? "A1"}
                </span>
                <span className="dim">（{DECISION_LABEL[d?.decision ?? "appropriate"]}）</span>
              </li>
            ))}
          </ul>
          <p className="fineprint" style={{ margin: "6px 0 0" }}>
            到期复习项：{dueReviewCount} 项。
          </p>
        </section>
      )}
    </div>
  );
}