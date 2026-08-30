import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SAVED_CONFIGS_KEY,
  deleteConfig,
  getSavedConfig,
  listSavedConfigs,
  newConfigId,
  saveConfig,
  type SavedAiConfig,
} from "@/ai/provider-store";

const makeConfig = (overrides: Partial<SavedAiConfig> = {}): SavedAiConfig => ({
  id: newConfigId(),
  nameZh: "测试网关",
  providerId: "custom",
  baseUrl: "https://example.com/v1",
  modelId: "xxx-model",
  protocol: "chat-completions",
  rememberKey: false,
  ...overrides,
});

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

describe("saved provider configurations", () => {
  it("stores and lists a saved config", () => {
    const cfg = makeConfig();
    saveConfig(cfg);
    const all = listSavedConfigs();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(cfg);
    expect(getSavedConfig(cfg.id)).toEqual(cfg);
  });

  it("updates an existing config by id", () => {
    const cfg = makeConfig();
    saveConfig(cfg);
    saveConfig({ ...cfg, modelId: "other-model" });
    expect(listSavedConfigs()).toHaveLength(1);
    expect(getSavedConfig(cfg.id)?.modelId).toBe("other-model");
  });

  it("deletes a config", () => {
    const a = makeConfig();
    const b = makeConfig();
    saveConfig(a);
    saveConfig(b);
    deleteConfig(a.id);
    const all = listSavedConfigs();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(b.id);
    expect(getSavedConfig(a.id)).toBeNull();
  });

  it("never stores the API key in a saved config", () => {
    const cfg = makeConfig() as SavedAiConfig & { apiKey?: string };
    cfg.apiKey = "sk-should-never-be-here";
    saveConfig(cfg);
    const raw = window.localStorage.getItem(SAVED_CONFIGS_KEY) ?? "";
    expect(raw).not.toContain("sk-should-never-be-here");
    expect(raw).not.toContain("apiKey");
  });
});