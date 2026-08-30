import { describe, expect, it, vi } from "vitest";
import type { IAiProvider } from "@/ai/provider";
import { parseProductiveGrades, gradeProductiveBatch, productiveEvidenceOf } from "@/ai/baseline-ai";
import type { Probe } from "@/study/validation/banks/types";

function providerReturning(text: string): { provider: IAiProvider; spy: ReturnType<typeof vi.fn> } {
  const spy = vi.fn().mockResolvedValue({ text, finishReason: "stop" });
  const provider: IAiProvider = {
    providerId: "fake",
    modelId: "fake-model",
    complete: spy as unknown as IAiProvider["complete"],
  };
  return { provider, spy };
}

function probe(kind: Probe["kind"]): Probe {
  return {
    id: `p-${kind}`,
    skill: kind.startsWith("speaking") ? "speaking" : "writing",
    band: "B1",
    kind,
    productive: true,
    promptEn: "Prompt",
    promptZh: "提示",
  };
}

describe("baseline-ai productive grading", () => {
  it("parseProductiveGrades parses strict JSON array", () => {
    const out = parseProductiveGrades('[{"index":0,"correct":true},{"index":2,"correct":false}]');
    expect(out).toEqual([
      { index: 0, correct: true },
      { index: 2, correct: false },
    ]);
  });

  it("parseProductiveGrades strips code fences", () => {
    const out = parseProductiveGrades('```json\n[{"index":1,"correct":true}]\n```');
    expect(out).toEqual([{ index: 1, correct: true }]);
  });

  it("parseProductiveGrades returns null on malformed / empty", () => {
    expect(parseProductiveGrades("nope")).toBeNull();
    expect(parseProductiveGrades('{"index":0}')).toBeNull();
    expect(parseProductiveGrades("[]")).toBeNull();
  });

  it("gradeProductiveBatch forwards prompt + response and maps results", async () => {
    const { provider, spy } = providerReturning('[{"index":0,"correct":true},{"index":1,"correct":false}]');
    const out = await gradeProductiveBatch(provider, [
      { index: 0, probe: probe("speaking-opinion"), response: "I think it's good." },
      { index: 1, probe: probe("writing-essay"), response: "It depends on many factors." },
    ]);
    expect(out).toEqual([
      { index: 0, correct: true },
      { index: 1, correct: false },
    ]);
    const payload = spy.mock.calls[0][0].messages[1].content as string;
    expect(payload).toContain("#0");
    expect(payload).toContain("I think it's good.");
  });

  it("gradeProductiveBatch returns null when a required index is missing", async () => {
    const { provider } = providerReturning('[{"index":0,"correct":true}]');
    const out = await gradeProductiveBatch(provider, [
      { index: 0, probe: probe("speaking-opinion"), response: "a" },
      { index: 1, probe: probe("writing-essay"), response: "b" },
    ]);
    expect(out).toBeNull();
  });

  it("gradeProductiveBatch returns [] on empty and null on bad JSON", async () => {
    expect(await gradeProductiveBatch(providerReturning("x").provider, [])).toEqual([]);
    const { provider } = providerReturning("not json");
    const out = await gradeProductiveBatch(provider, [
      { index: 0, probe: probe("writing-essay"), response: "abc" },
    ]);
    expect(out).toBeNull();
  });

  it("parseProductiveGrades surfaces optional evidence + confidence (P0-5)", () => {
    const out = parseProductiveGrades(
      '[{"index":0,"correct":true,"evidenceZH":"语法正确，词汇达到B1","confidence":0.85},{"index":2,"correct":false}]',
    );
    expect(out?.[0]).toMatchObject({ index: 0, correct: true, evidenceZh: "语法正确，词汇达到B1", confidence: 0.85 });
    expect(out?.[1]).toEqual({ index: 2, correct: false });
  });

  it("parseProductiveGrades tolerates snake_case evidence too", () => {
    const out = parseProductiveGrades('[{"index":1,"correct":true,"evidence_zh":"基本达要求"}]');
    expect(out?.[0].evidenceZh).toBe("基本达要求");
  });

  it("parseProductiveGrades ignores invalid confidence (no fabrication)", () => {
    const out = parseProductiveGrades('[{"index":0,"correct":true,"confidence":5}]');
    expect(out?.[0].confidence).toBeUndefined();
  });

  it("productiveEvidenceOf maps to a per-skill evidence summary", () => {
    const graded = [
      { index: 0, correct: true, evidenceZh: "词汇丰富", confidence: 0.9 },
      { index: 1, correct: false },
    ];
    const summary = productiveEvidenceOf(graded, [
      { index: 0, skill: "speaking" },
      { index: 1, skill: "writing" },
    ]);
    expect(summary).toHaveLength(2);
    expect(summary[0]).toMatchObject({ skill: "speaking", index: 0, correct: true, confidence: 0.9, evidenceZh: "词汇丰富" });
    // Free-text evidence only when present; never fabricated otherwise.
    expect(summary[1].evidenceZh).toBe("暂未达目标档位要求。");
  });
});
