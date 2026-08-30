import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  completeOnboarding,
  getOnboardingProgress,
  saveOnboardingStep,
  shouldShowOnboarding,
} from "@/study/onboarding/onboarding-state";

describe("First Launch Onboarding (Phase 13 P0-2)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("shows the flow for a brand-new user", async () => {
    expect(await shouldShowOnboarding()).toBe(true);
    expect(await getOnboardingProgress()).toEqual({ completed: false, step: 0 });
  });

  it("auto-skips legacy users who already have learning data", async () => {
    // Pre-existing learner with no onboarding flag.
    await db.learningEvents.add({
      id: "legacy-1",
      occurredAt: Date.now() - 86400000,
      skill: "vocabulary",
      interaction: "learn-new",
      correct: null,
    });
    expect(await shouldShowOnboarding()).toBe(false);
    // And the skip is recorded so later checks stay false.
    const progress = await getOnboardingProgress();
    expect(progress.completed).toBe(true);
  });

  it("persists step progress and completion", async () => {
    expect(await shouldShowOnboarding()).toBe(true);
    await saveOnboardingStep(1);
    expect((await getOnboardingProgress()).step).toBe(1);
    await saveOnboardingStep(2);
    expect((await getOnboardingProgress()).step).toBe(2);
    await completeOnboarding();
    const final = await getOnboardingProgress();
    expect(final.completed).toBe(true);
    expect(final.step).toBe(3);
    expect(await shouldShowOnboarding()).toBe(false);
  });

  it("never shows twice after completion", async () => {
    await completeOnboarding();
    expect(await shouldShowOnboarding()).toBe(false);
    await completeOnboarding();
    expect(await shouldShowOnboarding()).toBe(false);
  });
});
