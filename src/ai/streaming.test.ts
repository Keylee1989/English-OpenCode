import { describe, expect, it, vi } from "vitest";
import { OpenAiCompatibleProvider, isStreamingProvider } from "@/ai/openai-compatible";
import { streamExplanation } from "@/ai/tutor-service";

/** Build an SSE Response from chunk strings (as real endpoints send). */
function sseResponse(events: string[]): Response {
  const body = events
    .map((e) => `data: ${e}\n\n`)
    .join("");
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function makeProvider(events: string[]) {
  const fetchImpl = vi.fn().mockResolvedValue(sseResponse(events));
  const provider = new OpenAiCompatibleProvider({
    providerId: "deepseek",
    modelId: "deepseek-chat",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-test",
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { provider, fetchImpl };
}

describe("streaming provider (SSE)", () => {
  it("yields deltas in order and finishes with stop", async () => {
    const { provider } = makeProvider([
      JSON.stringify({ choices: [{ delta: { content: "Hello" } }] }),
      JSON.stringify({ choices: [{ delta: { content: " world" } }] }),
      JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] }),
      "[DONE]",
    ]);
    expect(isStreamingProvider(provider)).toBe(true);

    const deltas: string[] = [];
    let final = "";
    for await (const part of provider.completeStream({
      messages: [{ role: "user", content: "hi" }],
    })) {
      if (!part.done && part.delta) deltas.push(part.delta);
      if (part.done) final = part.finishReason ?? "";
    }
    expect(deltas).toEqual(["Hello", " world"]);
    expect(final).toBe("stop");
  });

  it("sends stream:true and bearer auth to the endpoint", async () => {
    const { provider, fetchImpl } = makeProvider(["[DONE]"]);
    for await (const part of provider.completeStream({
      messages: [{ role: "user", content: "x" }],
    })) {
      void part;
      break;
    }
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/v1/chat/completions");
    expect(JSON.parse(String(init.body)).stream).toBe(true);
    expect((init.headers as Record<string, string>)["authorization"]).toBe("Bearer sk-test");
  });

  it("surfaces endpoint errors with status (no fake output)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('{"error":{"message":"invalid key"}}', { status: 401 }),
    );
    const provider = new OpenAiCompatibleProvider({
      providerId: "openai",
      modelId: "m",
      baseUrl: "https://x/v1",
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(async () => {
      for await (const part of provider.completeStream({ messages: [] })) void part;
    }).rejects.toMatchObject({ status: 401, message: expect.stringContaining("invalid key") });
  });
});

describe("streamExplanation", () => {
  it("streams via provider when supported and returns full text", async () => {
    const events = [
      JSON.stringify({ choices: [{ delta: { content: "中文解释" } }] }),
      JSON.stringify({ choices: [{ delta: { content: "完成" } }] }),
      "[DONE]",
    ];
    const { provider } = makeProvider(events);
    const seen: string[] = [];
    let full = "";
    for await (const part of streamExplanation(provider, "讲讲虚拟语气", {
      scaffoldLevel: "chinese-dominant",
      onDelta: (d) => seen.push(d),
    })) {
      if ("full" in part) full = part.full;
    }
    expect(seen.join("")).toBe("中文解释完成");
    expect(full).toBe("中文解释完成");
  });

  it("falls back to complete() when provider cannot stream", async () => {
    const provider = {
      providerId: "fake",
      modelId: "fake",
      complete: vi.fn().mockResolvedValue({ text: "整体回答", finishReason: "stop" }),
    } as unknown as Parameters<typeof streamExplanation>[0];
    const parts: string[] = [];
    for await (const piece of streamExplanation(provider, "q")) {
      if ("delta" in piece) parts.push(piece.delta);
    }
    expect(parts).toEqual(["整体回答"]);
  });
});
