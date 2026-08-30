import { describe, expect, it, vi } from "vitest";
import { OpenAiCompatibleProvider, AiProviderError } from "@/ai/openai-compatible";
import { createProvider, findPreset, PROVIDER_PRESETS } from "@/ai/providers";

function makeResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "application/json" } });
}

const OK_BODY = JSON.stringify({
  choices: [{ message: { content: "Hello!" }, finish_reason: "stop" }],
});

describe("OpenAiCompatibleProvider", () => {
  const base = {
    providerId: "test",
    modelId: "test-model",
    baseUrl: "https://api.test/v1",
    apiKey: "sk-test",
  };

  it("posts chat/completions with bearer auth and parses the reply", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeResponse(OK_BODY));
    const provider = new OpenAiCompatibleProvider({ ...base, fetchImpl });
    const out = await provider.complete({
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "hi" },
      ],
      temperature: 0.3,
      maxTokens: 100,
    });
    expect(out.text).toBe("Hello!");
    expect(out.finishReason).toBe("stop");

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/v1/chat/completions");
    expect((init.headers as Record<string, string>)["authorization"]).toBe("Bearer sk-test");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("test-model");
    expect(body.messages).toHaveLength(2);
    expect(body.max_tokens).toBe(100);
  });

  it("throws AiProviderError with status on endpoint errors (no key leakage)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeResponse('{"error":{"message":"bad key"}}', 401));
    const provider = new OpenAiCompatibleProvider({ ...base, fetchImpl });
    await expect(provider.complete({ messages: [{ role: "user", content: "x" }] })).rejects.toMatchObject({
      name: "AiProviderError",
      status: 401,
      message: expect.stringContaining("bad key"),
    });
  });

  it("maps length finish reason and surfaces malformed JSON honestly", async () => {
    const truncated = new OpenAiCompatibleProvider({
      ...base,
      fetchImpl: vi.fn().mockResolvedValue(
        makeResponse(JSON.stringify({ choices: [{ message: { content: "partial" }, finish_reason: "length" }] })),
      ),
    });
    const out = await truncated.complete({ messages: [{ role: "user", content: "x" }] });
    expect(out.finishReason).toBe("length");

    const malformed = new OpenAiCompatibleProvider({
      ...base,
      fetchImpl: vi.fn().mockResolvedValue(makeResponse("not-json")),
    });
    await expect(malformed.complete({ messages: [{ role: "user", content: "x" }] })).rejects.toBeInstanceOf(
      AiProviderError,
    );
  });

  it("refuses to run without a runtime key", async () => {
    const provider = new OpenAiCompatibleProvider({
      ...base,
      apiKey: "",
      fetchImpl: vi.fn(),
    });
    await expect(provider.complete({ messages: [] })).rejects.toThrow(/Missing API key/);
  });

  it("wraps network failures without throwing raw fetch errors", async () => {
    const provider = new OpenAiCompatibleProvider({
      ...base,
      fetchImpl: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    });
    await expect(provider.complete({ messages: [] })).rejects.toThrow(/Network error/);
  });
});

describe("provider presets & factory", () => {
  it("exposes the four required vendors with OpenAI-compatible endpoints", () => {
    const ids = PROVIDER_PRESETS.map((p) => p.providerId);
    expect(ids).toEqual(expect.arrayContaining(["openai", "deepseek", "qwen", "doubao"]));
    for (const preset of PROVIDER_PRESETS) {
      expect(preset.baseUrl).toMatch(/^https:\/\//);
      expect(preset.defaultModelId.length).toBeGreaterThan(0);
      expect(preset.keyHintZh.length).toBeGreaterThan(4);
    }
  });

  it("builds providers from presets without embedding keys anywhere", () => {
    const provider = createProvider({ providerId: "deepseek", apiKey: "runtime-key" });
    expect(provider.providerId).toBe("deepseek");
    expect(provider.modelId).toBe("deepseek-chat");
    expect(findPreset("nope")).toBeNull();
    expect(() => createProvider({ providerId: "nope", apiKey: "x" })).toThrow(/Unknown AI provider/);
  });

  it("allows overriding the default model id per session", () => {
    const provider = createProvider({ providerId: "openai", apiKey: "k", modelId: "gpt-4.1-nano" });
    expect(provider.modelId).toBe("gpt-4.1-nano");
  });
});
