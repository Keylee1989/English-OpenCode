import { describe, expect, it } from "vitest";
import {
  ENGINE_REGISTRY,
  REQUIRED_MODULE_IDS,
  type EngineStatus,
  findEngine,
} from "@/engines";

describe("engine registry integrity", () => {
  it("covers every module required by the master spec (29 modules)", () => {
    const registeredIds = new Set(ENGINE_REGISTRY.map((engine) => engine.id));
    for (const id of REQUIRED_MODULE_IDS) {
      expect(registeredIds.has(id)).toBe(true);
    }
    expect(REQUIRED_MODULE_IDS).toHaveLength(29);
  });

  it("has unique ids and valid statuses", () => {
    const validStatuses: EngineStatus[] = ["not-implemented", "partial", "ready"];
    const ids = ENGINE_REGISTRY.map((engine) => engine.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const engine of ENGINE_REGISTRY) {
      expect(validStatuses).toContain(engine.status);
      expect(engine.nameZh.length).toBeGreaterThan(0);
      expect(engine.purposeZh.length).toBeGreaterThan(0);
    }
  });

  it("keeps infrastructure statuses honest", () => {
    // Real, tested code exists -> partial.
    expect(findEngine("persistence")?.status).toBe("partial");
    expect(findEngine("import-export")?.status).toBe("partial");
    expect(findEngine("pwa")?.status).toBe("partial");
    // Seams only - no usable capability yet -> must NOT claim partial.
    expect(findEngine("sync-adapter")?.status).toBe("not-implemented");
    // Phase 4-A: provider implementation + tutor context/service are real and
    // tested, but no UI wiring yet -> honest "partial".
    expect(findEngine("ai-provider")?.status).toBe("partial");
    expect(findEngine("ai-tutor")?.status).toBe("partial");
  });

  it("reflects Phase 1 reality: core loop engines are partial", () => {
    const phaseOneEngines = [
      "curriculum",
      "student-model",
      "memory",
      "srs",
      "planner",
      "vocabulary",
      "listening",
      "speaking",
      "progress",
    ];
    for (const id of phaseOneEngines) {
      expect(findEngine(id)?.status).toBe("partial");
    }
  });

  it("reflects Phase 2/3 reality: knowledge/error/phonics/grammar engines are partial", () => {
    const phaseTwoEngines = [
      "knowledge-model",
      "knowledge-graph",
      "error-analysis",
      "phonics",
    ];
      expect(findEngine("grammar")?.status).toBe("partial");
    for (const id of phaseTwoEngines) {
      expect(findEngine(id)?.status).toBe("partial");
    }
  });

  it("reflects Phase 4-B reality: AI layer and gamification v0 are partial", () => {
    // Real implementations + tests exist; no full UX yet where applicable.
    expect(findEngine("ai-provider")?.status).toBe("partial");
    expect(findEngine("ai-tutor")?.status).toBe("partial");
    expect(findEngine("gamification")?.status).toBe("partial");
  });

  it("keeps not-yet-built learning engines honest", () => {
    const futureEngines = [
      "adaptive",
      "pronunciation",
      "reading",
      "writing",
      "real-world",
      "achievement",
      "ai-conversation",
    ];
    for (const id of futureEngines) {
      expect(findEngine(id)?.status).toBe("not-implemented");
    }
  });
});
