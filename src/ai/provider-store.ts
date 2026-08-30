/**
 * Saved AI provider configurations (settings layer).
 *
 * Stores NAMED provider configurations so the user can switch between custom
 * gateways / providers without re-typing Base URL + model + protocol each time.
 *
 * SECURITY: the API key is NOT part of a saved config. The user may OPT IN to
 * remembering each key in browser localStorage (runtime storage only); the
 * safe default is session-memory only (see src/ai/runtime.ts).
 */
import { findProviderDefinition } from "@/ai/providers";

export const SAVED_CONFIGS_KEY = "english360.ai.saved-configs";

export interface SavedAiConfig {
  id: string;
  nameZh: string;
  providerId: string;
  baseUrl: string;
  modelId: string;
  protocol: string;
  headers?: Record<string, string>;
  /** True when the user opted in to remembering the key in localStorage. */
  rememberKey: boolean;
}

function readAll(): SavedAiConfig[] {
  try {
    const raw = window.localStorage.getItem(SAVED_CONFIGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedAiConfig[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(configs: SavedAiConfig[]): void {
  try {
    window.localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(configs));
  } catch {
    // ignore (storage unavailable)
  }
}

export function listSavedConfigs(): SavedAiConfig[] {
  return readAll().filter((c) => findProviderDefinition(c.providerId) !== null);
}

export function getSavedConfig(id: string): SavedAiConfig | null {
  return readAll().find((c) => c.id === id) ?? null;
}

export function saveConfig(config: SavedAiConfig): void {
  // Defensive: a saved config must NEVER carry a key field, even if a future
  // caller accidentally adds one. Keys live only in session memory / the
  // opt-in key store (src/ai/runtime.ts).
  const clean: SavedAiConfig = {
    id: config.id,
    nameZh: config.nameZh,
    providerId: config.providerId,
    baseUrl: config.baseUrl,
    modelId: config.modelId,
    protocol: config.protocol,
    ...(config.headers ? { headers: config.headers } : {}),
    rememberKey: config.rememberKey,
  };
  const all = readAll();
  const idx = all.findIndex((c) => c.id === clean.id);
  if (idx >= 0) all[idx] = clean;
  else all.push(clean);
  writeAll(all);
}

export function deleteConfig(id: string): void {
  const all = readAll().filter((c) => c.id !== id);
  writeAll(all);
}

export function newConfigId(): string {
  return `cfg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}