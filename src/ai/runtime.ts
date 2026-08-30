/**
 * AI runtime session holder (Phase 4-B).
 *
 * SECURITY CONTRACT (docs/architecture.md, Phase 4-B):
 * - The API key lives in this module's in-memory variable ONLY.
 *   It is never written to IndexedDB (Dexie), never to localStorage,
 *   and never logged or serialized.
 * - A page refresh clears it by design ("session memory").
 * - Only NON-SECRET preferences (providerId / modelId) are persisted to
 *   localStorage so the user does not re-select their vendor every visit.
 */
import type { IAiProvider } from "@/ai/provider";
import { createProvider } from "@/ai/providers";
import { recordAiUsage } from "@/ai/usage-tracker";

export interface AiSessionStatus {
  state: "unconfigured" | "ready" | "error";
  providerId?: string;
  modelId?: string;
  messageZh?: string;
}

interface AiRuntimeState {
  provider: IAiProvider | null;
  status: AiSessionStatus;
}

const state: AiRuntimeState = { provider: null, status: { state: "unconfigured" } };

const PREF_KEY = "english360.ai.pref";

/** Non-secret preference persisted across visits (never contains the key). */
export interface AiPreference {
  providerId: string;
  modelId?: string;
}

export function saveAiPreference(pref: AiPreference): void {
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify({ providerId: pref.providerId, modelId: pref.modelId }));
  } catch {
    // Storage may be unavailable (private mode); session-only then.
  }
}

export function loadAiPreference(): AiPreference | null {
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AiPreference>;
    if (typeof parsed.providerId !== "string") return null;
    return { providerId: parsed.providerId, modelId: parsed.modelId };
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

export interface ActivateAiInput {
  providerId: string;
  apiKey: string;
  modelId?: string;
}

/**
 * Build a provider from a runtime key and hold it for this session only.
 * Returns the resulting status; on failure nothing is retained.
 */
export function activateAi(input: ActivateAiInput): AiSessionStatus {
  if (!input.apiKey.trim()) {
    state.provider = null;
    state.status = { state: "error", messageZh: "API Key 为空，未启用 AI。" };
    return state.status;
  }
  try {
    const provider = createProvider({
      providerId: input.providerId,
      modelId: input.modelId,
      apiKey: input.apiKey.trim(),
    });
    state.provider = wrapWithUsageTracking(provider);
    state.status = {
      state: "ready",
      providerId: provider.providerId,
      modelId: provider.modelId,
      messageZh: `已连接 ${provider.providerId}（本会话有效，刷新后需重新输入 Key）。`,
    };
    saveAiPreference({ providerId: input.providerId, modelId: input.modelId });
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
}

/**
 * Phase 11-B Task 5: transparent usage-tracking wrapper.
 * Records provider/model/timestamp/feature/ok (+ rough token estimate) for
 * every completion - streaming or not. Metadata only; message content and
 * the API key never reach the log. Failures are recorded, then re-thrown so
 * callers see the real error unchanged.
 */
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

  // Preserve optional streaming capability with the same telemetry.
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

/** Current status snapshot (safe to render; never contains the key). */
export function getAiStatus(): AiSessionStatus {
  return state.status;
}

/** The active provider, or null when unconfigured/failed. */
export function getActiveAiProvider(): IAiProvider | null {
  return state.provider;
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
 * Minimal real round-trip to verify connectivity + key acceptance.
 * Uses a tiny max-token request; result is reported honestly.
 */
export async function testAiConnection(): Promise<ConnectionTestResult> {
  const provider = state.provider;
  if (!provider) {
    return { ok: false, messageZh: "尚未配置可用的 AI Provider。" };
  }
  try {
    const response = await provider.complete({
      messages: [{ role: "user", content: "Reply with the single word: OK" }],
      temperature: 0,
      maxTokens: 8,
    });
    const ok = response.text.trim().length > 0;
    return ok
      ? { ok: true, messageZh: `连接成功：${provider.providerId} / ${provider.modelId} 已响应。` }
      : { ok: false, messageZh: `${provider.providerId} 返回了空响应。` };
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 200) : String(err);
    return { ok: false, messageZh: `连接失败：${detail}` };
  }
}
