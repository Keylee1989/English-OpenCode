import { describe, expect, it, vi } from "vitest";
import {
  PROVIDER_REGISTRY,
  buildAdapter,
  findProviderDefinition,
  hasCapability,
  capabilityUnavailableZh,
} from "@/ai/registry/provider-registry";
import { createProvider, PROVIDER_PRESETS } from "@/ai/providers";
import { OpenAiCompatibleProvider } from "@/ai/openai-compatible";
import { AnthropicProvider } from "@/ai/adapters/anthropic-adapter";
import { GeminiProvider } from "@/ai/adapters/gemini-adapter";
import { ResponsesProvider } from "@/ai/adapters/responses-adapter";

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Provider Registry", () => {
  it("registers the required official providers", () => {
    const ids = PROVIDER_REGISTRY.map((d) => d.id);
    for (const id of ["openai", "anthropic", "gemini", "deepseek", "groq", "openrouter", "custom"]) {
      expect(ids).toContain(id);
    }
    expect(ids).toContain("qwen");
    expect(ids).toContain("doubao"); // legacy presets preserved
  });

  it("declares capabilities honestly (no silent assumption)", () => {
    for (const def of PROVIDER_REGISTRY) {
      expect(def.capabilities).toContain("chat");
      expect(def.capabilities).toContain("structuredOutput"); // app uses text-JSON + parse
    }
    const gemini = findProviderDefinition("gemini")!;
    expect(hasCapability(gemini, "streaming")).toBe(false); // non-stream only
    expect(hasCapability(findProviderDefinition("openai")!, "streaming")).toBe(true);
  });

  it("throws on an unknown provider id", () => {
    expect(() => createProvider({ providerId: "nope", apiKey: "x" })).toThrow(/Unknown AI provider/);
  });

  it("refuses a forged Responses protocol on a provider that does not allow it", () => {
    const def = findProviderDefinition("deepseek")!;
    expect(() =>
      buildAdapter({ definition: def, modelId: "deepseek-chat", apiKey: "k", protocol: "responses" }),
    ).toThrow(/不支持 Responses 协议/);
  });

  it("lets custom OpenAI-compatible select the Responses protocol", () => {
    const def = findProviderDefinition("custom")!;
    const provider = buildAdapter({
      definition: def,
      modelId: "m",
      apiKey: "k",
      baseUrl: "https://example.com/v1",
      protocol: "responses",
    });
    expect(provider).toBeInstanceOf(ResponsesProvider);
  });

  it("surfaces a human message for missing capability", () => {
    const msg = capabilityUnavailableZh(findProviderDefinition("gemini"), "streaming");
    expect(msg).toContain("不支持");
  });
});

describe("adapter selection", () => {
  it("routes chat-completions to OpenAI-compatible adapter", () => {
    const provider = createProvider({ providerId: "openai", apiKey: "k" });
    expect(provider).toBeInstanceOf(OpenAiCompatibleProvider);
  });

  it("routes anthropic to the Messages adapter", () => {
    const provider = createProvider({ providerId: "anthropic", apiKey: "k" });
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it("routes gemini to the Gemini adapter", () => {
    const provider = createProvider({ providerId: "gemini", apiKey: "k" });
    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  it("supports custom base URL for any editable provider", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json({ choices: [{ message: { content: "hi" } }] }),
    );
    const provider = new OpenAiCompatibleProvider({
      providerId: "custom",
      modelId: "xxx-model",
      baseUrl: "https://example.com/v1",
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await provider.complete({ messages: [{ role: "user", content: "hi" }] });
    expect(out.text).toBe("hi");
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.com/v1/chat/completions");
    expect(JSON.parse(String(init.body)).model).toBe("xxx-model");
  });
});

describe("Anthropic adapter", () => {
  const base = {
    providerId: "anthropic",
    modelId: "claude-x",
    baseUrl: "https://api.anthropic.com",
    apiKey: "ak-secret",
  };

  it("posts /v1/messages and maps the reply", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json({ content: [{ type: "text", text: "hello claude" }], stop_reason: "end_turn" }),
    );
    const provider = new AnthropicProvider({ ...base, fetchImpl: fetchImpl as unknown as typeof fetch });
    const out = await provider.complete({
      messages: [
        { role: "system", content: "You are a tutor." },
        { role: "user", content: "Hi" },
      ],
      maxTokens: 200,
    });
    expect(out.text).toBe("hello claude");
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("ak-secret");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(String(init.body));
    expect(body.system).toBe("You are a tutor.");
    expect(body.messages).toEqual([{ role: "user", content: "Hi" }]);
    expect(body.max_tokens).toBe(200);
  });

  it("reports endpoint errors with status (no key leak)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "authentication_error" } }), { status: 401 }),
    );
    const provider = new AnthropicProvider({ ...base, fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(provider.complete({ messages: [{ role: "user", content: "x" }] })).rejects.toMatchObject({
      name: "AiAdapterError",
      status: 401,
    });
  });

  it("maps max_tokens stop reason to length honestly", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json({ content: [{ type: "text", text: "partial" }], stop_reason: "max_tokens" }),
    );
    const provider = new AnthropicProvider({ ...base, fetchImpl: fetchImpl as unknown as typeof fetch });
    const out = await provider.complete({ messages: [{ role: "user", content: "x" }] });
    expect(out.finishReason).toBe("length");
  });

  it("wraps network/CORS TypeError honestly", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const provider = new AnthropicProvider({ ...base, fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(provider.complete({ messages: [{ role: "user", content: "x" }] })).rejects.toThrow(
      /CORS|无法连接/,
    );
  });
});

describe("Gemini adapter", () => {
  it("posts generateContent with key param and maps the reply", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json({ candidates: [{ content: { parts: [{ text: "gemini says hi" }] } }] }),
    );
    const provider = new GeminiProvider({
      providerId: "gemini",
      modelId: "gemini-2.0-flash",
      baseUrl: "https://generativelanguage.googleapis.com",
      apiKey: "gk-secret",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await provider.complete({ messages: [{ role: "user", content: "Hi" }] });
    expect(out.text).toBe("gemini says hi");
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/models/gemini-2.0-flash:generateContent?key=gk-secret",
    );
    const body = JSON.parse(String(init.body));
    expect(body.contents).toBeDefined();
  });

  it("surface endpoint errors with status and never a malformed 200", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("oops", { status: 500 }));
    const provider = new GeminiProvider({
      providerId: "gemini",
      modelId: "m",
      baseUrl: "https://x",
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(provider.complete({ messages: [{ role: "user", content: "x" }] })).rejects.toMatchObject({
      status: 500,
    });
    const malformed = new GeminiProvider({
      providerId: "gemini",
      modelId: "m",
      baseUrl: "https://x",
      apiKey: "k",
      fetchImpl: vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })) as unknown as typeof fetch,
    });
    await expect(malformed.complete({ messages: [] })).rejects.toThrow(/malformed JSON/);
  });
});

