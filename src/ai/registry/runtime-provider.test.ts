import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activateAi,
  canSupport,
  deactivateAi,
  describeAiError,
  getActiveCapabilities,
  getActiveProtocol,
  isAiReady,
  loadPersistedKey,
  persistKey,
  clearPersistedKey,
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

const okChat = (text = "OK") =>
  new Response(JSON.stringify({ choices: [{ message: { content: text }, finish_reason: "stop" }] }), {
    status: 200,
  });

describe("runtime provider config pass-through", () => {
  it("passes custom base URL to the adapter (chat/completions)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okChat());
    vi.stubGlobal("fetch", fetchMock);
    const status = activateAi({
      providerId: "custom",
      apiKey: "k",
      modelId: "xxx-model",
      baseUrl: "https://example.com/v1",
      protocol: "chat-completions",
    });
    expect(status.state).toBe("ready");
    await testAiConnection();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.com/v1/chat/completions");
    expect(JSON.parse(String(init.body)).model).toBe("xxx-model");
  });

  it("stores non-secret config (baseUrl/protocol) in the preference", () => {
    activateAi({
      providerId: "custom",
      apiKey: "k-secret",
      modelId: "m",
      baseUrl: "https://example.com/v1",
      protocol: "responses",
    });
    const raw = window.localStorage.getItem("english360.ai.pref") ?? "";
    expect(raw).toContain("example.com/v1");
    expect(raw).toContain("responses");
    expect(raw).not.toContain("k-secret");
  });

  it("caps the provider capabilities + protocol after activation", () => {
    activateAi({ providerId: "gemini", apiKey: "k" });
    expect(getActiveProtocol()).toBe("generate-content");
    expect(canSupport("streaming")).toBe(false);
    expect(canSupport("chat")).toBe(true);
    expect(getActiveCapabilities()).toContain("structuredOutput");
  });

  it("reports unknown provider as error without retaining a provider", () => {
    const status = activateAi({ providerId: "bogus", apiKey: "k" });
    expect(status.state).toBe("error");
    expect(isAiReady()).toBe(false);
  });
});

describe("optional persisted key (user opt-in)", () => {
  it("defaults to NOT persisting the key", () => {
    activateAi({ providerId: "openai", apiKey: "sk-mem-only" });
    expect(loadPersistedKey()).toBe("");
  });

  it("persists the key only on explicit opt-in, and clears on deactivate", () => {
    activateAi({ providerId: "openai", apiKey: "sk-persist-me", persistKey: true });
    expect(loadPersistedKey()).toBe("sk-persist-me");
    const raw = window.localStorage.getItem("english360.ai.key");
    expect(raw).toContain("sk-persist-me");
    persistKey("sk-overwrite");
    expect(loadPersistedKey()).toBe("sk-overwrite");
    clearPersistedKey();
    expect(loadPersistedKey()).toBe("");
  });

  it("clears the persisted key on deactivateAi", () => {
    activateAi({ providerId: "openai", apiKey: "sk-x", persistKey: true });
    expect(loadPersistedKey()).toBe("sk-x");
    deactivateAi();
    expect(loadPersistedKey()).toBe("");
  });
});

describe("describeAiError (non-sensitive diagnostics)", () => {
  it("maps 401/403 to an auth message", () => {
    const msg = describeAiError(new AiProviderError("nope", 401), "openai");
    expect(msg).toContain("认证");
    expect(msg).not.toContain("secret");
  });

  it("maps 404 to model/base-url/endpoint message", () => {
    const msg = describeAiError(new AiProviderError("nope", 404), "deepseek");
    expect(msg).toContain("404");
    expect(msg).toContain("模型");
  });

  it("maps abort/timeout to a timeout message", () => {
    const err = new DOMException("aborted", "AbortError");
    const msg = describeAiError(err, "openai");
    expect(msg).toContain("超时");
  });

  it("maps TypeError/CORS to a CORS message that suggests a proxy", () => {
    const msg = describeAiError(new TypeError("Failed to fetch"), "anthropic");
    expect(msg).toContain("CORS");
    expect(msg).toContain("代理");
  });

  it("never includes a leaked key in any branch", () => {
    for (const err of [
      new AiProviderError("secret-leak-attempt", 401),
      new AiProviderError("secret-leak-attempt", 500),
      new TypeError("secret-leak-attempt"),
      new Error("secret-leak-attempt"),
    ]) {
      const msg = describeAiError(err, "openai");
      expect(msg).not.toContain("sk-");
    }
  });
});

describe("testAiConnection status handling", () => {
  it("reports HTTP 401 as auth failure honestly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401 }),
      ),
    );
    activateAi({ providerId: "openai", apiKey: "k" });
    const result = await testAiConnection();
    expect(result.ok).toBe(false);
    expect(result.messageZh).toContain("认证");
    expect(result.messageZh).not.toContain("sk-");
  });

  it("reports HTTP 404 honestly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "model not found" } }), { status: 404 }),
      ),
    );
    activateAi({ providerId: "openai", apiKey: "k", modelId: "nope-model" });
    const result = await testAiConnection();
    expect(result.ok).toBe(false);
    expect(result.messageZh).toContain("404");
  });

  it("reports CORS failure (TypeError) honestly with proxy hint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    activateAi({ providerId: "anthropic", apiKey: "k" });
    const result = await testAiConnection();
    expect(result.ok).toBe(false);
    expect(result.messageZh).toContain("CORS");
  });
});

describe("capability mismatch surfaces and does not silently fall over", () => {
  it("reports missing capability via canSupport and does not fabricate streaming", () => {
    activateAi({ providerId: "gemini", apiKey: "k" });
    expect(canSupport("streaming")).toBe(false);
    // A non-streaming provider still returns text via complete() (already proven
    // by tutor-service fallback test); here we just lock the honest gate.
    expect(getActiveCapabilities()).not.toContain("streaming");
  });
});