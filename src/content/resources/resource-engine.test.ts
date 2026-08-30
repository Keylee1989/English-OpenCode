import { describe, expect, it } from "vitest";
import { getAllResources } from "@/content/resources/resource-engine";
import { READING_ARTICLES } from "@/content/resources/reading-library";
import {
  LISTENING_RESOURCES,
} from "@/content/resources/audio-library";
import { VIDEO_RESOURCES } from "@/content/resources/video-library";
import { DEBATE_TOPICS } from "@/content/resources/speaking-c2";
import { WRITING_TASKS } from "@/content/resources/writing-c2";

/** Phase 15-H: unified resource engine projection. */
describe("Resource engine (Phase 15-H)", () => {
  it("projects every library into one unified list", () => {
    const all = getAllResources();
    const expected =
      READING_ARTICLES.length +
      LISTENING_RESOURCES.length +
      VIDEO_RESOURCES.length +
      WRITING_TASKS.length +
      DEBATE_TOPICS.length +
      3; // presentation tracks
    expect(all.length).toBeGreaterThanOrEqual(expected);
    for (const item of all) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(["reading", "audio", "video", "grammar", "vocab", "speaking", "writing"]).toContain(
        item.type,
      );
      expect(item.offlineAvailable).toBeDefined();
      expect(["inApp", "externalAuthentic"]).toContain(item.sourceKind);
      if (item.offlineAvailable) {
        expect(item.sourceKind).toBe("inApp");
      }
    }
  });

  it("tags every external resource with a stable https landing page", () => {
    for (const item of getAllResources()) {
      if (!item.offlineAvailable) {
        expect(item.url?.startsWith("https://"), `${item.id} url`).toBe(true);
        expect(item.sourceKind).toBe("externalAuthentic");
      }
    }
  });

  it("marks every listening item as external real-language material (never TTS-as-authentic)", () => {
    for (const item of getAllResources().filter((r) => r.type === "audio")) {
      expect(item.sourceKind, `${item.id} sourceKind`).toBe("externalAuthentic");
      expect(item.offlineAvailable, `${item.id} offlineAvailable`).toBe(false);
    }
  });
});
