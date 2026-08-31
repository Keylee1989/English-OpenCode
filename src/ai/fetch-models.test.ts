import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchModels } from "@/ai/runtime";

/**
 * Tests for the optional, non-blocking /models auto-fetch (Problem A).
 *
 * Every case must return { ok:false, messageZh } rather than throw, so a
 * failed fetch can never block manual model entry.
 */
async function mockFetch(result: {
  ok?: boolean;
  status?: number;
  body?: unknown;
  res?: Response;
  throwError?: Error;
}): Promise<void> {
  if (result.throwError) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw result.throwError;
      }),
    );
    return;
  }
  const response =
    result.res ??
    ({
      ok: result.ok,
      status: result.status,
      json: async () => result.body,
    } as Response);
  vi.stubGlobal("fetch", vi.fn(async () => response));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchModels (optional model auto-fetch)", () => {
  it("returns the model list when the /models endpoint responds", async () => {
    await mockFetch({
      ok: true,
      status: 200,
      body: { data: [{ id: "gpt-4o-mini" }, { id: "gpt-4o" }, { id: "" }] },
    });
    const outcome = await fetchModels({
      baseUrl: "https://example.com/v1",
      apiKey: "sk-test",
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.models).toEqual(["gpt-4o-mini", "gpt-4o"]);
    }
  });

  it("sends the API key as a Bearer token and never exposes it in the message", async () => {
    const fetchMock = vi.fn(async () => {
      return { ok: true, status: 200, json: async () => ({ data: [{ id: "m1" }] }) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    const outcome = await fetchModels({
      baseUrl: "https://example.com/v1",
      apiKey: "sk-super-secret",
    });
    const callArgs = fetchMock.mock.calls[0] as unknown[];
    const init = callArgs[1] as { headers?: Record<string, string> };
    const headers = init.headers ?? {};
    expect(headers.Authorization).toBe("Bearer sk-super-secret");
    expect(JSON.stringify(outcome)).not.toContain("sk-super-secret");
  });

  it("returns a key-free auth error on 401/403", async () => {
    await mockFetch({ ok: false, status: 401 });
    const outcome = await fetchModels({
      baseUrl: "https://example.com/v1",
      apiKey: "sk-x",
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.messageZh).toContain("401");
      expect(outcome.messageZh).not.toContain("sk-x");
    }
  });

  it("returns a non-blocking message when the service has no /models endpoint (404)", async () => {
    await mockFetch({ ok: false, status: 404 });
    const outcome = await fetchModels({
      baseUrl: "https://example.com/v1",
      apiKey: "sk-x",
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.messageZh).toContain("/models");
  });

  it("maps CORS / network TypeError to a proxy-suggestion message", async () => {
    await mockFetch({ throwError: new TypeError("Failed to fetch") });
    const outcome = await fetchModels({
      baseUrl: "https://example.com/v1",
      apiKey: "sk-x",
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.messageZh).toContain("CORS");
  });

  it("reports empty list as failure requiring manual entry", async () => {
    await mockFetch({ ok: true, status: 200, body: { data: [] } });
    const outcome = await fetchModels({
      baseUrl: "https://example.com/v1",
      apiKey: "sk-x",
    });
    expect(outcome.ok).toBe(false);
  });

  it("requires a base URL before fetching", async () => {
    const outcome = await fetchModels({ baseUrl: "", apiKey: "sk-x" });
    expect(outcome.ok).toBe(false);
  });
});
