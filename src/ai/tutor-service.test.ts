import { describe, expect, it, vi } from "vitest";
import type { AiChatMessage, IAiProvider } from "@/ai/provider";
import {
  chat,
  generateExplanation,
  generateExercise,
  evaluateWriting,
  parseGeneratedExercise,
  parseWritingEvaluation,
} from "@/ai/tutor-service";

function providerReturning(text: string): { provider: IAiProvider; spy: ReturnType<typeof vi.fn> } {
  const spy = vi.fn().mockResolvedValue({ text, finishReason: "stop" });
  const provider: IAiProvider = {
    providerId: "fake",
    modelId: "fake-model",
    complete: spy as unknown as IAiProvider["complete"],
  };
  return { provider, spy };
}

describe("tutor-service", () => {
  it("chat() wraps complete() and returns an assistant message", async () => {
    const { provider, spy } = providerReturning("hi there");
    const reply = await chat(provider, [{ role: "user", content: "hello" }]);
    expect(reply).toEqual({ role: "assistant", content: "hi there" });
    const req = spy.mock.calls[0][0];
    expect(req.messages[0].content).toBe("hello");
  });

  it("generateExplanation() builds zh-tutor prompt including context", async () => {
    const { provider, spy } = providerReturning("解释：...");
    const out = await generateExplanation(provider, "什么是现在完成时？", {
      contextBlock: "[student-context] day=45 scaffold=chinese-dominant",
      scaffoldLevel: "chinese-dominant",
    });
    expect(out.answerZh).toBe("解释：...");
    const req = spy.mock.calls[0][0];
    const systemMsg = req.messages.find((m: AiChatMessage) => m.role === "system")!;
    expect(systemMsg.content).toContain("AI 英语导师");
    expect(systemMsg.content).toContain("student-context");
    expect(systemMsg.content).toContain("简体中文");
  });

  it("generateExplanation() adapts scaffold level instructions", async () => {
    const { provider, spy } = providerReturning("ok");
    await generateExplanation(provider, "q", { scaffoldLevel: "english-first" });
    const systemMsg = spy.mock.calls[0][0].messages[0].content;
    expect(systemMsg).toContain("mainly in English");
  });

  it("generateExercise() returns validated draft on good JSON", async () => {
    const payload = JSON.stringify({
      type: "mcq-meaning",
      skill: "vocabulary",
      en: "Which word means 购物车?",
      zh: "选择正确释义",
      choices: ["cart", "cash", "card"],
      answer: "cart",
    });
    const { provider, spy } = providerReturning(payload);
    const out = await generateExercise(provider, { skill: "vocabulary", day: 33 });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.exercise.answer).toBe("cart");
    const req = spy.mock.calls[0][0];
    expect(req.messages[0].content).toContain("STRICT JSON");
    expect(req.messages[0].content).toContain("第 33 天");
  });

  it("generateExercise() reports honest failure on invalid JSON", async () => {
    const { provider } = providerReturning("这不是 JSON");
    const out = await generateExercise(provider, { skill: "grammar", day: 1 });
    expect(out).toEqual({ ok: false, reasonZh: expect.stringContaining("格式无效") });
  });

  it("parseGeneratedExercise() strips markdown fences and rejects bad shapes", () => {
    const fenced = '```json\n{"skill":"writing","en":"a","zh":"b"}\n```';
    expect(parseGeneratedExercise(fenced)).toMatchObject({ skill: "writing" });
    const noChoices = parseGeneratedExercise('{"skill":"grammar","en":"x","zh":"y","choices":["only"]}');
    expect(noChoices).toBeNull();
    const badAnswer = parseGeneratedExercise(
      '{"skill":"vocabulary","en":"x","zh":"y","choices":["a","b","c"],"answer":"zz"}',
    );
    expect(badAnswer).toBeNull();
  });

  it("evaluateWriting() parses scores/corrections/feedback", async () => {
    const payload = JSON.stringify({
      score: 72,
      corrections: [{ wrong: "I are", right: "I am", noteZh: "主谓一致" }],
      feedbackZh: "结构清晰，注意主谓一致。",
    });
    const { provider, spy } = providerReturning(payload);
    const out = await evaluateWriting(provider, {
      promptEn: "Describe your weekend.",
      submission: "I are happy last weekend.",
      contextBlock: "abilities(low->high): listening:40",
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.evaluation.score).toBe(72);
      expect(out.evaluation.corrections[0].right).toBe("I am");
    }
    const req = spy.mock.calls[0][0];
    expect(req.messages[0].content).toContain("写作评估器");
    expect((req.messages[1].content as string)).toContain("I are happy");
  });

  it("evaluateWriting() rejects invalid scores and non-JSON honestly", async () => {
    expect(parseWritingEvaluation('{"score":150,"feedbackZh":"x"}')).toBeNull();
    expect(parseWritingEvaluation("oops")).toBeNull();

    const { provider } = providerReturning("internal error text");
    const out = await evaluateWriting(provider, { promptEn: "p", submission: "s" });
    expect(out.ok).toBe(false);
  });
});
