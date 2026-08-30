/**
 * Provider presets & factory (Phase 4-A).
 *
 * Four OpenAI-compatible vendors are pre-wired as PRESETS ONLY:
 * OpenAI, DeepSeek, Qwen (DashScope compatible-mode), Doubao (Ark).
 * No vendor is bound into the app: the user picks one, supplies their own
 * runtime key, and the factory builds an isolated provider instance.
 *
 * SECURITY: presets contain public endpoint URLs and default model ids only.
 * Keys are NEVER stored here (or anywhere in the local database).
 */
import type { IAiProvider } from "@/ai/provider";
import { OpenAiCompatibleProvider } from "@/ai/openai-compatible";

export interface ProviderPreset {
  providerId: string;
  nameZh: string;
  baseUrl: string;
  defaultModelId: string;
  /** Hint shown in future settings UI (Phase 4-B). */
  keyHintZh: string;
}

export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    providerId: "openai",
    nameZh: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModelId: "gpt-4o-mini",
    keyHintZh: "在 platform.openai.com 创建 API Key。",
  },
  {
    providerId: "deepseek",
    nameZh: "DeepSeek（深度求索）",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModelId: "deepseek-chat",
    keyHintZh: "在 platform.deepseek.com 创建 API Key。",
  },
  {
    providerId: "qwen",
    nameZh: "通义千问（DashScope 兼容模式）",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModelId: "qwen-plus",
    keyHintZh: "在阿里云 DashScope 开通并创建 API Key。",
  },
  {
    providerId: "doubao",
    nameZh: "豆包（火山方舟）",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    defaultModelId: "doubao-pro-32k",
    keyHintZh: "在火山方舟创建推理接入点，使用接入点 ID 作为模型名。",
  },
];

export function findPreset(providerId: string): ProviderPreset | null {
  return PROVIDER_PRESETS.find((p) => p.providerId === providerId) ?? null;
}

/** Runtime configuration supplied by the caller each session. */
export interface AiRuntimeConfig {
  providerId: string;
  /** Overrides the preset's default model when provided. */
  modelId?: string;
  /** Runtime-supplied key; held by the caller, never persisted by this app. */
  apiKey: string;
}

export function createProvider(
  config: AiRuntimeConfig,
  fetchImpl?: typeof fetch,
): IAiProvider {
  const preset = findPreset(config.providerId);
  if (!preset) {
    throw new Error(`Unknown AI provider id: ${config.providerId}`);
  }
  return new OpenAiCompatibleProvider({
    providerId: preset.providerId,
    modelId: config.modelId ?? preset.defaultModelId,
    baseUrl: preset.baseUrl,
    apiKey: config.apiKey,
    fetchImpl,
  });
}
