/**
 * AI Provider Registry (multi-provider / custom API capability).
 *
 * Central registry of every provider the app can talk to. Each entry declares
 * its transport type, default model, and the capabilities it actually supports.
 * The factory builds a concrete adapter from a registry definition + runtime
 * config (base URL, model, key, protocol, custom headers).
 *
 * The UNIFIED runtime surface remains `IAiProvider` (complete/completeStream),
 * so the whole learning system (grading, tutor, roleplay, diagnosis, feedback,
 * fallback, timeout, invalid-JSON) is untouched by which provider is active.
 *
 * SECURITY: definitions contain public endpoints / default model ids ONLY.
 * API keys are supplied at runtime and never stored here, in source, in the
 * build, or in git.
 */
import type { IAiProvider } from "@/ai/provider";
import { OpenAiCompatibleProvider } from "@/ai/openai-compatible";
import { AnthropicProvider, AiAdapterError } from "@/ai/adapters/anthropic-adapter";
import { GeminiProvider } from "@/ai/adapters/gemini-adapter";
import { ResponsesProvider } from "@/ai/adapters/responses-adapter";

export type ProviderType = "openai-compatible" | "anthropic" | "gemini" | "custom";

export type ProviderProtocol = "chat-completions" | "responses" | "messages" | "generate-content";

export type Capability = "chat" | "structuredOutput" | "streaming" | "vision" | "audio" | "reasoning" | "toolCalling";

export interface ProviderDefinition {
  /** Stable id, e.g. "openai", "anthropic", "deepseek", "custom", or a user-defined name. */
  id: string;
  /** Display name. */
  nameZh: string;
  /** Transport family that selects the adapter. */
  type: ProviderType;
  /** Default base URL (public, pre-filled, user-modifiable). */
  baseUrl: string;
  /** Default model id. */
  defaultModelId: string;
  /** Which protocol the adapter uses by default. */
  protocol: ProviderProtocol;
  /** Capabilities the provider actually guarantees. Never assumed. */
  capabilities: readonly Capability[];
  /** Hint shown in the settings UI. */
  keyHintZh: string;
  /** Whether the user may edit the base URL. */
  editableBaseUrl: boolean;
  /** Whether the "Responses" protocol may be selected (only truly compatible). */
  allowResponses: boolean;
}

/** Every capability, for validation. */
export const ALL_CAPABILITIES: readonly Capability[] = [
  "chat",
  "structuredOutput",
  "streaming",
  "vision",
  "audio",
  "reasoning",
  "toolCalling",
];

/** text-JSON structured outputs is what the whole app uses (no native schema). */
const TEXT_STRUCTURED: readonly Capability[] = ["chat", "structuredOutput"];

export const PROVIDER_REGISTRY: readonly ProviderDefinition[] = [
  {
    id: "openai",
    nameZh: "OpenAI",
    type: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    defaultModelId: "gpt-4o-mini",
    protocol: "chat-completions",
    capabilities: [...TEXT_STRUCTURED, "streaming"],
    keyHintZh: "在 platform.openai.com 创建 API Key。",
    editableBaseUrl: true,
    allowResponses: true,
  },
  {
    id: "anthropic",
    nameZh: "Anthropic (Claude)",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com",
    defaultModelId: "claude-3-5-haiku-latest",
    protocol: "messages",
    capabilities: [...TEXT_STRUCTURED, "streaming"],
    keyHintZh: "在 console.anthropic.com 创建 API Key。注意：Anthropic 官方 API 通常不允许浏览器直连（CORS），建议使用支持 CORS 的代理。",
    editableBaseUrl: true,
    allowResponses: false,
  },
  {
    id: "gemini",
    nameZh: "Google Gemini",
    type: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    defaultModelId: "gemini-2.0-flash",
    protocol: "generate-content",
    capabilities: [...TEXT_STRUCTURED],
    keyHintZh: "在 aistudio.google.com 创建 API Key。",
    editableBaseUrl: true,
    allowResponses: false,
  },
  {
    id: "deepseek",
    nameZh: "DeepSeek（深度求索）",
    type: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModelId: "deepseek-chat",
    protocol: "chat-completions",
    capabilities: [...TEXT_STRUCTURED, "streaming"],
    keyHintZh: "在 platform.deepseek.com 创建 API Key。",
    editableBaseUrl: true,
    allowResponses: false,
  },
  {
    id: "groq",
    nameZh: "Groq",
    type: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModelId: "llama-3.3-70b-versatile",
    protocol: "chat-completions",
    capabilities: [...TEXT_STRUCTURED, "streaming"],
    keyHintZh: "在 console.groq.com 创建 API Key。",
    editableBaseUrl: true,
    allowResponses: false,
  },
  {
    id: "openrouter",
    nameZh: "OpenRouter",
    type: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModelId: "anthropic/claude-3.5-sonnet",
    protocol: "chat-completions",
    capabilities: [...TEXT_STRUCTURED, "streaming"],
    keyHintZh: "在 openrouter.ai 创建 API Key（可访问多家模型）。",
    editableBaseUrl: true,
    allowResponses: false,
  },
  // Legacy presets kept for backward compatibility.
  {
    id: "qwen",
    nameZh: "通义千问（DashScope 兼容模式）",
    type: "openai-compatible",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModelId: "qwen-plus",
    protocol: "chat-completions",
    capabilities: [...TEXT_STRUCTURED, "streaming"],
    keyHintZh: "在阿里云 DashScope 开通并创建 API Key。",
    editableBaseUrl: true,
    allowResponses: false,
  },
  {
    id: "doubao",
    nameZh: "豆包（火山方舟）",
    type: "openai-compatible",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    defaultModelId: "doubao-pro-32k",
    protocol: "chat-completions",
    capabilities: [...TEXT_STRUCTURED, "streaming"],
    keyHintZh: "在火山方舟创建推理接入点，使用接入点 ID 作为模型名。",
    editableBaseUrl: true,
    allowResponses: false,
  },
  {
    id: "custom",
    nameZh: "自定义（OpenAI 兼容）",
    type: "custom",
    baseUrl: "",
    defaultModelId: "",
    protocol: "chat-completions",
    capabilities: [...TEXT_STRUCTURED, "streaming"],
    keyHintZh: "输入任何 OpenAI 兼容服务的 Base URL（API 根地址，例如 https://example.com/v1）、模型名与 Key。",
    editableBaseUrl: true,
    allowResponses: true,
  },
];

