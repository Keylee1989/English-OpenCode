import { useEffect, useState } from "react";
import { todayISO } from "@/engines/planner/planner-v0";
import {
  generateDailyReport,
  type DailyReport,
} from "@/engines/progress/daily-report-v0";
import {
  computeGrowthReport,
  formatGrowthReportText,
  type GrowthReport,
} from "@/study/growth-report";

function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export default function ReportPage() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const next = await generateDailyReport(todayISO());
      setReport(next);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <p className="dim">生成今日报告…</p>
      </div>
    );
  }

  if (!report || report.totalEvents === 0) {
    return (
      <div className="page">
        <div className="card">
          <h2>今日学习报告</h2>
          <p className="dim">今天还没有学习记录。完成一次学习后，这里会展示真实数据。</p>
        </div>
      </div>
    );
  }

  const maxDelta = Math.max(1, ...report.abilityChanges.map((change) => Math.abs(change.delta)));

  return (
    <div className="page">
      <header className="home-header">
        <h1>今日学习报告</h1>
        <p className="dim">{report.dateISO}</p>
      </header>

      <section className="card">
        <h2>总览</h2>
        <div className="status-line">
          <span className="label">学习时长（约）</span>
          <span>{report.minutesSpent ?? "—"} 分钟</span>
        </div>
        <div className="status-line">
          <span className="label">学习行为次数</span>
          <span>{report.totalEvents}</span>
        </div>
        <div className="status-line">
          <span className="label">总体正确率</span>
          <span>{percent(report.overallCorrectRate)}</span>
        </div>
        <div className="status-line">
          <span className="label">复习 成功 / 失败</span>
          <span>
            {report.reviewsToday.success} / {report.reviewsToday.failure}
          </span>
        </div>
        <div className="status-line">
          <span className="label">未来 24 小时到期复习</span>
          <span>{report.dueWithin24h} 个</span>
        </div>
      </section>

      {report.newItemsLearned.length > 0 && (
        <section className="card">
          <h2>新增知识（{report.newItemsLearned.length}）</h2>
          <p>{report.newItemsLearned.map((item) => item.titleEn ?? item.id).join(" · ")}</p>
        </section>
      )}

      {report.perSkill.length > 0 && (
        <section className="card">
          <h2>分技能练习情况</h2>
          {report.perSkill.map((stat) => (
            <div className="status-line" key={stat.skill}>
              <span className="label">
                {stat.labelZh}（{stat.count} 次）
              </span>
              <span>{percent(stat.correctRate)}</span>
            </div>
          ))}
        </section>
      )}

      {report.abilityChanges.length > 0 && (
        <section className="card">
          <h2>能力变化（今天）</h2>
          {report.abilityChanges.map((change) => (
            <div key={change.skill} className="delta-row">
              <span className="label">{change.labelZh}</span>
              <span className={`delta-value ${change.delta > 0 ? "up" : change.delta < 0 ? "down" : ""}`}>
                {change.from.toFixed(1)} → {change.to.toFixed(1)}
                {change.delta !== 0 && ` (${change.delta > 0 ? "+" : ""}${change.delta.toFixed(1)})`}
              </span>
              <div className="delta-bar">
                <div
                  className={change.delta >= 0 ? "bar up" : "bar down"}
                  style={{ width: `${(Math.abs(change.delta) / maxDelta) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </section>
      )}

      {report.errorGroups.length > 0 && (
        <section className="card">
          <h2>错误分析</h2>
          {report.errorGroups.map((group) => (
            <div className="status-line" key={group.category}>
              <span className="label">{group.sampleZh}</span>
              <span className="badge warn">×{group.count}</span>
            </div>
          ))}
        </section>
      )}

      <GrowthCard />

      <section className="card">
        <h2>下一步建议</h2>
        {report.suggestionsZh.map((suggestion) => (
          <p key={suggestion}>• {suggestion}</p>
        ))}
      </section>

      <a href="#/" role="button" className="btn btn-block">
        ← 返回首页
      </a>
    </div>
  );
}

/** Phase 5: milestone-vs-milestone growth report with .txt export. */
function GrowthCard() {
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = async (): Promise<void> => {
    setBusy(true);
    try {
      setReport(await computeGrowthReport());
    } finally {
      setBusy(false);
    }
  };

  const download = (): void => {
    if (!report) return;
    const blob = new Blob([formatGrowthReportText(report)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `english360-growth-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card">
      <h2>成长报告（里程碑对比）</h2>
      {report ? (
        <>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
            {formatGrowthReportText(report)}
          </pre>
          <button type="button" className="btn option-btn btn-block" onClick={download}>
            导出为 TXT
          </button>
        </>
      ) : (
        <>
          <p className="dim">比较首次与最近一次里程碑测评，查看各技能提升幅度。</p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy}
            onClick={() => void generate()}
          >
            {busy ? "生成中…" : "生成成长报告"}
          </button>
        </>
      )}
    </section>
  );
}
