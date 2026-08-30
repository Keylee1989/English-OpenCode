import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import { track } from "@/data/recorder";
import {
  EVIDENCE_WEIGHTS,
  eventValue01,
  getAllAbilities,
  getFatigueIndicators,
  getItemMastery,
  getProductiveAbility,
  getReceptiveAbility,
  recentAccuracy,
} from "@/engines/student/student-model-v0";

const K = 8;

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("Student Model v0", () => {
  it("maps events to difficulty-credited values", () => {
    expect(eventValue01(true, 0.3)).toBeCloseTo(0.65);
    expect(eventValue01(false, 0.3)).toBeCloseTo(0.15);
    expect(eventValue01(null)).toBe(0.5);
  });

  it("updates ability only from real tracked events with the documented formula", async () => {
    // One correct multiple-choice at difficulty 0.3:
    // value = 0.65; k = w*K/(K+0) = 0.6*8/8 = 0.6... wait: w=0.6 -> k=0.6*8/8=0.6
    const weight = EVIDENCE_WEIGHTS["multiple-choice"] ?? 0;
    expect(weight).toBe(0.6);
    const expectedK = (weight * K) / (K + 0);
    const expectedScore = expectedK * (0.65 * 100 - 0);

    await track({
      skill: "vocabulary",
      interaction: "multiple-choice",
      itemId: "w:hi",
      correct: true,
      difficulty: 0.3,
    });

    const ability = await db.abilities.get("vocabulary");
    expect(ability).not.toBeNull();
    expect(ability?.score).toBeCloseTo(expectedScore, 5);
    expect(ability?.evidenceCount).toBe(1);
    expect(ability?.confidence).toBeCloseTo(1 / 13, 5);
  });

  it("hard material correct gives more credit than easy material correct", async () => {
    await track({ skill: "grammar", interaction: "typing", correct: true, difficulty: 0.9 });
    const hardGain = (await db.abilities.get("grammar"))?.score ?? 0;

    await Promise.all(db.tables.map((table) => table.clear()));

    await track({ skill: "grammar", interaction: "typing", correct: true, difficulty: 0.1 });
    const easyGain = (await db.abilities.get("grammar"))?.score ?? 0;
    expect(hardGain).toBeGreaterThan(easyGain);
  });

  it("downweights self-reported evidence by half", async () => {
    const plainWeight = EVIDENCE_WEIGHTS["self-assess"] ?? 1;
    const expectedPlain = ((plainWeight * K) / (K + 0)) * 75; // value .75 at diff .5 correct

    await track({
      skill: "speaking",
      interaction: "self-assess",
      correct: true,
      selfReported: true,
    });
    const reported = (await db.abilities.get("speaking"))?.score ?? 0;
    expect(reported).toBeCloseTo(expectedPlain / 2, 5);
  });

  it("records wrong answers into the Error Bank when categorized", async () => {
    await track({
      skill: "listening",
      interaction: "listening",
      itemId: "w:hi",
      correct: false,
      errorCategory: "listening-mishear",
      errorDescriptionZh: "把 hi 听成了 hey",
    });
    const errors = await db.errors.toArray();
    expect(errors).toHaveLength(1);
    expect(errors[0].category).toBe("listening-mishear");
    expect(errors[0].relatedItemIds).toContain("w:hi");
  });

  it("computes an upward trend after a correction streak", async () => {
    for (let i = 0; i < 10; i++) {
      await track({
        skill: "reading",
        interaction: "multiple-choice",
        correct: false,
        difficulty: 0.5,
      });
    }
    for (let i = 0; i < 10; i++) {
      await track({
        skill: "reading",
        interaction: "recall",
        correct: true,
        difficulty: 0.7,
      });
    }
    const ability = await db.abilities.get("reading");
    expect(ability?.trend).toBe("up");
    expect(await recentAccuracy("reading")).toBe(1);

    // Receptive/productive views expose only skills with real evidence.
    await track({ skill: "writing", interaction: "writing", correct: true, difficulty: 0.5 });
    await track({ skill: "listening", interaction: "listening", correct: true, difficulty: 0.5 });
    const productive = await getProductiveAbility();
    const receptive = await getReceptiveAbility();
    expect(productive["writing"]).toBeDefined();
    expect(receptive["listening"]).toBeDefined();
    expect(Object.keys(await getAllAbilities()).length).toBeGreaterThanOrEqual(3);
  });

  it("reports mastery from memory state and fatigue indicators", async () => {
    expect(await getItemMastery("w:none")).toBe("unseen");
    const fatigue = await getFatigueIndicators();
    expect(fatigue.recentErrorRate).toBe(0);
  });
});
