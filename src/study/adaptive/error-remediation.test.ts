import { describe, expect, it } from "vitest";
import { remediateFor } from "@/study/adaptive/error-remediation";

describe("remediateFor", () => {
  it("routes recognition-mismatch to vocabulary distinction path", () => {
    const p = remediateFor({ errorType: "recognition-mismatch", topic: "affect/effect" });
    expect(p.attribution).toBe("vocabulary");
    expect(p.srsType).toBe("vocabulary");
    expect(p.steps.length).toBeGreaterThanOrEqual(4);
    expect(p.titleZh).toContain("affect/effect");
  });

  it("routes listening-mishear to a listening micro-drill", () => {
    const p = remediateFor({ errorType: "listening-mishear", topic: "did you" });
    expect(p.attribution).toBe("listening");
    expect(p.srsType).toBe("listening");
    expect(p.steps.some((s) => s.nameZh.includes("影子跟读"))).toBe(true);
  });

  it("routes phonics-confusion to phonics", () => {
    const p = remediateFor({ errorType: "phonics-confusion", topic: "ship/sheep" });
    expect(p.attribution).toBe("phonics");
    expect(p.srsType).toBe("phonics");
  });

  it("routes unknown/grammar errors to grammar path", () => {
    const p = remediateFor({ errorType: "some-unknown", skill: "grammar" });
    expect(p.attribution).toBe("grammar");
    expect(p.srsType).toBe("grammar");
  });
});