export function findProviderDefinition(id: string): ProviderDefinition | null {
  return PROVIDER_REGISTRY.find((d) => d.id === id) ?? null;
}

export interface BuildAdapterInput {
  definition: ProviderDefinition;
  modelId: string;
  apiKey: string;
  /** Overrides the definition's base URL when provided (custom gateways). */
  baseUrl?: string;
  /** Overrides protocol when the provider allows it (honest capability gate). */
  protocol?: ProviderProtocol;
  customHeaders?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

/**
 * Build the concrete adapter for a definition + runtime config.
 * Validates the protocol request against the definition's allowResponses gate
 * and known adapter types; throws on an unsupported/forged combination rather
 * than silently doing the wrong transport.
 */
export function buildAdapter(input: BuildAdapterInput): IAiProvider {
  const def = input.definition;
  const modelId = input.modelId || def.defaultModelId;
  const baseUrl = (input.baseUrl ?? def.baseUrl).trim().replace(/\/+$/, "");
  const apiKey = input.apiKey.trim();
  const headers = input.customHeaders;

  const protocol = input.protocol ?? def.protocol;
  if (protocol === "responses" && !def.allowResponses) {
    throw new AiAdapterError(
      `「${def.nameZh}」不支持 Responses 协议，将使用 ${def.protocol}。`,
    );
  }

  switch (def.type) {
    case "anthropic":
      return new AnthropicProvider({
        providerId: def.id,
        modelId,
        baseUrl: baseUrl || "https://api.anthropic.com",
        apiKey,
        customHeaders: headers,
        fetchImpl: input.fetchImpl,
      });
    case "gemini":
      return new GeminiProvider({
        providerId: def.id,
        modelId,
        baseUrl: baseUrl || "https://generativelanguage.googleapis.com",
        apiKey,
        customHeaders: headers,
        fetchImpl: input.fetchImpl,
      });
    case "custom":
    case "openai-compatible": {
      if (protocol === "responses") {
        return new ResponsesProvider({
          providerId: def.id,
          modelId,
          baseUrl: baseUrl || "https://api.openai.com/v1",
          apiKey,
          customHeaders: headers,
          fetchImpl: input.fetchImpl,
        });
      }
      return new OpenAiCompatibleProvider({
        providerId: def.id,
        modelId,
        baseUrl: baseUrl || "https://api.openai.com/v1",
        apiKey,
        customHeaders: headers,
        fetchImpl: input.fetchImpl,
      });
    }
    default:
      throw new AiAdapterError(`Unknown provider type: ${String((def as { type?: unknown }).type)}`);
  }
}

export function hasCapability(def: ProviderDefinition, cap: Capability): boolean {
  return def.capabilities.includes(cap);
}

/** Human message for a capability the active provider lacks. */
export function capabilityUnavailableZh(def: ProviderDefinition | null, cap: Capability): string {
  const name = def?.nameZh ?? "当前 Provider";
  return `当前 Provider（${name}）不支持「${cap}」功能，已回退到可用模式。`;
}
