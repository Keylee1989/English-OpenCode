import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/data/db";
import type { IAiProvider } from "@/ai/provider";
import {
  ROLEPLAY_SCENARIOS,
  findScenario,
  resumeRoleplay,
  roleplayUserTurn,
  startRoleplay,
} from "@/engines/tutor/roleplay-engine";

function providerReturning(text: string): IAiProvider {
  return {
    providerId: "fake",
    modelId: "fake",
    complete: vi.fn().mockResolvedValue({ text, finishReason: "stop" }),
  } as unknown as IAiProvider;
}

const OPENING = JSON.stringify({
  corrections: [],
  replyEn: "Welcome! Table for two?",
  replyZh: "欢迎光临，两位吗？",
});
const REPLY = JSON.stringify({
  corrections: [{ wrong: "I want eat", right: "I would like to eat", noteZh: "want 后接 to do" }],
  replyEn: "Great choice. Anything to drink?",
  replyZh: "好选择，喝点什么？",
});

beforeEach(async () => {
  await db.errors.clear();
});

describe("roleplay scenarios", () => {
  it("exposes restaurant/airport/work with fixed roles", () => {
    expect(ROLEPLAY_SCENARIOS.map((s) => s.id)).toEqual(["restaurant", "airport", "work"]);
    const r = findScenario("restaurant")!;
    expect(r.userRoleEn).toBe("customer");
    expect(r.aiRoleEn).toBe("server");
    expect(findScenario("nope")).toBeNull();
  });

  it("user turn: corrections recorded in Error Bank + turn advances + knowledge linked", async () => {
    const provider = providerReturning(OPENING);
    const started = await startRoleplay(provider, "restaurant", { day: 104 });
    if (!started.ok) throw new Error(started.reasonZh);

    const turnProvider = providerReturning(REPLY);
    const outcome = await roleplayUserTurn(
      turnProvider,
      started.sessionId,
      "I want eat noodles please.",
    );
    expect(outcome.ok !== false ? true : false).toBe(true);
    if (!("ok" in outcome) || outcome.ok === false) return;
    expect(outcome.corrections).toHaveLength(1);
    expect(outcome.replyEn).toContain("Anything to drink");
    expect(outcome.turn).toBe(2);

    const errors = await db.errors.toArray();
    expect(errors).toHaveLength(1);
    expect(errors[0].category).toBe("roleplay-mistake");
    expect(errors[0].descriptionZh).toContain("I would like to eat");

    const resumed = await resumeRoleplay(started.sessionId);
    if (!resumed.ok) throw new Error("unreachable");
    expect(resumed.messages.some((m) => m.content === "I want eat noodles please.")).toBe(true);

    // learningEvents evidence written via track()
    const events = await db.learningEvents.toArray();
    const convo = events.filter((e) => e.interaction === "conversation");
    expect(convo.length).toBeGreaterThanOrEqual(1);
  });

  it("degrades honestly on invalid AI output and leaves session untouched", async () => {
    const provider = providerReturning(OPENING);
    const started = await startRoleplay(provider, "airport", {});
    if (!started.ok) throw new Error(started.reasonZh);

    const badProvider = providerReturning("sorry, not json");
    const outcome = await roleplayUserTurn(badProvider, started.sessionId, "Where is gate B?");
    expect(outcome.ok).toBe(false);

    const resumed = await resumeRoleplay(started.sessionId);
    if (!resumed.ok) throw new Error("unreachable");
    expect(resumed.meta.turn).toBe(1); // unchanged
    expect(await db.errors.count()).toBe(0);
  });

  it("startRoleplay fails honestly when AI errors out", async () => {
    const failing = {
      providerId: "x",
      modelId: "x",
      complete: vi.fn().mockRejectedValue(new Error("503 down")),
    } as unknown as IAiProvider;
    const result = await startRoleplay(failing, "work");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonZh).toContain("503 down");
  });

  it("rejects unknown scenario ids up front", async () => {
    const result = await startRoleplay(providerReturning("{}"), "spaceship");
    expect(result.ok).toBe(false);
  });
});
