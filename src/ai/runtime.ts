/**
 * AI runtime session holder (Phase 4-B, extended for multi-provider/custom).
 *
 * SECURITY CONTRACT (docs/architecture.md, Phase 4-B) — preserved:
 * - By default the API key lives in this module's in-memory variable ONLY.
 *   It is never written to IndexedDB (Dexie), never logged, never serialized.
 * - The user may OPT IN to remembering the key in browser localStorage
 *   (runtime-only storage, never in git/build). This is the user's explicit
 *   choice; the safe default is session-only.
 * - Only NON-SECRET preferences (providerId / modelId / baseUrl / protocol /
 *   custom headers) are persisted so the user does not reconfigure every visit.
 * - Keys NEVER enter the bundle, logs, usage tracker, or error messages.
 */
import type { IAiProvider } from "@/ai/provider";
import { createProvider, findProviderDefinition } from "@/ai/providers";
import { recordAiUsage } from "@/ai/usage-tracker";
import type { Capability, ProviderProtocol } from "@/ai/registry/provider-registry";
import { hasCapability, capabilityUnavailableZh } from "@/ai/registry/provider-registry";

export interface AiSessionStatus {
  state: "unconfigured" | "ready" | "error";
  providerId?: string;
  modelId?: string;
  messageZh?: string;
}

interface AiRuntimeState {
  provider: IAiProvider | null;
  status: AiSessionStatus;
  protocol: ProviderProtocol;
  capabilities: readonly Capability[];
}

const state: AiRuntimeState = {
  provider: null,
  status: { state: "unconfigured" },
  protocol: "chat-completions",
  capabilities: [],
};

const PREF_KEY = "english360.ai.pref";
const KEY_PERSIST_KEY = "english360.ai.key"; // opt-in key store (localStorage only)

export interface AiConfigPersist {
  providerId: string;
  modelId?: string;
  baseUrl?: string;
  protocol?: string;
  headers?: Record<string, string>;
}

/** Non-secret preference persisted across visits (never contains the key). */
export interface AiPreference {
  providerId: string;
  modelId?: string;
  baseUrl?: string;
  protocol?: string;
  headers?: Record<string, string>;
}

export function saveAiPreference(pref: AiPreference): void {
  try {
    const cfg: AiConfigPersist = {
      providerId: pref.providerId,
      ...(pref.modelId ? { modelId: pref.modelId } : {}),
      ...(pref.baseUrl ? { baseUrl: pref.baseUrl } : {}),
      ...(pref.protocol ? { protocol: pref.protocol } : {}),
      ...(pref.headers ? { headers: pref.headers } : {}),
    };
    window.localStorage.setItem(PREF_KEY, JSON.stringify(cfg));
  } catch {
    // Storage may be unavailable (private mode); session-only then.
  }
}

export function loadAiPreference(): AiPreference | null {
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as Partial<AiConfigPersist>;
    if (typeof cfg.providerId !== "string") return null;
    return {
      providerId: cfg.providerId,
      modelId: cfg.modelId,
      baseUrl: cfg.baseUrl,
      protocol: cfg.protocol,
      headers: cfg.headers,
    };
  } catch {
    return null;
  }
}

