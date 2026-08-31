import { useEffect, useState } from "react";
import { getAiBudgetConfig, setAiBudgetConfig } from "@/ai/usage-tracker";
import {
  PROVIDER_REGISTRY,
  PROVIDER_PRESETS,
  findProviderDefinition,
  type ProviderDefinition,
  type ProviderProtocol,
} from "@/ai/providers";
import {
  activateAi,
  deactivateAi,
  fetchModels,
  getAiStatus,
  getActiveCapabilities,
  loadAiPreference,
  loadPersistedKey,
  testAiConnection,
  type AiSessionStatus,
} from "@/ai/runtime";
import {
  deleteConfig,
  listSavedConfigs,
  newConfigId,
  saveConfig,
  type SavedAiConfig,
} from "@/ai/provider-store";

/**
 * AI 设置页 (Phase 4-B, Provider Registry UI).
 *
 * Lets the user choose any registry provider (official presets + custom
 * OpenAI-compatible), edit model / Base URL / protocol / custom headers, test
 * the connection with a real call, and save/delete named configurations.
 *
 * SECURITY: API keys default to session memory only. The user may OPT IN to
 * remembering each key in browser localStorage; keys never enter the bundle,
 * logs, or git.
 */
const PROTOCOL_LABELS: Record<string, string> = {
  "chat-completions": "Chat Completions (chat/completions)",
  responses: "Responses (/responses)",
  messages: "Messages (/v1/messages, Anthropic)",
  "generate-content": "GenerateContent (Gemini)",
};

