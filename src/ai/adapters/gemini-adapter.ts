/**
 * Google Gemini adapter (POST {baseUrl}/models/{model}:generateContent).
 *
 * Maps the shared `IAiProvider` chat contract to Gemini's generateContent
 * payload. Non-streaming only: to avoid shipping a half-baked SSE path we
 * deliberately declare streaming as unsupported, so the app's stream code
 * falls back to non-streaming `complete()` (identical output, honest).
 */
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  IAiProvider,
} from "@/ai/provider";
import { AiAdapterError } from "@/ai/adapters/anthropic-adapter";

export type FetchLike = typeof fetch;

export interface GeminiAdapterConfig {
  providerId: string;
  modelId: string;
  /** Base URL, e.g. https://generativelanguage.googleapis.com (no /models suffix). */
  baseUrl: string;
  apiKey: string;
  customHeaders?: Record<string, string>;
  fetchImpl?: FetchLike;
}

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message?: string };
}

export class GeminiProvider implements IAiProvider {
  readonly providerId: string;
  readonly modelId: string;

  private readonly config: GeminiAdapterConfig;
  private readonly fetchImpl: FetchLike;

  constructor(config: GeminiAdapterConfig) {
    this.config = config;
    this.providerId = config.providerId;
    this.modelId = config.modelId;
    this.fetchImpl = config.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const { baseUrl, apiKey } = this.config;
    if (!apiKey) throw new AiAdapterError("Missing API key.");
    // Gemini accepts a key as an ?key= query param on the generateContent URL.
    const base = `${baseUrl.replace(/\/+$/, "")}/models/${encodeURIComponent(
      this.config.modelId,
    )}:generateContent`;
    const url = `${base}?key=${encodeURIComponent(apiKey)}`;

    // Gemini uses roles "user" / "model"; system text goes into contents as
    // the first user-ish part, which is the pragmatic cross-vendor approach.
    const contents: Array<{ role: string; parts: GeminiPart[] }> = [];
    for (const m of request.messages) {
      const role = m.role === "assistant" ? "model" : m.role === "system" ? "user" : "user";
      contents.push({ role, parts: [{ text: m.content }] });
    }

    const body: Record<string, unknown> = { contents };
    if (request.temperature !== undefined) {
      body.generationConfig = { ...(body.generationConfig as object), temperature: request.temperature };
    }
    if (request.maxTokens !== undefined) {
      body.generationConfig = {
        ...((body.generationConfig as { temperature?: number }) ?? {}),
        maxOutputTokens: request.maxTokens,
      };
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...this.config.customHeaders,
        },
        body: JSON.stringify(body),
        signal: request.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      throw this.wrapNetworkError(err);
    }

    const text = await response.text();
    if (!response.ok) {
      throw new AiAdapterError(
        `${this.providerId} responded ${response.status}: ${text.slice(0, 300)}`,
        response.status,
      );
    }

    let parsed: GeminiResponse;
    try {
      parsed = JSON.parse(text) as GeminiResponse;
    } catch {
      throw new AiAdapterError(`${this.providerId} returned malformed JSON.`);
    }
    if (parsed.error?.message) {
      throw new AiAdapterError(parsed.error.message, response.status);
    }
    const content = (parsed.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");
    return { text: content };
  }

  private wrapNetworkError(err: unknown): AiAdapterError {
    if (err instanceof Error && err.name === "TypeError") {
      return new AiAdapterError(
        "无法连接服务器（网络失败或 CORS 被禁止）。若该 API 不允许浏览器直接跨域访问，请使用允许 CORS 的端点或服务器代理。",
      );
    }
    return new AiAdapterError(`Network error contacting ${this.providerId}: ${String(err)}`);
  }
}