export function clearAiPreference(): void {
  try {
    window.localStorage.removeItem(PREF_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Optional key persistence (user-authorized; OPPOSITE of the safe default).
// Stored in localStorage only (runtime), never in git/build/source.
// ---------------------------------------------------------------------------

/** Read the persisted key, if the user opted in. Returns "" when absent. */
export function loadPersistedKey(): string {
  try {
    const raw = window.localStorage.getItem(KEY_PERSIST_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { key?: string } | string;
    return typeof parsed === "string" ? parsed : (parsed.key ?? "");
  } catch {
    return "";
  }
}

export function persistKey(key: string): void {
  try {
    window.localStorage.setItem(KEY_PERSIST_KEY, JSON.stringify({ key }));
  } catch {
    // ignore
  }
}

export function clearPersistedKey(): void {
  try {
    window.localStorage.removeItem(KEY_PERSIST_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------

export interface ActivateAiInput {
  providerId: string;
  apiKey: string;
  modelId?: string;
  /** Optional custom/override base URL (API root). */
  baseUrl?: string;
  /** Protocol override when the provider allows it. */
  protocol?: string;
  /** Custom headers (never the key). */
  headers?: Record<string, string>;
  /** Opt-in: remember the key in browser localStorage. Default off. */
  persistKey?: boolean;
}

/**
 * Build a provider from runtime config and hold it for this session only.
 * Returns the resulting status; on failure nothing is retained. Only the
 * non-secret config is persisted; the key is retained only on explicit opt-in.
 */
export function activateAi(input: ActivateAiInput): AiSessionStatus {
  if (!input.apiKey.trim()) {
    state.provider = null;
    state.status = { state: "error", messageZh: "API Key 为空，未启用 AI。" };
    return state.status;
  }
  const definition = findProviderDefinition(input.providerId);
  if (!definition) {
    state.provider = null;
    state.status = { state: "error", messageZh: `未知的 AI Provider：${input.providerId}` };
    return state.status;
  }
  try {
    const provider = createProvider({
      providerId: input.providerId,
      modelId: input.modelId,
      apiKey: input.apiKey.trim(),
      baseUrl: input.baseUrl,
      protocol: input.protocol as ProviderProtocol | undefined,
      headers: input.headers,
    });
    const protocol = (input.protocol ?? definition.protocol) as ProviderProtocol;
    state.provider = wrapWithUsageTracking(provider);
    state.protocol = protocol;
    state.capabilities = definition.capabilities;
    state.status = {
      state: "ready",
      providerId: provider.providerId,
      modelId: provider.modelId,
      messageZh: `已连接 ${definition.nameZh} / ${provider.modelId}（本会话有效）。`,
    };
    saveAiPreference({
      providerId: input.providerId,
      modelId: input.modelId,
      baseUrl: input.baseUrl,
      protocol: input.protocol,
      headers: input.headers,
    });
    if (input.persistKey) persistKey(input.apiKey.trim());
    else clearPersistedKey();
    return state.status;
  } catch (err) {
    state.provider = null;
    state.status = {
      state: "error",
      messageZh: `AI 配置失败：${err instanceof Error ? err.message : String(err)}`,
    };
    return state.status;
  }
}

/** Drop the in-memory key/provider immediately. */
export function deactivateAi(): void {
  state.provider = null;
  state.status = { state: "unconfigured", messageZh: "已清除本会话的 AI 配置。" };
  clearAiPreference();
  clearPersistedKey();
}

// ---------------------------------------------------------------------------
// usage-tracking wrapper (preserved unchanged)
// ---------------------------------------------------------------------------

function wrapWithUsageTracking(provider: IAiProvider): IAiProvider {
  const roughTokens = (request: { messages?: Array<{ content?: string }> }): number =>
    Math.ceil(
      (request.messages ?? []).reduce((sum, m) => sum + (m.content?.length ?? 0), 0) / 4,
    );

  const trackCall = async (
    feature: string | undefined,
    request: { messages?: Array<{ content?: string }> },
    run: () => Promise<void>,
  ): Promise<void> => {
    const started = Date.now();
    try {
      await run();
      await recordAiUsage({
        provider: provider.providerId,
        model: provider.modelId,
        timestamp: started,
        feature: feature ?? "chat",
        tokens: roughTokens(request),
        durationMs: Date.now() - started,
        retryCount: 0,
        ok: true,
      });
    } catch (err) {
      await recordAiUsage({
        provider: provider.providerId,
        model: provider.modelId,
        timestamp: started,
        feature: feature ?? "chat",
        durationMs: Date.now() - started,
        retryCount: 0,
        ok: false,
      });
      throw err;
    }
  };

  const wrapped: IAiProvider = {
    providerId: provider.providerId,
    modelId: provider.modelId,
    complete: async (request) => {
      let response!: Awaited<ReturnType<IAiProvider["complete"]>>;
      await trackCall(request.feature, request, async () => {
        response = await provider.complete(request);
      });
      return response;
    },
  };

  const streamCapable = provider as IAiProvider & {
    completeStream?: (
      request: Parameters<IAiProvider["complete"]>[0],
    ) => AsyncGenerator<unknown, void, unknown>;
  };
  if (typeof streamCapable.completeStream === "function") {
    const originalStream = streamCapable.completeStream.bind(provider);
    Object.defineProperty(wrapped, "completeStream", {
      enumerable: false,
      value: async function* (
        this: unknown,
        request: Parameters<IAiProvider["complete"]>[0],
      ) {
        const started = Date.now();
        try {
          for await (const part of originalStream(request)) {
            yield part;
          }
          await recordAiUsage({
            provider: provider.providerId,
            model: provider.modelId,
            timestamp: started,
            feature: request.feature ?? "explanation",
            tokens: roughTokens(request),
            durationMs: Date.now() - started,
            retryCount: 0,
            ok: true,
          });
        } catch (err) {
          await recordAiUsage({
            provider: provider.providerId,
            model: provider.modelId,
            timestamp: started,
            feature: request.feature ?? "explanation",
            durationMs: Date.now() - started,
            retryCount: 0,
            ok: false,
          });
          throw err;
        }
      },
    });
  }
  return wrapped;
}

// ---------------------------------------------------------------------------

/** Current status snapshot (safe to render; never contains the key). */
export function getAiStatus(): AiSessionStatus {
  return state.status;
}

/** The active provider, or null when unconfigured/failed. */
export function getActiveAiProvider(): IAiProvider | null {
  return state.provider;
}

/** The active protocol. */
export function getActiveProtocol(): ProviderProtocol {
  return state.protocol;
}

/** The active definition's capabilities (empty when unconfigured). */
export function getActiveCapabilities(): readonly Capability[] {
  return state.capabilities;
}

/** Honest capability check against the active provider. */
export function canSupport(cap: Capability): boolean {
  if (!state.provider) return false;
  const def = findProviderDefinition(state.status.providerId ?? "");
  return def ? hasCapability(def, cap) : false;
}

/** Message describing why a capability is unavailable (for UI fallback). */
export function capabilityUnavailableMessage(cap: Capability): string {
  const def = findProviderDefinition(state.status.providerId ?? "");
  return capabilityUnavailableZh(def, cap);
}

/** True when AI features may attempt calls right now. */
export function isAiReady(): boolean {
  return state.provider !== null && state.status.state === "ready";
}

export interface ConnectionTestResult {
  ok: boolean;
  messageZh: string;
}

/**
 * Real round-trip to verify connectivity + key acceptance + model.
 * Reports status-based detail (auth / model / timeout / CORS) but NEVER the
 * API key.
 */
export async function testAiConnection(): Promise<ConnectionTestResult> {
  const provider = state.provider;
  if (!provider) {
    return { ok: false, messageZh: "尚未配置可用的 AI Provider。" };
  }
  const name = state.status.providerId ?? provider.providerId;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    let response;
    try {
      response = await provider.complete({
        messages: [{ role: "user", content: "Reply with the single word: OK" }],
        temperature: 0,
        maxTokens: 8,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    const ok = response.text.trim().length > 0;
    return ok
      ? { ok: true, messageZh: `连接成功：${name} / ${provider.modelId} 已响应。` }
      : { ok: false, messageZh: `${name} 返回了空响应。` };
  } catch (err) {
    return { ok: false, messageZh: describeAiError(err, name) };
  }
}

/** Non-sensitive, key-free description of a connection failure. */
export function describeAiError(err: unknown, name: string): string {
  if (err instanceof Error && err.name === "AbortError") {
    return `${name} 连接失败：请求超时（30 秒）。请检查 Base URL / 网络。`;
  }
  const status = (err as { status?: number })?.status;
  if (typeof status === "number") {
    if (status === 401 || status === 403) {
      return `${name} 连接失败：认证错误（HTTP ${status}），API Key 无效或没有权限。`;
    }
    if (status === 404) {
      return `${name} 连接失败：未找到（HTTP 404），Base URL 或模型名无效，或不支持该端点。`;
    }
    if (status >= 400 && status < 500) {
      return `${name} 连接失败：请求被拒绝（HTTP ${status}），请检查模型名 / 参数配置。`;
    }
    return `${name} 连接失败：服务端错误（HTTP ${status}）。`;
  }
  const message = err instanceof Error ? err.message : String(err);
  if (
    err instanceof TypeError ||
    /CORS|Network error contacting|无法连接/i.test(message)
  ) {
    return `${name} 连接失败：${message}（若该 API 不允许浏览器直接跨域访问，则需要支持 CORS 的端点或服务器代理）。`;
  }
  return `${name} 连接失败：${message.slice(0, 200)}`;
}
