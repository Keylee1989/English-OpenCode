import { useCallback, useEffect, useState } from "react";
import {
  deleteConversation,
  getConversation,
  paginateConversations,
} from "@/ai/conversation-store";
import type { ConversationMessage, ConversationRow, ConversationType } from "@/data/db";

/**
 * Phase 11-A Task 3: standalone AI History page.
 * Lists every saved AI conversation (date / type / related day / message count)
 * with DB-level pagination, plus view / delete / continue actions.
 * All queries go through paginateConversations() - no ad-hoc table access.
 */

const TYPE_LABEL_ZH: Record<ConversationType, string> = {
  tutor: "课程解释",
  "error-analysis": "错题分析",
  dialogue: "情景对话",
  "writing-review": "写作批改",
  roleplay: "角色扮演",
};

const TYPE_FILTERS: Array<{ value: ConversationType | "all"; label: string }> = [
  { value: "all", label: "全部类型" },
  { value: "tutor", label: "课程解释" },
  { value: "error-analysis", label: "错题分析" },
  { value: "dialogue", label: "情景对话" },
  { value: "writing-review", label: "写作批改" },
  { value: "roleplay", label: "角色扮演" },
];

const PAGE_SIZE = 10;
const CONTINUE_KEY = "english360.tutor-continue-id";

export default function AiHistoryPage() {
  const [typeFilter, setTypeFilter] = useState<ConversationType | "all">("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof paginateConversations>
  > | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [failZh, setFailZh] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const paginated = await paginateConversations({
        ...(typeFilter === "all" ? {} : { type: typeFilter }),
        page,
        pageSize: PAGE_SIZE,
      });
      setResult(paginated);
      setFailZh(null);
    } catch (err) {
      setFailZh(`加载历史失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }, [typeFilter, page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const removeRow = async (id: string): Promise<void> => {
    await deleteConversation(id);
    await refresh();
  };

  const continueConversation = async (row: ConversationRow): Promise<void> => {
    // Re-open the full row so the target page receives the latest state.
    const fresh = (await getConversation(row.id)) ?? row;
    if (fresh.type === "roleplay") {
      // Phase 12 P1-2: roleplay sessions resume via resumeRoleplay().
      sessionStorage.setItem("english360.roleplay-resume-id", fresh.id);
      sessionStorage.setItem("english360.tutor-tab", "roleplay");
    } else {
      sessionStorage.setItem(CONTINUE_KEY, fresh.id);
    }
    window.location.hash = "#/tutor";
  };

  return (
    <div className="page">
      <header className="step-header">
        <a href="#/" className="linklike">
          ← 首页
        </a>
        <span className="dim">AI 历史会话</span>
      </header>

      <section className="card">
        <h2>AI History</h2>
        <p className="dim">全部 AI 对话记录：按时间倒序分页展示，可查看、删除或回到导师页继续对话。</p>

        <select
          className="text-input"
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value as ConversationType | "all");
            setPage(1);
          }}
        >
          {TYPE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {failZh && <p className="notice">{failZh}</p>}

        {result && result.rows.length === 0 && (
          <p className="dim">还没有保存的 AI 会话。去「导师」页生成第一条吧。</p>
        )}

        {result && result.rows.length > 0 && (
          <>
            <ul className="task-list">
              {result.rows.map((row) => (
                <li key={row.id} className="task-row" style={{ flexWrap: "wrap" }}>
                  <span className="task-main">
                    <strong>{TYPE_LABEL_ZH[row.type] ?? row.type}</strong>
                    <small>
                      {new Date(row.updatedAt).toLocaleString()}
                      {row.relatedDay ? ` · 关联 Day ${row.relatedDay}` : ""}
                      {" · "}
                      {(row.messages ?? []).length} 条消息
                    </small>
                  </span>
                  <span style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="linklike"
                      onClick={() => setOpenId(openId === row.id ? null : row.id)}
                    >
                      {openId === row.id ? "收起" : "查看"}
                    </button>
                    {(row.type === "tutor" || row.type === "roleplay") && (
                      <button
                        type="button"
                        className="linklike"
                        onClick={() => void continueConversation(row)}
                      >
                        继续对话
                      </button>
                    )}
                    <button
                      type="button"
                      className="linklike"
                      onClick={() => void removeRow(row.id)}
                    >
                      删除
                    </button>
                  </span>
                  {openId === row.id && (
                    <div className="example-box" style={{ width: "100%" }}>
                      {(row.messages ?? []).map((message: ConversationMessage, index: number) => (
                        <p key={index}>
                          <strong>{message.role}:</strong> {message.content}
                          {message.noteZh && (
                            <>
                              <br />
                              <span className="dim">{message.noteZh}</span>
                            </>
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <p className="step-progress">
              第 {result.page} / {result.pageCount} 页 · 共 {result.total} 条
            </p>
            <div className="row-2">
              <button
                type="button"
                className="btn btn-block"
                disabled={result.page <= 1}
                onClick={() => setPage(result.page - 1)}
              >
                ← 上一页
              </button>
              <button
                type="button"
                className="btn btn-block"
                disabled={result.page >= result.pageCount}
                onClick={() => setPage(result.page + 1)}
              >
                下一页 →
              </button>
            </div>
          </>
        )}
      </section>

      <a href="#/aisettings" role="button" className="btn option-btn btn-block">
        前往 AI 设置
      </a>
    </div>
  );
}