export default function AiSettingsPage() {
  const [providerId, setProviderId] = useState<string>(PROVIDER_REGISTRY[0].id);
  const [modelId, setModelId] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [protocol, setProtocol] = useState<ProviderProtocol>("chat-completions");
  const [apiKey, setApiKey] = useState<string>("");
  const [showKey, setShowKey] = useState(false);
  const [rememberKey, setRememberKey] = useState(false);
  const [customName, setCustomName] = useState<string>("");
  const [customHeaders, setCustomHeaders] = useState<string>("");
  const [status, setStatus] = useState<AiSessionStatus>(getAiStatus());
  const [testing, setTesting] = useState(false);
  const [testResultZh, setTestResultZh] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelFetching, setModelFetching] = useState(false);
  const [modelFetchZh, setModelFetchZh] = useState<string | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<SavedAiConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);

  const definition: ProviderDefinition =
    findProviderDefinition(providerId) ?? PROVIDER_REGISTRY[0];
  const isCustom = providerId === "custom";

  useEffect(() => {
    const pref = loadAiPreference();
    if (pref) {
      setProviderId(pref.providerId);
      setModelId(pref.modelId ?? "");
      setBaseUrl(pref.baseUrl ?? "");
      setProtocol((pref.protocol as ProviderProtocol) ?? "chat-completions");
      const saved = getSavedConfigForProvider(pref.providerId);
      if (saved) {
        setCustomName(saved.nameZh);
        setCustomHeaders(saved.headers ? JSON.stringify(saved.headers) : "");
        setActiveConfigId(saved.id);
      }
    }
    setSavedConfigs(listSavedConfigs());
    // Restore the remembered key into the form (localStorage, opt-in).
    setApiKey(loadPersistedKey());
    setStatus(getAiStatus());
  }, []);

  function getSavedConfigForProvider(pid: string): SavedAiConfig | null {
    const all = listSavedConfigs();
    return all.find((c) => c.providerId === pid) ?? null;
  }

  const selectProvider = (pid: string): void => {
    const def = findProviderDefinition(pid) ?? PROVIDER_REGISTRY[0];
    setProviderId(pid);
    setProtocol(def.protocol);
    setBaseUrl(def.id === "custom" ? baseUrl : def.baseUrl);
    setModelId(def.id === "custom" ? modelId : def.defaultModelId);
    const saved = getSavedConfigForProvider(pid);
    setActiveConfigId(saved?.id ?? null);
    if (saved) {
      setCustomName(saved.nameZh);
      setCustomHeaders(saved.headers ? JSON.stringify(saved.headers) : "");
      setModelId(saved.modelId);
      setBaseUrl(saved.baseUrl);
    } else {
      setCustomName("");
      setCustomHeaders("");
    }
  };

  const fromSaved = (cfg: SavedAiConfig): void => {
    const def = findProviderDefinition(cfg.providerId);
    if (!def) return;
    setProviderId(cfg.providerId);
    setProtocol(cfg.protocol as ProviderProtocol);
    setBaseUrl(cfg.baseUrl);
    setModelId(cfg.modelId);
    setCustomName(cfg.nameZh);
    setCustomHeaders(cfg.headers ? JSON.stringify(cfg.headers) : "");
    setActiveConfigId(cfg.id);
    setApiKey(loadPersistedKey());
  };

  const connect = (persistKeyNow: boolean): void => {
    let headers: Record<string, string> | undefined;
    if (customHeaders.trim()) {
      try {
        const parsed = JSON.parse(customHeaders) as Record<string, string>;
        headers = typeof parsed === "object" && parsed !== null ? parsed : undefined;
      } catch {
        setStatus({
          state: "error",
          messageZh: "自定义 Headers 不是合法的 JSON 对象，请检查后重试。",
        });
        return;
      }
    }
    const result = activateAi({
      providerId,
      apiKey,
      modelId: modelId.trim() || undefined,
      baseUrl: baseUrl.trim() || undefined,
      protocol,
      headers,
      persistKey: persistKeyNow && rememberKey,
    });
    setStatus(result);
    setTestResultZh(null);
    if (result.state === "ready") {
      // Save/refresh the named config (non-secret).
      const config: SavedAiConfig = {
        id: activeConfigId ?? newConfigId(),
        nameZh: isCustom && customName.trim() ? customName.trim() : definition.nameZh,
        providerId,
        baseUrl: baseUrl.trim(),
        modelId: modelId.trim() || definition.defaultModelId,
        protocol,
        headers,
        rememberKey,
      };
      saveConfig(config);
      setSavedConfigs(listSavedConfigs());
    }
  };

  const test = async (): Promise<void> => {
    if (status.state !== "ready") {
      setTestResultZh("请先保存当前配置（连接），再测试连接。");
      return;
    }
    setTesting(true);
    setTestResultZh(null);
    try {
      const outcome = await testAiConnection();
      setTestResultZh(outcome.messageZh);
    } finally {
      setTesting(false);
    }
  };

  const save = (): void => {
    connect(false);
  };

  const loadModels = async (): Promise<void> => {
    setModelFetching(true);
    setModelFetchZh(null);
    try {
      const outcome = await fetchModels({ baseUrl, apiKey });
      if (outcome.ok) {
        setModels(outcome.models);
        setModelFetchZh(`找到 ${outcome.models.length} 个模型：${outcome.models.join("、")}`);
      } else {
        setModels([]);
        setModelFetchZh(outcome.messageZh);
      }
    } finally {
      setModelFetching(false);
    }
  };

  const remove = (id: string): void => {
    deleteConfig(id);
    setSavedConfigs(listSavedConfigs());
    if (activeConfigId === id) setActiveConfigId(null);
  };

  const showCapabilities = (): string => {
    return definition.capabilities.join(" / ");
  };

  return (
    <div className="page">
      <header className="step-header">
        <a href="#/" className="linklike">← 首页</a>
        <span className="dim">AI 设置</span>
      </header>

      <section className="card">
        <h2>选择 AI 服务（Provider Registry）</h2>
        <p className="fineprint">
          官方服务为系统内置推荐；自定义支持任意 OpenAI 兼容 API（输入 API 根地址，例如
          https://example.com/v1，endpoint 由适配器自动拼接）。
        </p>

        {PROVIDER_PRESETS.map((item) => (
          <label key={item.providerId} className="task-row" style={{ cursor: "pointer" }}>
            <input
              type="radio"
              name="ai-provider"
              checked={providerId === item.providerId}
              onChange={() => selectProvider(item.providerId)}
            />
            <span className="task-main">
              <strong>{item.nameZh}</strong>
              <small>
                默认模型：{item.defaultModelId} · {item.keyHintZh}
              </small>
            </span>
          </label>
        ))}
        <label className="task-row" style={{ cursor: "pointer" }}>
          <input
            type="radio"
            name="ai-provider"
            checked={isCustom}
            onChange={() => selectProvider("custom")}
          />
          <span className="task-main">
            <strong>自定义（OpenAI 兼容）</strong>
            <small>输入自己的 Base URL / 模型 / Key，可全局配置</small>
          </span>
        </label>
        <p className="fineprint dim">能力：{showCapabilities()}</p>
      </section>

      <section className="card">
        <h2>已保存配置</h2>
        {savedConfigs.length === 0 && <p className="dim">暂无已保存配置。</p>}
        {savedConfigs.map((cfg) => (
          <div key={cfg.id} className="task-row" style={{ alignItems: "center" }}>
            <span className="task-main">
              <strong>{cfg.nameZh}</strong>
              <small>
                {cfg.providerId} · {cfg.modelId} · {cfg.baseUrl || "自定义"}
              </small>
            </span>
            <span style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn option-btn" onClick={() => fromSaved(cfg)}>
                载入
              </button>
              <button type="button" className="btn option-btn" onClick={() => remove(cfg.id)}>
                删除
              </button>
            </span>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>{isCustom ? "自定义 Provider 配置" : `配置：${definition.nameZh}`}</h2>

        {isCustom && (
          <label className="fineprint" htmlFor="custom-name">
            Provider 名称（显示名）：
          </label>
        )}
        {isCustom && (
          <input
            id="custom-name"
            type="text"
            className="text-input"
            value={customName}
            placeholder="例如：我的网关"
            onChange={(event) => setCustomName(event.target.value)}
          />
        )}

        <label className="fineprint" htmlFor="ai-model">模型（Model）：</label>
        <input
          id="ai-model"
          type="text"
          className="text-input"
          value={modelId}
          placeholder={definition.defaultModelId || "输入模型名，例如 xxx-model"}
          onChange={(event) => setModelId(event.target.value)}
        />

        {definition.editableBaseUrl && (
          <>
            <label className="fineprint" htmlFor="ai-baseurl">API Base URL（API 根地址）：</label>
            <input
              id="ai-baseurl"
              type="text"
              className="text-input"
              value={baseUrl}
              spellCheck={false}
              placeholder="https://example.com/v1"
              onChange={(event) => setBaseUrl(event.target.value)}
            />
            <p className="fineprint dim">填写 API 根地址，无需 `…/chat/completions`，endpoint 由适配器自动拼接。</p>
          </>
        )}

        <label className="fineprint" htmlFor="ai-protocol">API 协议：</label>
        <select
          id="ai-protocol"
          className="text-input"
          value={protocol}
          onChange={(event) => setProtocol(event.target.value as ProviderProtocol)}
        >
          {(Object.keys(PROTOCOL_LABELS) as ProviderProtocol[])
            .filter((p) => p === definition.protocol || (p === "responses" && definition.allowResponses) || definition.type === "custom")
            .map((p) => (
              <option key={p} value={p}>
                {PROTOCOL_LABELS[p]}
              </option>
            ))}
        </select>

        <label className="fineprint" htmlFor="ai-key">API Key：</label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            id="ai-key"
            type={showKey ? "text" : "password"}
            className="text-input"
            value={apiKey}
            autoComplete="off"
            spellCheck={false}
            placeholder={`输入 ${definition.nameZh} 的 API Key`}
            onChange={(event) => setApiKey(event.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn option-btn"
            onClick={() => setShowKey((s) => !s)}
            aria-label={showKey ? "隐藏 Key" : "显示 Key"}
          >
            {showKey ? "隐藏" : "显示"}
          </button>
          {apiKey.length > 0 && (
            <button
              type="button"
              className="btn option-btn"
              onClick={() => setApiKey("")}
              aria-label="清除 Key"
            >
              清除
            </button>
          )}
        </div>

        <label className="task-row" style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={rememberKey}
            onChange={(event) => setRememberKey(event.target.checked)}
          />
          <span className="task-main">
            <strong>在本机记住此 Key（可选）</strong>
            <small>仅保存在浏览器 localStorage，永不写入源码/Git/构建产物；不建议在共用设备勾选。</small>
          </span>
        </label>
        <p className="fineprint">
          安全说明：默认 Key 只保存在本页面会话内存中，刷新即清空；绝不写入 IndexedDB，绝不随网络请求外的任何路径上传。
        </p>
        <p className="fineprint dim" style={{ marginTop: 6 }}>
          请注意：本应用是纯前端静态部署（GitHub Pages），没有服务器。
          「Key 仅保存在本机」（localStorage）只表示它不进入源码/构建产物，<strong>并不等于它在网络上不可被读取</strong>——
          它仍会随每次 AI 请求通过 HTTPS 发送给该 Provider；拥有你本机浏览器访问权限的脚本/站点也可能读到它。
          这不属于服务器端机密存储，请勿在共用或不信任的设备上保存 Key。
        </p>

        {definition.type === "custom" && (
          <>
            <label className="fineprint" htmlFor="ai-headers">自定义 Headers（可选，JSON 对象，不含 Key）：</label>
            <textarea
              id="ai-headers"
              className="text-input"
              rows={2}
              value={customHeaders}
              spellCheck={false}
              placeholder='{"X-Custom":"value"}'
              onChange={(event) => setCustomHeaders(event.target.value)}
            />
          </>
        )}

        <label className="fineprint" htmlFor="ai-model-fetch">
          模型列表（可选，自动获取）：
        </label>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            id="ai-model-fetch"
            className="text-input"
            style={{ flex: 1 }}
            value=""
            onChange={(event) => {
              if (event.target.value) {
                setModelId(event.target.value);
                event.target.value = "";
              }
            }}
          >
            <option value="">{models.length > 0 ? "选择自动获取的模型…" : "（未获取）"}</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn option-btn"
            onClick={() => void loadModels()}
            disabled={modelFetching}
          >
            {modelFetching ? "获取中…" : "获取模型"}
          </button>
        </div>
        <p className="fineprint dim">
          从 Base URL 的 <code>/models</code> 端点获取。获取失败不会阻断手动填写——直接在上方模型框输入即可。
        </p>
        {modelFetchZh && (
          <p className={modelFetchZh.startsWith("找到") ? "dim" : "notice"}>{modelFetchZh}</p>
        )}

        <button type="button" className="btn btn-primary btn-block" onClick={save}>
          连接并保存
        </button>
      </section>

      <section className="card">
        <h2>连接状态</h2>
        {status.state === "unconfigured" && (
          <p className="dim">未配置。AI 功能（讲解/错题分析/对话/AI 批改）暂不可用；核心学习不受影响（local-first，无 AI 也可完整使用）。</p>
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
          {testing ? "测试中…" : "测试连接（真实请求）"}
        </button>
        {testResultZh && (
          <p className={testResultZh.startsWith("连接成功") ? "dim" : "notice"}>{testResultZh}</p>
        )}

        {status.state !== "unconfigured" && (
          <button
            type="button"
            className="btn btn-block"
            onClick={() => {
              deactivateAi();
              setStatus(getAiStatus());
              setTestResultZh(null);
              setApiKey("");
            }}
          >
            清除本会话配置（不删除已保存配置）
          </button>
        )}
      </section>

      <section className="card">
        <h3>当前 Provider 能力</h3>
        {getActiveCapabilities().length === 0 ? (
          <p className="dim">未连接。连接后显示实际能力。</p>
        ) : (
          <p>{getActiveCapabilities().join(" · ")}</p>
        )}
        <p className="fineprint dim">
          说明：本应用的结构化输出采用「普通文本 JSON + 严格解析 + 安全回退」，无需 Provider
          原生 JSON Schema。若 Provider 不支持某能力，UI 会提示「当前 Provider 不支持此功能」并回退，绝不绝假。
        </p>
      </section>

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