import { useMemo, useState } from "react";
import { getAllResources } from "@/content/resources/resource-engine";

/** Phase 15-I: Resource Library page (#/library). Read-only catalog browser. */

type TypeFilter = "all" | "reading" | "audio" | "video" | "grammar" | "speaking" | "writing";

const TYPE_TABS: Array<[TypeFilter, string]> = [
  ["all", "全部"],
  ["grammar", "Grammar"],
  ["reading", "Reading"],
  ["audio", "Listening"],
  ["video", "Video"],
  ["speaking", "Speaking"],
  ["writing", "Writing"],
];

const LEVELS = ["all", "B2", "C1", "C2"];
const SKILLS = ["all", "vocabulary", "listening", "speaking", "reading", "writing", "grammar", "phonics"];

export default function LibraryPage() {
  const all = useMemo(() => getAllResources(), []);
  const [typeTab, setTypeTab] = useState<TypeFilter>("all");
  const [level, setLevel] = useState("all");
  const [skill, setSkill] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      all.filter((item) => {
        if (typeTab !== "all" && item.type !== typeTab) return false;
        if (level !== "all" && item.level !== level) return false;
        if (skill !== "all" && item.skill !== skill) return false;
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          const hay = `${item.title} ${item.categoryZh}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    [all, typeTab, level, skill, query],
  );

  return (
    <div className="page">
      <header className="step-header">
        <a href="#/" className="linklike">
          ← 首页
        </a>
        <span className="dim">Resource Library · 资源库</span>
      </header>

      <section className="card">
        <h2>资源库（{filtered.length} / {all.length}）</h2>
        <p className="fineprint" style={{ margin: "4px 0 8px" }}>
          资源分类说明：<span className="badge muted">内置</span> = 本 App 内置内容（阅读/语法/口语/写作题目，离线可用）；
          <span className="badge warn">外部真语料</span> = 第三方真实语料（播客/广播/讲座/视频），需跳转官网或平台收听观看。
          本 App 不提供内置音频，也不会把机器合成语音冒充真实听力素材。
        </p>
        <input
          className="text-input"
          value={query}
          placeholder="搜索标题或分类…"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="row-2" style={{ marginTop: 8 }}>
          <select className="text-input" value={typeTab} onChange={(e) => setTypeTab(e.target.value as TypeFilter)}>
            {TYPE_TABS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select className="text-input" value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((value) => (
              <option key={value} value={value}>{value === "all" ? "全部等级" : value}</option>
            ))}
          </select>
          <select className="text-input" value={skill} onChange={(e) => setSkill(e.target.value)}>
            {SKILLS.map((value) => (
              <option key={value} value={value}>{value === "all" ? "全部技能" : value}</option>
            ))}
          </select>
        </div>
      </section>

      <section aria-label="资源列表">
        {filtered.map((item) => (
          <div className="card" key={item.id} style={{ marginBottom: 10 }}>
            <p style={{ margin: "2px 0" }}>
              <strong>{item.title}</strong>{" "}
              <span className={`badge ${item.level === "C2" ? "warn" : item.level === "C1" ? "info" : "muted"}`}>
                {item.level}
              </span>{" "}
              <span className="badge muted">{item.skill}</span>{" "}
              {item.sourceKind === "inApp" ? (
                <span className="badge muted">内置</span>
              ) : (
                <span className="badge warn">外部真语料</span>
              )}
              {!item.offlineAvailable && item.url && (
                <>
                  {" "}
                  <a href={item.url} target="_blank" rel="noreferrer" className="linklike">
                    ↗ 打开资源
                  </a>
                </>
              )}
            </p>
            <p className="dim" style={{ margin: "2px 0" }}>
              {item.categoryZh}
              {item.minutes ? ` · 约 ${item.minutes} 分钟` : ""}
              {item.offlineAvailable ? " · 离线可用" : " · 外部资源"}
            </p>
            {item.detailZh && <p className="fineprint" style={{ margin: "4px 0 0" }}>{item.detailZh}</p>}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card">
            <p className="dim">没有匹配的资源，试试放宽筛选条件。</p>
          </div>
        )}
      </section>
    </div>
  );
}
