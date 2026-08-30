import { describe, expect, it, vi } from "vitest";
import type { IAiProvider } from "@/ai/provider";
import {
  analyzeError,
  generateDialogue,
  parseDialogueDraft,
  parseErrorAnalysis,
} from "@/ai/tutor-service";

function providerReturning(text: string): IAiProvider {
  return {
    providerId: "fake",
    modelId: "fake",
    complete: vi.fn().mockResolvedValue({ text, finishReason: "stop" }),
  } as unknown as IAiProvider;
}

const GOOD_DIALOGUE = JSON.stringify({
  sceneZh: "在超市买水果",
  rounds: [
    { speaker: "A", en: "Excuse me, where are the apples?", zh: "请问苹果在哪里？" },
    { speaker: "B", en: "Aisle three, next to the bananas.", zh: "第三过道，香蕉旁边。" },
    { speaker: "A", en: "How much are they?", zh: "怎么卖？" },
    { speaker: "B", en: "Two dollars a pound today.", zh: "今天两美元一磅。" },
    { speaker: "A", en: "Great, I'll take two pounds.", zh: "好，我买两磅。" },
  ],
});

describe("generateDialogue (情景对话)", () => {
  it("returns a validated five-round dialogue on good JSON", async () => {
    const provider = providerReturning(GOOD_DIALOGUE);
    const outcome = await generateDialogue(provider, {
      day: 31,
      titleZh: "在超市",
      goalZh: "找到商品并询问价格",
      vocabWords: ["aisle", "coupon"],
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.dialogue.rounds).toHaveLength(5);
      // Alternation must be A/B/A/B/A.
      expect(outcome.dialogue.rounds.map((r) => r.speaker)).toEqual(["A", "B", "A", "B", "A"]);
    }
    // Prompt must carry the day theme and the strict JSON contract.
    const spy = (provider.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(spy.messages[0].content).toContain("第 31 天");
    expect(spy.messages[0].content).toContain("exactly 5 rounds");
    expect(spy.messages[1].content).toContain("在超市");
  });

  it("rejects wrong round counts and broken alternation honestly", () => {
    const parsed = JSON.parse(GOOD_DIALOGUE) as { rounds: unknown[] };
    const four = JSON.stringify({ ...parsed, rounds: parsed.rounds.slice(0, 4) });
    expect(parseDialogueDraft(four)).toBeNull();

    const swapped = JSON.stringify({
      sceneZh: "s",
      rounds: Array.from({ length: 5 }, (_, i) => ({
        speaker: i % 2 === 0 ? "B" : "A",
        en: `line ${i}`,
        zh: `第 ${i}`,
      })),
    });
    expect(parseDialogueDraft(swapped)).toBeNull();
    expect(parseDialogueDraft("not json")).toBeNull();
  });

  it("reports ok:false instead of faking output when AI misbehaves", async () => {
    const provider = providerReturning('{"sceneZh":"x","rounds":[{"speaker":"A","en":"only one"}]}');
    const outcome = await generateDialogue(provider, { day: 40, titleZh: "t", goalZh: "g" });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reasonZh).toContain("格式无效");
  });
});

const GOOD_ANALYSIS = JSON.stringify({
  reasonZh: "主语是 I，be 动词应该用 am。",
  correctEn: "I am happy.",
  practiceAdviceZh: "朗读五组 I am / you are 例句。",
});

describe("analyzeError (错题分析)", () => {
  it("returns reason/correct/practice on good JSON", async () => {
    const provider = providerReturning(GOOD_ANALYSIS);
    const outcome = await analyzeError(provider, {
      skill: "writing",
      categoryZh: "writing-mistake",
      wrongEn: "I are happy.",
      answerText: "I are happy last weekend.",
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.analysis.correctEn).toBe("I am happy.");
      expect(outcome.analysis.practiceAdviceZh.length).toBeGreaterThan(3);
    }
    const spy = (provider.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(spy.messages[0].content).toContain("STRICT JSON");
    expect(spy.messages[1].content).toContain("I are happy.");
  });

  it("rejects incomplete analyses", () => {
    expect(parseErrorAnalysis('{"reasonZh":"r","correctEn":""}')).toBeNull();
    expect(parseErrorAnalysis("{}")).toBeNull();
    expect(parseErrorAnalysis("[1,2]")).toBeNull();
  });

  it("fails honestly when the model returns prose", async () => {
    const provider = providerReturning("我觉得问题是时态。"); // not JSON
    const outcome = await analyzeError(provider, { skill: "grammar", categoryZh: "时态" });
    expect(outcome).toEqual({ ok: false, reasonZh: expect.stringContaining("格式无效") });
  });
});
