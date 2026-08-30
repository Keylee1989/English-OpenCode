import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  captureError,
  clearErrorLog,
  ERROR_LOG_LIMIT,
  getRecentErrors,
} from "@/core/error-log";

describe("Error log (Phase 13 P0-3)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("captures entries with module/type/message and reads newest first", async () => {
    await captureError("window", "error", "script crashed");
    await captureError("ai", "unhandledrejection", "network timeout");
    const log = await getRecentErrors(20);
    expect(log).toHaveLength(2);
    expect(log[0].module).toBe("ai");
    expect(log[1].module).toBe("window");
    expect(typeof log[0].timestamp).toBe("number");
  });

  it("sanitizes credential-looking messages", async () => {
    await captureError("ai", "request-failed", "401 for key sk-abc123secret");
    const [entry] = await getRecentErrors(1);
    expect(entry.message).toContain("[redacted: possible credential]");
    expect(entry.message).not.toContain("sk-abc123secret");
  });

  it("truncates long technical messages to 200 characters", async () => {
    await captureError("study", "assertion", "x".repeat(1000));
    const [entry] = await getRecentErrors(1);
    expect(entry.message.length).toBeLessThanOrEqual(200);
  });

  it("caps the log at 100 entries (oldest dropped)", async () => {
    for (let i = 0; i < ERROR_LOG_LIMIT + 25; i++) {
      await captureError("test", "tick", `message ${i}`);
    }
    const log = await getRecentErrors(500);
    expect(log).toHaveLength(ERROR_LOG_LIMIT);
    // Newest first: the very first message must have been dropped.
    expect(log[0].message).toBe(`message ${ERROR_LOG_LIMIT + 24}`);
    expect(log.some((entry) => entry.message === "message 0")).toBe(false);
  });

  it("clears the log", async () => {
    await captureError("test", "error", "boom");
    await clearErrorLog();
    expect(await getRecentErrors(20)).toHaveLength(0);
  });
});
