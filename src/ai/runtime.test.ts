import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activateAi,
  clearAiPreference,
  deactivateAi,
  getActiveAiProvider,
  getAiStatus,
  isAiReady,
  loadAiPreference,
  saveAiPreference,
  testAiConnection,
} from "@/ai/runtime";
import { AiProviderError } from "@/ai/openai-compatible";

beforeEach(() => {
  deactivateAi();
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AI runtime session (API key security)", () => {
  it("starts unconfigured with no provider", () => {
    expect(getAiStatus().state).toBe("unconfigured");
    expect(getActiveAiProvider()).toBeNull();
    expect(isAiReady()).toBe(false);
  });

  it("rejects an empty key without retaining anything", () => {
    const status = activateAi({ providerId: "openai", apiKey: "   " });
    expect(status.state).toBe("error");
    expect(getActiveAiProvider()).toBeNull();
    // No preference should be persisted on failure.
    expect(loadAiPreference()).toBeNull();
  });

  it("holds the provider in memory and reports ready", () => {
    const status = activateAi({ providerId: "deepseek", apiKey: "sk-secret-123" });
    expect(status.state).toBe("ready");
    expect(status.providerId).toBe("deepseek");
    expect(isAiReady()).toBe(true);
    const provider = getActiveAiProvider();
    expect(provider?.providerId).toBe("deepseek");
  });

  it("NEVER persists the key: localStorage holds only non-secret prefs", () => {
    activateAi({ providerId: "openai", apiKey: "sk-super-secret-value", modelId: "gpt-x" });
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)!;
      const value = window.localStorage.getItem(key) ?? "";
      expect(value).not.toContain("sk-super-secret-value");
      expect(key).not.toMatch(/key/i);
    }
    const pref = loadAiPreference();
    expect(pref).toEqual({ providerId: "openai", modelId: "gpt-x" });
  });

  it("clears everything on deactivate (session memory semantics)", () => {
    activateAi({ providerId: "qwen", apiKey: "k-123" });
    deactivateAi();
    expect(getActiveAiProvider()).toBeNull();
    expect(getAiStatus().state).toBe("unconfigured");
    expect(loadAiPreference()).toBeNull();
  });

  it("saveAiPreference stores only provider/model fields", () => {
    saveAiPreference({ providerId: "doubao" });
    const raw = window.localStorage.getItem("english360.ai.pref") ?? "";
    expect(raw).toContain("doubao");
    expect(JSON.parse(raw)).toEqual({ providerId: "doubao", modelId: undefined });
    clearAiPreference();
    expect(loadAiPreference()).toBeNull();
  });

  it("testAiConnection() reports success honestly on a real round-trip", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "OK" }, finish_reason: "stop" }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    activateAi({ providerId: "openai", apiKey: "k" });
    const result = await testAiConnection();
    expect(result.ok).toBe(true);
    expect(result.messageZh).toContain("连接成功");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/chat/completions");
    expect((init.headers as Record<string, string>)["authorization"]).toBe("Bearer k");
  });

  it("testAiConnection() surfaces endpoint errors without leaking the key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new AiProviderError("401 unauthorized", 401)),
    );
    activateAi({ providerId: "openai", apiKey: "sk-leak-check" });
    const result = await testAiConnection();
    expect(result.ok).toBe(false);
    expect(result.messageZh).toContain("连接失败");
    expect(result.messageZh).not.toContain("sk-leak-check");
  });

  it("testAiConnection() fails cleanly when nothing is configured", async () => {
    const result = await testAiConnection();
    expect(result).toEqual({ ok: false, messageZh: expect.stringContaining("尚未配置") });
  });
});
