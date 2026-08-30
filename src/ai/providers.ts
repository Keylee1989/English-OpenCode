/**
 * Provider presets & factory (Phase 4-A, extended for multi-provider/custom).
 *
 * A thin, backward-compatible façade over `PROVIDER_REGISTRY`. Keeps the old
 * `ProviderPreset` shape that existing callers/tests use, while the real
 * construction is now routed through the registry adapter factory so every
 * provider (OpenAI, Anthropic, Gemini, DeepSeek, Groq, OpenRouter, custom
 * OpenAI-compatible, ...) is built from one place.
 *
 * SECURITY: presets contain public endpoint URLs and default model ids only.
 * Keys are NEVER stored here (or anywhere in the local database); they are
 * supplied at runtime and held in memory.
 */
import type { IAiProvider } from "@/ai/provider";
import {
  PROVIDER_REGISTRY,
  buildAdapter,
  findProviderDefinition,
} from "@/ai/registry/provider-registry";
import type { ProviderProtocol } from "@/ai/registry/provider-registry";

export interface ProviderPreset {
  providerId: string;
  nameZh: string;
  baseUrl: string;
  defaultModelId: string;
  keyHintZh: string;
}

/**
 * Legacy preset list used by existing callers/tests and as the "official
 * providers" section. Excludes the bare "custom" entry (which has no default
 * base URL - the user supplies one at runtime).
 */
export const PROVIDER_PRESETS: readonly ProviderPreset[] = PROVIDER_REGISTRY.filter(
  (d) => d.id !== "custom",
).map(
  (d) => ({
    providerId: d.id,
    nameZh: d.nameZh,
    baseUrl: d.baseUrl,
    defaultModelId: d.defaultModelId,
    keyHintZh: d.keyHintZh,
  }),
);

export function findPreset(providerId: string): ProviderPreset | null {
  return PROVIDER_PRESETS.find((p) => p.providerId === providerId) ?? null;
}

export interface AiRuntimeConfig {
  providerId: string;
  /** Overrides the preset's default model when provided. */
  modelId?: string;
  /** Runtime-supplied key; held by the caller, never persisted by this app. */
  apiKey: string;
  /** Optional custom/override base URL (API root, e.g. https://example.com/v1). */
  baseUrl?: string;
  /** Optional protocol override when the provider allows it. */
  protocol?: ProviderProtocol;
  /** Optional custom headers (never the API key; that is sent separately). */
  headers?: Record<string, string>;
}

/** Build a provider for either a registry definition or a runtime config. */
export function createProvider(
  config: AiRuntimeConfig,
  fetchImpl?: typeof fetch,
): IAiProvider {
  const definition = findProviderDefinition(config.providerId);
  if (!definition) {
    throw new Error(`Unknown AI provider id: ${config.providerId}`);
  }
  return buildAdapter({
    definition,
    modelId: config.modelId ?? "",
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    protocol: config.protocol,
    customHeaders: config.headers,
    fetchImpl,
  });
}

/** Re-export the registry surface for the settings UI. */
export { PROVIDER_REGISTRY, findProviderDefinition } from "@/ai/registry/provider-registry";
export type { ProviderDefinition, ProviderType, ProviderProtocol, Capability } from "@/ai/registry/provider-registry";
