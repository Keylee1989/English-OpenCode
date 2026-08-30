import { useEffect, useState } from "react";
import { getAiBudgetConfig, setAiBudgetConfig } from "@/ai/usage-tracker";
import { PROVIDER_PRESETS } from "@/ai/providers";
import {
  activateAi,
  deactivateAi,
  getAiStatus,
  loadAiPreference,
  testAiConnection,
} from "@/ai/runtime";

/**
 * AI 设置页 (Phase 4-B).
 *
 * SECURITY: the API key lives in session memory only (see src/ai/runtime.ts).
 * It is NEVER saved to Dexie/localStorage. Only the non-secret provider
 * choice persists so the user doesn't re-select a vendor every visit.
 */
export default function AiSettingsPage() {
  const [providerId, setProviderId] = useState<string>(PROVIDER_PRESETS[0].providerId);
  const [modelOverride, setModelOverride] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [status, setStatus] = useState(getAiStatus());
  const [testing, setTesting] = useState(false);
  const [testResultZh, setTestResultZh] = useState<string | null>(null);

  useEffect(() => {
    const pref = loadAiPreference();
    if (pref) setProviderId(pref.providerId);
    // Model override is intentionally not restored: it may contain nothing
    // secret, but keeping the form simple beats saving extra state.
    setStatus(getAiStatus());
  }, []);

  const preset = PROVIDER_PRESETS.find((p) => p.providerId === providerId) ?? PROVIDER_PRESETS[0];

  const connect = (): void => {
    const result = activateAi({
      providerId,
      apiKey,
      modelId: modelOverride.trim() || undefined,
    });
    setStatus(result);
    setTestResultZh(null);
    if (result.state === "ready") setApiKey(""); // drop the key from the DOM immediately
  };

  const test = async (): Promise<void> => {
    setTesting(true);
    setTestResultZh(null);
    try {
      const outcome = await testAiConnection();
      setTestResultZh(outcome.messageZh);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="page">
      <header className="step-header">
        <a href="#/" className="linklike">
          ← 首页
        </a>
        <span className="dim">AI 设置</span>
      </header>

      <section className="card">
        <h2>选择 AI 服务</h2>
        {PROVIDER_PRESETS.map((item) => (
          <label key={item.providerId} className="task-row" style={{ cursor: "pointer" }}>
            <input
              type="radio"
              name="ai-provider"
              checked={providerId === item.providerId}
              onChange={() => {
                setProviderId(item.providerId);
                setModelOverride("");
              }}
            />
            <span className="task-main">
              <strong>{item.nameZh}</strong>
              <small>
                模型：{item.defaultModelId} · {item.keyHintZh}
              </small>
            </span>
          </label>
        ))}
      </section>

      <section className="card">
        <h2>API Key（仅本次会话）</h2>
        <input
          type="password"
          className="text-input"
          value={apiKey}
          autoComplete="off"
          placeholder={`输入 ${preset.nameZh} 的 API Key`}
          onChange={(event) => setApiKey(event.target.value)}
        />
        <p className="fineprint">
          安全说明：Key 只保存在本页面会话的内存里，刷新页面即清空；
          绝不写入本地数据库（IndexedDB），也不会上传到除所选服务外的任何地方。
        </p>

        <label className="fineprint" htmlFor="model-override">
          自定义模型 ID（可选，留空用默认）：
        </label>
        <input
          id="model-override"
          type="text"
          className="text-input"
          value={modelOverride}
          placeholder={preset.defaultModelId}
          onChange={(event) => setModelOverride(event.target.value)}
        />

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={apiKey.trim().length === 0}
          onClick={connect}
        >
          连接此服务
        </button>
      </section>

      <section className="card">
        <h2>连接状态</h2>
        {status.state === "unconfigured" && (
          <p className="dim">未配置。AI 功能（讲解/错题分析/对话/AI 批改）暂不可用；核心学习不受影响。</p>
        )}
        {status.state === "ready" && (
          <p>
            ✅ 已连接：<strong>{status.providerId}</strong> / {status.modelId}
            <br />
            <span className="dim">{status.messageZh}</span>
          </p>
        )}
        {status.state === "error" && <p className="notice">{status.messageZh}</p>}

        <button
          type="button"
          className="btn option-btn btn-block"
          disabled={status.state !== "ready" || testing}
          onClick={() => void test()}
        >
          {testing ? "测试中…" : "发送测试请求"}
        </button>
        {testResultZh && <p className={testResultZh.startsWith("连接成功") ? "dim" : "notice"}>{testResultZh}</p>}

        {status.state !== "unconfigured" && (
          <button
            type="button"
            className="btn btn-block"
            onClick={() => {
              deactivateAi();
              setStatus(getAiStatus());
              setTestResultZh(null);
            }}
          >
            清除本会话配置
          </button>
        )}
      </section>

      {/* Phase 12 P0-2: soft budget limits (advisory only, never blocks). */}
      <BudgetConfigCard />

      <a href="#/tutor" role="button" className="btn btn-primary btn-block">
        前往 AI 导师 →
      </a>
    </div>
  );
}

function BudgetConfigCard() {
  const [daily, setDaily] = useState<string>("100000");
  const [monthly, setMonthly] = useState<string>("2000000");
  const [savedZh, setSavedZh] = useState<string | null>(null);

  useEffect(() => {
    void getAiBudgetConfig().then((config) => {
      setDaily(String(config.dailySoftLimit));
      setMonthly(String(config.monthlySoftLimit));
    });
  }, []);

  const save = async (): Promise<void> => {
    await setAiBudgetConfig({
      dailySoftLimit: Number(daily) || 100000,
      monthlySoftLimit: Number(monthly) || 2000000,
    });
    setSavedZh("已保存。达到 80% 时导师页会提示（不阻断使用）。");
  };

  return (
    <section className="card">
      <h2>AI 用量软上限</h2>
      <p className="dim">
        仅提示不阻断：达到 80% 提醒注意，达到 100% 仅改变提示级别。按 tokens 估算值统计。
      </p>
      <label className="fineprint" htmlFor="budget-daily">每日软上限（tokens）：</label>
      <input
        id="budget-daily"
        type="number"
        min={1}
        className="text-input"
        value={daily}
        onChange={(event) => setDaily(event.target.value)}
      />
      <label className="fineprint" htmlFor="budget-monthly">每月软上限（tokens）：</label>
      <input
        id="budget-monthly"
        type="number"
        min={1}
        className="text-input"
        value={monthly}
        onChange={(event) => setMonthly(event.target.value)}
      />
      <button type="button" className="btn option-btn btn-block" onClick={() => void save()}>
        保存用量上限
      </button>
      {savedZh && <p className="fineprint">{savedZh}</p>}
    </section>
  );
}
