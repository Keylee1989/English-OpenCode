/**
 * Anthropic Messages adapter (POST {baseUrl}/v1/messages).
 *
 * Translated from the shared `IAiProvider` chat contract into Anthropic's
 * messages schema, then maps the response back to `AiCompletionResponse`.
 * Streaming (SSE `stream:true`) is supported with the same delta contract as
 * the OpenAI-compatible adapter so `streamExplanation` can use it directly.
 *
 * SECURITY: the key is supplied at runtime and held in memory only; it is
 * never persisted, logged, or sent anywhere except the configured endpoint.
 */
import type {
  AiChatMessage,
  AiCompletionRequest,
  AiCompletionResponse,
  IAiProvider,
} from "@/ai/provider";

export class AiAdapterError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AiAdapterError";
    this.status = status;
  }
}

export type FetchLike = typeof fetch;

export interface AnthropicAdapterConfig {
  providerId: string;
  modelId: string;
  /** Base URL WITHOUT the /v1/messages suffix, no trailing slash, e.g. https://api.anthropic.com. */
  baseUrl: string;
  apiKey: string;
  customHeaders?: Record<string, string>;
  fetchImpl?: FetchLike;
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string | null;
  error?: { message?: string };
}

function mapAnthropicRole(role: AiChatMessage["role"]): AnthropicMessage["role"] {
  // Anthropic has no "system" role in messages; system is passed via system field.
  return role === "assistant" ? "assistant" : "user";
}

export class AnthropicProvider implements IAiProvider {
  readonly providerId: string;
  readonly modelId: string;

  private readonly config: AnthropicAdapterConfig;
  private readonly fetchImpl: FetchLike;

  constructor(config: AnthropicAdapterConfig) {
    this.config = config;
    this.providerId = config.providerId;
    this.modelId = config.modelId;
    this.fetchImpl = config.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-api-key": this.config.apiKey,
      "anthropic-version": "2023-06-01",
      ...this.config.customHeaders,
      ...extra,
    };
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const { baseUrl, apiKey } = this.config;
    if (!apiKey) throw new AiAdapterError("Missing API key.");
    const url = `${baseUrl.replace(/\/+$/, "")}/v1/messages`;

    const system = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
    const messages: AnthropicMessage[] = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: mapAnthropicRole(m.role), content: m.content }));

    const body: Record<string, unknown> = {
      model: this.config.modelId,
      messages,
      max_tokens: request.maxTokens ?? 1024,
    };
    if (system) body.system = system;
    if (request.temperature !== undefined) body.temperature = request.temperature;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: this.headers(),
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

    let parsed: AnthropicResponse;
    try {
      parsed = JSON.parse(text) as AnthropicResponse;
    } catch {
      throw new AiAdapterError(`${this.providerId} returned malformed JSON.`);
    }
    if (parsed.error?.message) {
      throw new AiAdapterError(parsed.error.message, response.status);
    }
    const content = (parsed.content ?? []).map((b) => b.text ?? "").join("") ?? "";
    const finishReason =
      parsed.stop_reason === "max_tokens" || parsed.stop_reason === "length"
        ? "length"
        : parsed.stop_reason
          ? "stop"
          : undefined;
    return { text: content, finishReason };
  }

  /**
   * SSE streaming (Anthropic event stream). Yields text deltas, then done.
   * Non-content events are ignored honestly.
   */
  async *completeStream(
    request: AiCompletionRequest,
  ): AsyncGenerator<
    | { delta?: string; done: false; finishReason?: undefined }
    | { delta?: undefined; done: true; finishReason: AiCompletionResponse["finishReason"] },
    void,
    unknown
  > {
    const { baseUrl, apiKey } = this.config;
    if (!apiKey) throw new AiAdapterError("Missing API key.");
    const url = `${baseUrl.replace(/\/+$/, "")}/v1/messages`;

    const system = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
    const messages: AnthropicMessage[] = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: mapAnthropicRole(m.role), content: m.content }));

    const body: Record<string, unknown> = {
      model: this.config.modelId,
      messages,
      max_tokens: request.maxTokens ?? 1024,
      stream: true,
    };
    if (system) body.system = system;
    if (request.temperature !== undefined) body.temperature = request.temperature;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: this.headers({ accept: "text/event-stream" }),
        body: JSON.stringify(body),
        signal: request.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      throw this.wrapNetworkError(err);
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new AiAdapterError(
        `${this.providerId} responded ${response.status}: ${detail}`,
        response.status,
      );
    }
    if (!response.body) throw new AiAdapterError(`${this.providerId} returned no stream body.`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finishReason: AiCompletionResponse["finishReason"];

    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        throw new AiAdapterError(`Stream read failed: ${String(err)}`);
      }
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });

      let separatorIndex = buffer.search(/\r?\n\r?\n/);
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + (buffer[separatorIndex] === "\r" ? 4 : 2));
        const eventType = rawEvent.split(/\r?\n/).find((l) => l.startsWith("event:"))?.slice(6).trim();
        for (const line of rawEvent.split(/\r?\n/)) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const json = JSON.parse(payload) as {
              type?: string;
              delta?: { type?: string; text?: string };
              message?: { stop_reason?: string };
            };
            if (json.type === "content_block_delta" && json.delta?.text) {
              yield { delta: json.delta.text, done: false as const };
            } else if (json.type === "message_delta" && json.message?.stop_reason) {
              finishReason = json.message.stop_reason === "max_tokens" || json.message.stop_reason === "length"
                ? "length"
                : "stop";
            }
            void eventType;
          } catch {
            // keep-alive / server events are ignored honestly
          }
        }
        separatorIndex = buffer.search(/\r?\n\r?\n/);
      }
    }
    yield { done: true as const, finishReason: mapAnthropicFinish(finishReason) };
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

function mapAnthropicFinish(raw: AiCompletionResponse["finishReason"]): AiCompletionResponse["finishReason"] {
  return raw === "length" ? "length" : raw;
}