describe("Responses adapter", () => {
  it("posts /responses and maps output_text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json({ output_text: "responses says hi" }),
    );
    const provider = new ResponsesProvider({
      providerId: "custom",
      modelId: "m",
      baseUrl: "https://example.com/v1",
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await provider.complete({ messages: [{ role: "user", content: "Hi" }] });
    expect(out.text).toBe("responses says hi");
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.com/v1/responses");
    expect(JSON.parse(String(init.body)).model).toBe("m");
  });

  it("falls back to output array extraction when output_text is absent", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json({
        output: [
          { type: "message", content: [{ type: "output_text", text: "hello from array" }] },
        ],
      }),
    );
    const provider = new ResponsesProvider({
      providerId: "custom",
      modelId: "m",
      baseUrl: "https://example.com/v1",
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await provider.complete({ messages: [{ role: "user", content: "Hi" }] });
    expect(out.text).toBe("hello from array");
  });

  it("honestly surfaces HTTP 404 for wrong base/endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "not found" } }), { status: 404 }),
    );
    const provider = new ResponsesProvider({
      providerId: "custom",
      modelId: "m",
      baseUrl: "https://example.com/v1",
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(provider.complete({ messages: [] })).rejects.toMatchObject({ status: 404 });
  });
});

describe("API key isolation (adapter layer)", () => {
  it("never includes the key in error messages", async () => {
    const secret = "sk-top-secret-do-not-leak";
    const providers = [
      new OpenAiCompatibleProvider({
        providerId: "openai",
        modelId: "m",
        baseUrl: "https://x/v1",
        apiKey: secret,
        fetchImpl: vi.fn().mockRejectedValue(new Error("network broke")) as unknown as typeof fetch,
      }),
      new AnthropicProvider({
        providerId: "anthropic",
        modelId: "m",
        baseUrl: "https://x",
        apiKey: secret,
        fetchImpl: vi.fn().mockRejectedValue(new TypeError("failed")) as unknown as typeof fetch,
      }),
      new GeminiProvider({
        providerId: "gemini",
        modelId: "m",
        baseUrl: "https://x",
        apiKey: secret,
        fetchImpl: vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch,
      }),
      new ResponsesProvider({
        providerId: "custom",
        modelId: "m",
        baseUrl: "https://x/v1",
        apiKey: secret,
        fetchImpl: vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "rejected" } }), { status: 400 })) as unknown as typeof fetch,
      }),
    ];
    for (const p of providers) {
      let message = "";
      try {
        await p.complete({ messages: [{ role: "user", content: "x" }] });
      } catch (err) {
        message = err instanceof Error ? err.message : String(err);
      }
      expect(message).not.toContain(secret);
      expect(message).not.toContain(secret.slice(0, 8));
    }
  });

  it("custom headers merge without touching the key header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json({ choices: [{ message: { content: "ok" } }] }),
    );
    const provider = new OpenAiCompatibleProvider({
      providerId: "custom",
      modelId: "m",
      baseUrl: "https://example.com/v1",
      apiKey: "sk-k",
      customHeaders: { "X-Gateway": "cf" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await provider.complete({ messages: [] });
    const headers = fetchImpl.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["X-Gateway"]).toBe("cf");
    expect(headers["authorization"]).toBe("Bearer sk-k");
  });
});

describe("preset collection", () => {
  it("keeps the official preset list for legacy callers (all with URLs)", () => {
    for (const preset of PROVIDER_PRESETS) {
      expect(preset.baseUrl).toMatch(/^https:\/\//);
      expect(preset.defaultModelId.length).toBeGreaterThan(0);
    }
  });
});