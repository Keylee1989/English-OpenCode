/**
 * AI Provider abstraction (spec §29).
 *
 * Contract for ALL AI backends (OpenAI-compatible first: OpenAI, DeepSeek,
 * Qwen, Doubao, ...). Nothing in the app may import a concrete SDK; engines
 * receive an IAiProvider instance through configuration only.
 *
 * PHASE 0: interface only. No concrete provider, no network code.
 */

export type AiChatRole = "system" | "user" | "assistant";

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
}

export interface AiCompletionRequest {
  messages: AiChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Callers must be able to cancel long requests. */
  signal?: AbortSignal;
  /**
   * Phase 11: optional feature label for usage telemetry only
   * (e.g. "explanation" / "writing-review"). Never contains user content.
   */
  feature?: string;
}

export interface AiCompletionResponse {
  text: string;
  finishReason?: "stop" | "length" | "error";
}

/**
 * Minimal synchronous chat capability. Streaming is a future extension;
 * every feature must work with non-streaming responses only.
 */
export interface IAiProvider {
  /** e.g. "openai-compatible", "deepseek", custom proxy id. */
  readonly providerId: string;
  readonly modelId: string;

  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}
