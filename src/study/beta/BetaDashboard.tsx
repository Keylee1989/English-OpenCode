import { useEffect, useState } from "react";
import {
  getBetaAnalyticsBundle,
  type BetaAnalyticsBundle,
} from "@/study/beta/beta-analytics";

/**
 * Phase 12 P0-1: Beta Analytics Dashboard (read-only).
 * Renders funnel / drop-off / difficulty aggregates so product iteration can
 * be driven by real learner behavior. No writes, no study-flow coupling.
 */

function GroupList({
  title,
  groups,
  emptyZh,
}: {
  title: string;
  groups: Array<{ key: string; count: number }>;
  emptyZh: string;
}) {
  return (
    <div>
      <p className="fineprint" style={{ margin: "6px 0 2px" }}>
        {title}
      </p>
      {groups.length === 0 ? (
        <p className="dim" style={{ margin: 0 }}>{emptyZh}</p>
      ) : (
        <ul className="engine-list">
          {groups.slice(0, 8).map((group) => (
            <li key={group.key}>
              <span>{group.key}</span>
              <span className="badge muted">{group.count} 次</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BetaDashboardPage() {
  const [bundle, setBundle] = useState<BetaAnalyticsBundle | null>(null);
  const [failZh, setFailZh] = useState<string | null>(null);

  useEffect(() => {
    void getBetaAnalyticsBundle()
      .then(setBundle)
      .catch((err) => {
        setFailZh(`加载 Beta 分析失败：${err instanceof Error ? err.message : String(err)}`);
      });
  }, []);

  return (
    <div className="page">
      <header className="step-header">
        <a href="#/analytics" className="linklike">
          ← 分析
        </a>
        <span className="dim">Beta Analytics（只读）</span>
      </header>

      {failZh && <p className="notice">{failZh}</p>}
      {!bundle && !failZh && (
        <div className="card">
          <p className="dim">正在汇总 Beta 遥测数据…</p>
        </div>
      )}

      {bundle && (
        <>
          <section className="card" aria-label="转化漏斗">
            <h2>新用户漏斗（本地学习者）</h2>
            <div className="status-line">
              <span className="label">Day1 完成率</span>
              <span className={bundle.funnel.day1CompletionRatePercent > 0 ? "badge ok" : "badge muted"}>
                {bundle.funnel.day1CompletionRatePercent}%
              </span>
            </div>
            <div className="status-line">
              <span className="label">Day3 留存率</span>
              <span className={bundle.funnel.day3RetentionRatePercent > 0 ? "badge ok" : "badge warn"}>
                {bundle.funnel.day3RetentionRatePercent}%
              </span>
            </div>
            <div className="status-line">
              <span className="label">Day7 留存率</span>
              <span className={bundle.funnel.day7RetentionRatePercent > 0 ? "badge ok" : "badge warn"}>
                {bundle.funnel.day7RetentionRatePercent}%
              </span>
            </div>
            <div className="status-line">
              <span className="label">Day30 完成率</span>
              <span className={bundle.funnel.day30CompletionRatePercent > 0 ? "badge ok" : "badge muted"}>
                {bundle.funnel.day30CompletionRatePercent}%
              </span>
            </div>
            <p className="fineprint" style={{ margin: "6px 0 0" }}>
              已到达 Day {bundle.funnel.maxDayReached} · 累计完成 {bundle.funnel.daysCompleted} 天 ·
              {" "}Beta 会话 {bundle.sessionCount} 次
            </p>
          </section>

          <section className="card" aria-label="流失分析">
            <h2>Drop-off 流失分析</h2>
            <p style={{ margin: "4px 0" }}>
              中途退出共 <strong>{bundle.dropOff.totalEvents}</strong> 次
              {bundle.dropOff.worstSpotZh && (
                <>
                  {" · "}最严重位置：<strong>{bundle.dropOff.worstSpotZh}</strong>
                </>
              )}
            </p>
            <GroupList
              title="按课程天："
              groups={bundle.dropOff.byDay}
              emptyZh="暂无中途退出记录。"
            />
            <GroupList
              title="按模块类型："
              groups={bundle.dropOff.byBlockKind}
              emptyZh=""
            />
            <GroupList
              title="按会话步骤："
              groups={bundle.dropOff.byStep}
              emptyZh=""
            />
          </section>

          <section className="card" aria-label="难度反馈分析">
            <h2>难度反馈分析</h2>
            <p style={{ margin: "4px 0" }}>
              共 <strong>{bundle.difficulty.total}</strong> 条 · 偏易{" "}
              {bundle.difficulty.easy} / 适中 {bundle.difficulty.normal} / 偏难{" "}
              <strong>{bundle.difficulty.hard}</strong>（偏难占比{" "}
              {bundle.difficulty.hardPercent}%）
            </p>
            <GroupList
              title="“偏难”集中在："
              groups={bundle.difficulty.hardByDay}
              emptyZh="还没有任何“偏难”反馈。"
            />
            <GroupList
              title="全部反馈按天分布："
              groups={bundle.difficulty.byDay}
              emptyZh=""
            />
          </section>

          <p className="fineprint">
            数据截至 {new Date(bundle.generatedAt).toLocaleString()}。只读分析，
            来自 Beta Test Mode 的本地真实记录。
          </p>
        </>
      )}
    </div>
  );
}
