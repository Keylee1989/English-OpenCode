import { describe, expect, it } from "vitest";
import { DAYS } from "@/content/days";
import { DAY_CONTENT } from "@/content";

describe("dynamic day content loading", () => {
  it("resolves phase chunks through dynamic import()", async () => {
    const [p31, p51, p71] = await Promise.all([
      import("@/content/days/days31-50"),
      import("@/content/days/days51-70"),
      import("@/content/days/days71-90"),
    ]);
    expect(p31.DAYS_31_50).toHaveLength(20);
    expect(p51.DAYS_51_70).toHaveLength(20);
    expect(p71.DAYS_71_90).toHaveLength(20);
  });

  it("registers all days into the synchronous registry", () => {
    expect(DAYS.length).toBeGreaterThanOrEqual(100);
    expect(DAY_CONTENT.length).toBe(DAYS.length);
    expect(DAYS[0]?.day).toBe(1);
    expect(DAYS[DAYS.length - 1]?.day).toBeGreaterThan(100);
  });
});
