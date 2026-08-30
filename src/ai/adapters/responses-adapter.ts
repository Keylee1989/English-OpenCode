/**
 * OpenAI Responses adapter (POST {baseUrl}/responses).
 *
 * Used ONLY for the "Responses" protocol. Enabled for Custom OpenAI-Compatible
 * providers only when the user explicitly selects it AND the app has allowed
 * it (see registry capability). Non-streaming only (honest capability).
 */
import type {
  AiChatMessage,
  AiCompletionRequest,
  AiCompletionResponse,
  IAiProvider,
} from "@/ai/provider";
import { AiAdapterError } from "@/ai/adapters/anthropic-adapter";

export type FetchLike = typeof fetch;

export interface ResponsesAdapterConfig {
  providerId: string;
  modelId: string;
  /** Base URL endpoint that accepts /responses, e.g. https://api.openai.com/v1. */
  baseUrl: string;
  apiKey: string;
  customHeaders?: Record<string, string>;
  fetchImpl?: FetchLike;
}

export class ResponsesProvider implements IAiProvider {
  readonly providerId: string;
  readonly modelId: string;

  private readonly config: ResponsesAdapterConfig;
  private readonly fetchImpl: FetchLike;

  constructor(config: ResponsesAdapterConfig) {
    this.config = config;
    this.providerId = config.providerId;
    this.modelId = config.modelId;
    this.fetchImpl = config.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const { baseUrl, apiKey } = this.config;
    if (!apiKey) throw new AiAdapterError("Missing API key.");
    const url = `${baseUrl.replace(/\/+$/, "")}/responses`;

    const input = request.messages.map((m): { role: AiChatMessage["role"]; content: string } => ({
      role: m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model: this.config.modelId,
      input,
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_output_tokens = request.maxTokens;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          ...this.config.customHeaders,
        },
        body: JSON.stringify(body),
        signal: request.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      if (err instanceof Error && err.name === "TypeError") {
        throw new AiAdapterError(
          "无法连接服务器（网络失败或 CORS 被禁止）。若该 API 不允许浏览器直接跨域访问，请使用允许 CORS 的端点或服务器代理。",
        );
      }
      throw new AiAdapterError(`Network error contacting ${this.providerId}: ${String(err)}`);
    }

    const text = await response.text();
    if (!response.ok) {
      throw new AiAdapterError(
        `${this.providerId} responded ${response.status}: ${text.slice(0, 300)}`,
        response.status,
      );
    }

    let parsed: { output_text?: string; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      throw new AiAdapterError(`${this.providerId} returned malformed JSON.`);
    }
    if (parsed.error?.message) {
      throw new AiAdapterError(parsed.error.message, response.status);
    }
    let content = parsed.output_text ?? "";
    if (!content && Array.isArray(parsed.output)) {
      content = (parsed.output as Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>)
        .flatMap((o) => o.content ?? [])
        .filter((c) => c.type === "output_text" && !!c.text)
        .map((c) => c.text ?? "")
        .join("");
    }
    return { text: content };
  }
}
