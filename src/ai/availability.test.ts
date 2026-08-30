import { describe, expect, it } from "vitest";
import { getAiAvailability } from "@/ai/availability";
import type { IAiProvider } from "@/ai/provider";

const fakeProvider: IAiProvider = {
  providerId: "test-provider",
  modelId: "test-model",
  complete: async () => ({ text: "ok" }),
};

describe("AI availability contract", () => {
  it("reports unconfigured by default and states that the core system does not depend on AI", () => {
    const availability = getAiAvailability();
    expect(availability.state).toBe("unconfigured");
    if (availability.state === "unconfigured") {
      expect(availability.reasonZh).toContain("不依赖 AI");
    }
  });

  it("reports ready when a provider instance is supplied (future phases)", () => {
    const availability = getAiAvailability({ provider: fakeProvider });
    expect(availability.state).toBe("ready");
    if (availability.state === "ready") {
      expect(availability.providerId).toBe("test-provider");
    }
  });

  it("prefers proxy configuration over local keys", () => {
    const availability = getAiAvailability({
      proxyUrl: "https://proxy.example.com/api",
      hasLocalKey: true,
      provider: fakeProvider,
    });
    // An injected provider always wins; without one, proxy beats local key.
    expect(availability.state).toBe("ready");
  });

  it("reports proxy state when only a proxy URL exists", () => {
    const availability = getAiAvailability({ proxyUrl: "https://proxy.example.com/api" });
    expect(availability.state).toBe("proxy");
  });

  it("warns when only a local key is configured", () => {
    const availability = getAiAvailability({ hasLocalKey: true });
    expect(availability.state).toBe("local-key");
    if (availability.state === "local-key") {
      expect(availability.warningZh).toContain("风险");
    }
  });

  it("treats an empty proxy URL as unconfigured", () => {
    const availability = getAiAvailability({ proxyUrl: "" });
    expect(availability.state).toBe("unconfigured");
  });
});
