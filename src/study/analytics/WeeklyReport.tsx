import { useEffect, useState } from "react";
import { getWeeklyReport, type WeeklyReportData } from "@/study/analytics/analytics";

/**
 * Phase 13 P1-1: Weekly Learning Report - share-card style summary of the
 * last 7 days. Pure display over read-only aggregates; no image generation,
 * no sharing beyond what the user copies themselves.
 */
export default function WeeklyReport() {
  const [data, setData] = useState<WeeklyReportData | null>(null);

  useEffect(() => {
    void getWeeklyReport().then(setData);
  }, []);

  if (!data) {
    return (
      <section className="card">
        <p className="dim">正在生成周报…</p>
      </section>
    );
  }

  const rows: Array<[string, string | number]> = [
    ["学习时长", `${data.minutes} 分钟`],
    ["活跃天数", `${data.activeDays} / 7 天`],
    ["完成课程", `${data.lessonsCompleted} 天`],
    ["新词", `${data.newWordsIntroduced} 个`],
    ["复习词", `${data.wordsReviewed} 次`],
    ["AI 互动", `${data.aiInteractions} 次`],
    ["记录错误", `${data.errorsRecorded} 条`],
  ];

  return (
    <section className="card" aria-label="每周学习报告">
      <h2>本周学习报告</h2>
      <p className="dim">
        {data.startISO.slice(5)} ~ {data.endISO.slice(5)}
      </p>
      <div
        className="example-box"
        style={{
          border: "1px solid var(--primary, #2563eb)",
          borderRadius: 8,
          padding: "10px 12px",
        }}
      >
        <p style={{ margin: "2px 0" }}>
          <strong>📈 English360 · 周报</strong>
        </p>
        {rows.map(([label, value]) => (
          <p key={label} style={{ margin: "3px 0" }}>
            {label}：<strong>{value}</strong>
          </p>
        ))}
        <p style={{ margin: "6px 0 0" }} className="dim">
          坚持，就是最难的语法。💪
        </p>
      </div>
      <p className="fineprint">
        截图即可分享给朋友或打卡群（本应用不生成图片、不上传任何数据）。
      </p>
    </section>
  );
}
