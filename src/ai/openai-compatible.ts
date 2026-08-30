/**
 * OpenAI-compatible provider implementation (Phase 4-A).
 *
 * Works with any endpoint that implements the `/chat/completions` schema:
 * OpenAI, DeepSeek, Qwen (DashScope compatible-mode), Doubao (Ark), etc.
 *
 * SECURITY POLICY (docs/architecture.md):
 * - The API key is supplied at runtime by the caller and held in memory only.
 * - This module NEVER persists keys, never logs them, never sends them anywhere
 *   except the configured provider endpoint.
 */
import type {
  AiChatMessage,
  AiCompletionRequest,
  AiCompletionResponse,
  IAiProvider,
} from "@/ai/provider";

export class AiProviderError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AiProviderError";
    this.status = status;
  }
}

export type FetchLike = typeof fetch;

export interface OpenAiCompatibleConfig {
  /** Stable id surfaced as `providerId`, e.g. "deepseek". */
  providerId: string;
  /** Model id understood by the endpoint, e.g. "gpt-4o-mini", "deepseek-chat". */
  modelId: string;
  /** Base URL WITHOUT the /chat/completions suffix, no trailing slash. */
  baseUrl: string;
  /** Runtime-supplied key. Held in memory only; never persisted by this module. */
  apiKey: string;
  /** Injectable for tests. */
  fetchImpl?: FetchLike;
}

interface ChatCompletionChoice {
  message?: { content?: string | null };
  finish_reason?: string;
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
  error?: { message?: string };
}

export function mapFinishReason(raw: string | undefined): AiCompletionResponse["finishReason"] {
  switch (raw) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    default:
      return raw ? "error" : undefined;
  }
}

export class OpenAiCompatibleProvider implements IAiProvider {
  readonly providerId: string;
  readonly modelId: string;

  private readonly config: OpenAiCompatibleConfig;
  private readonly fetchImpl: FetchLike;

  constructor(config: OpenAiCompatibleConfig) {
    this.config = config;
    this.providerId = config.providerId;
    this.modelId = config.modelId;
    // Default to global fetch when available; tests inject their own.
    this.fetchImpl =
      config.fetchImpl ??
      ((url, init) => fetch(url, init));
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const { baseUrl, apiKey } = this.config;
    if (!apiKey) {
      throw new AiProviderError("Missing API key: supply a runtime key via configuration.");
    }
    const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const body: Record<string, unknown> = {
      model: this.config.modelId,
      messages: request.messages.map((m): AiChatMessage => ({ role: m.role, content: m.content })),
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: request.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      throw new AiProviderError(`Network error contacting ${this.providerId}: ${String(err)}`);
    }

    const text = await response.text();
    if (!response.ok) {
      // Never echo the key; include only a trimmed slice of the endpoint error.
      const detail = text.slice(0, 300);
      throw new AiProviderError(
        `${this.providerId} responded ${response.status}: ${detail}`,
        response.status,
      );
    }

    let parsed: ChatCompletionResponse;
    try {
      parsed = JSON.parse(text) as ChatCompletionResponse;
    } catch {
      throw new AiProviderError(`${this.providerId} returned malformed JSON.`);
    }

    if (parsed.error?.message) {
      throw new AiProviderError(parsed.error.message, response.status);
    }
    const choice = parsed.choices?.[0];
    const content = choice?.message?.content ?? "";
    return { text: content, finishReason: mapFinishReason(choice?.finish_reason) };
  }

  /**
   * Streaming completion (Phase 5): SSE `stream:true` chat/completions.
   * Yields text deltas as they arrive; abort via request.signal.
   * Works with OpenAI / DeepSeek / DashScope-compatible / Ark endpoints
   * because they share the same SSE schema.
   */
  async *completeStream(request: AiCompletionRequest): AsyncGenerator<
    { delta?: string; done: false; finishReason?: undefined } | { delta?: undefined; done: true; finishReason: AiCompletionResponse["finishReason"] },
    void,
    unknown
  > {
    const { baseUrl, apiKey } = this.config;
    if (!apiKey) {
      throw new AiProviderError("Missing API key: supply a runtime key via configuration.");
    }
    const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const body: Record<string, unknown> = {
      model: this.config.modelId,
      messages: request.messages.map((m): AiChatMessage => ({ role: m.role, content: m.content })),
      stream: true,
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          accept: "text/event-stream",
        },
        body: JSON.stringify(body),
        signal: request.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      throw new AiProviderError(`Network error contacting ${this.providerId}: ${String(err)}`);
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new AiProviderError(
        `${this.providerId} responded ${response.status}: ${detail}`,
        response.status,
      );
    }
    if (!response.body) {
      throw new AiProviderError(`${this.providerId} returned no stream body.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finishReason: AiCompletionResponse["finishReason"];

    const handleEvent = (payload: string): { delta?: string; finish?: string } => {
      if (payload === "[DONE]") return { finish: "stop" };
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string }>;
          error?: { message?: string };
        };
        if (json.error?.message) {
          throw new AiProviderError(json.error.message);
        }
        const choice = json.choices?.[0];
        return {
          delta: choice?.delta?.content ?? "",
          finish: choice?.finish_reason ?? undefined,
        };
      } catch (err) {
        if (err instanceof AiProviderError) throw err;
        return {}; // keep-alive/comment lines are ignored honestly
      }
    };

    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        throw new AiProviderError(`Stream read failed: ${String(err)}`);
      }
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });

      let separatorIndex = buffer.search(/\r?\n\r?\n/);
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + (buffer[separatorIndex] === "\r" ? 4 : 2));
        for (const line of rawEvent.split(/\r?\n/)) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          const outcome = handleEvent(payload);
          if (outcome.finish && !outcome.delta) {
            finishReason = mapFinishReason(outcome.finish);
            yield { done: true as const, finishReason };
            return;
          }
          if (outcome.delta) {
            if (outcome.finish) {
              const mapped = mapFinishReason(outcome.finish);
              if (mapped) finishReason = mapped;
            }
            yield { delta: outcome.delta, done: false as const };
          }
        }
        separatorIndex = buffer.search(/\r?\n\r?\n/);
      }
    }
    // Stream ended without [DONE]: still report what we have.
    yield { done: true as const, finishReason: mapFinishReason(finishReason) };
  }
}

/** Structural capability check for streaming-capable providers. */
export function isStreamingProvider(
  provider: IAiProvider,
): provider is IAiProvider & Pick<OpenAiCompatibleProvider, "completeStream"> {
  return typeof (provider as Partial<OpenAiCompatibleProvider>).completeStream === "function";
}
