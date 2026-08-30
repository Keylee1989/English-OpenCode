import { describe, expect, it, vi } from "vitest";
import type { IAiProvider } from "@/ai/provider";
import { parseGapFillGrades, gradeAllGapFills } from "@/ai/lvm-service";

function providerReturning(text: string): { provider: IAiProvider; spy: ReturnType<typeof vi.fn> } {
  const spy = vi.fn().mockResolvedValue({ text, finishReason: "stop" });
  const provider: IAiProvider = {
    providerId: "fake",
    modelId: "fake-model",
    complete: spy as unknown as IAiProvider["complete"],
  };
  return { provider, spy };
}

describe("lvm-service", () => {
  it("parseGapFillGrades parses strict JSON array", () => {
    const out = parseGapFillGrades('[{"index":0,"correct":true},{"index":1,"correct":false}]');
    expect(out).toEqual([
      { index: 0, correct: true },
      { index: 1, correct: false },
    ]);
  });

  it("parseGapFillGrades strips code fences", () => {
    const out = parseGapFillGrades('```json\n[{"index":0,"correct":true}]\n```');
    expect(out).toEqual([{ index: 0, correct: true }]);
  });

  it("parseGapFillGrades returns null on malformed / non-array", () => {
    expect(parseGapFillGrades("nope")).toBeNull();
    expect(parseGapFillGrades('{"index":0}')).toBeNull();
    expect(parseGapFillGrades("[]")).toBeNull();
  });

  it("gradeAllGapFills forwards batch payload and maps results", async () => {
    const { provider, spy } = providerReturning('[{"index":0,"correct":true},{"index":1,"correct":false}]');
    const out = await gradeAllGapFills(
      provider,
      [
        { index: 0, sentence: "I drink ____.", answer: "water", key: "water" },
        { index: 1, sentence: "Open your ____.", answer: "book", key: "book" },
      ],
    );
    expect(out).toEqual([
      { index: 0, correct: true },
      { index: 1, correct: false },
    ]);
    const payload = spy.mock.calls[0][0].messages[1].content as string;
    expect(payload).toContain("#0");
    expect(payload).toContain("I drink ____.");
  });

  it("gradeAllGapFills returns null when a required index is missing", async () => {
    const { provider } = providerReturning('[{"index":0,"correct":true}]');
    const out = await gradeAllGapFills(provider, [
      { index: 0, sentence: "a", answer: "a", key: "a" },
      { index: 1, sentence: "b", answer: "b", key: "b" },
    ]);
    expect(out).toBeNull();
  });

  it("gradeAllGapFills returns [] for no items and null on bad JSON", async () => {
    expect(await gradeAllGapFills(providerReturning("x").provider, [])).toEqual([]);
    const { provider } = providerReturning("not json");
    const out = await gradeAllGapFills(provider, [
      { index: 0, sentence: "a", answer: "a", key: "a" },
    ]);
    expect(out).toBeNull();
  });
});
