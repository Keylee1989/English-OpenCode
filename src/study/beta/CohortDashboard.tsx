import { useEffect, useState } from "react";
import {
  getCohortReport,
  type CohortReport,
} from "@/study/beta/cohort";

/**
 * Phase 13 P0-1: Cohort Dashboard (read-only).
 * Renders retention / completion / difficulty aggregates for the local
 * learner's cohort. Mounted inside the Analytics page (Beta mode only).
 */
export default function CohortDashboard() {
  const [report, setReport] = useState<CohortReport | null>(null);
  const [failZh, setFailZh] = useState<string | null>(null);

  useEffect(() => {
    void getCohortReport()
      .then(setReport)
      .catch((err) => {
        setFailZh(`加载 Cohort 分析失败：${err instanceof Error ? err.message : String(err)}`);
      });
  }, []);

  if (failZh) return <p className="notice">{failZh}</p>;
  if (!report) return <p className="dim">正在计算 Cohort 数据…</p>;

  return (
    <div>
      <section className="card" aria-label="Cohort 留存">
        <h2>Cohort 留存（开始日期：{report.cohortDateISO ?? "—"}）</h2>
        {(
          [
            ["D1", report.retention.d1],
            ["D3", report.retention.d3],
            ["D7", report.retention.d7],
            ["D14", report.retention.d14],
            ["D30", report.retention.d30],
          ] as Array<[string, number]>
        ).map(([label, percent]) => (
          <div className="status-line" key={label}>
            <span className="label">{label} retention</span>
            <span className={percent >= 60 ? "badge ok" : percent > 0 ? "badge warn" : "badge muted"}>
              {percent}%
            </span>
          </div>
        ))}
      </section>

      <section className="card" aria-label="Cohort 完成统计">
        <h2>完成统计</h2>
        <div className="status-line">
          <span className="label">平均完成课程天数</span>
          <span>{report.completion.avgCompletedDay}</span>
        </div>
        <div className="status-line">
          <span className="label">累计学习时长（分钟）</span>
          <span>{report.completion.avgMinutes}</span>
        </div>
        <div className="status-line">
          <span className="label">平均错误数量</span>
          <span>{report.completion.avgErrors}</span>
        </div>
        <div className="status-line">
          <span className="label">平均 AI 调用次数</span>
          <span>{report.completion.avgAiCalls}</span>
        </div>
      </section>

      <section className="card" aria-label="难度分布">
        <h2>难度反馈分布</h2>
        {report.difficultyOverall ? (
          <>
            <div className="status-line">
              <span className="label">总体</span>
              <span>
                偏易 {report.difficultyOverall.easyPercent}% · 适中{" "}
                {report.difficultyOverall.normalPercent}% · 偏难{" "}
                {report.difficultyOverall.hardPercent}%（{report.difficultyOverall.total} 条）
              </span>
            </div>
            {(["day", "skill"] as const).map((dimension) => {
              const rows =
                dimension === "day" ? report.difficultyByDay : report.difficultyBySkill;
              return (
                <div key={dimension}>
                  <p className="fineprint" style={{ margin: "6px 0 2px" }}>
                    按{dimension === "day" ? "天" : "技能"}：
                  </p>
                  {rows.length === 0 ? (
                    <p className="dim" style={{ margin: 0 }}>
                      暂无数据
                    </p>
                  ) : (
                    <ul className="engine-list">
                      {rows.map((row) => (
                        <li key={row.key}>
                          <span>{row.key}</span>
                          <small>
                            易 {row.easyPercent}% / 中 {row.normalPercent}% / 难{" "}
                            {row.hardPercent}%（{row.total}）
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <p className="dim">还没有难度反馈记录。</p>
        )}
      </section>
    </div>
  );
}
