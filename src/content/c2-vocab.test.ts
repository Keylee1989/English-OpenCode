import { describe, expect, it } from "vitest";
import { lexicalCount, getDanglingRelations, allLexical } from "@/content/vocab";
import { findLexical } from "@/content/vocab";

/**
 * Phase 15-A: C2 expansion rows must merge cleanly into the runtime model
 * with their CEFR display layer intact.
 */
describe("C2 vocabulary expansion (Phase 15-A)", () => {
  it("raises the merged vocabulary beyond the Phase 14 baseline", () => {
    // 5014 baseline + C2 tranche.
    expect(lexicalCount()).toBeGreaterThanOrEqual(5200);
  });

  it("exposes CEFR display fields on C2 entries", () => {
    const entry = findLexical("w:nuanced");
    expect(entry).not.toBeNull();
    expect(entry?.level).toMatch(/^C[12]$/);
    expect(["formal", "neutral", "casual", "academic", "slang"]).toContain(entry?.register);
    expect(["spoken", "written", "both"]).toContain(entry?.usage);
    expect(entry?.meaningNuance?.length ?? 0).toBeGreaterThan(4);
  });

  it("keeps collocations and examples complete on C2 entries", () => {
    for (const id of ["w:nuanced", "w:corroborate", "w:zeitgeist"]) {
      const entry = findLexical(id);
      expect(entry, id).not.toBeNull();
      expect(entry!.collocations.length, id).toBeGreaterThanOrEqual(1);
      expect(entry!.example.en.length, id).toBeGreaterThan(5);
      expect(entry!.ipa.startsWith("/"), id).toBe(true);
    }
  });

  it("Phase 23 (P0-7): C2 syn/ant display layer is wired into the ID graph", () => {
    // The Phase-22 gap (relation-graph empty) is now closed for the subset of
    // synonyms/antonyms whose word strings resolve to an existing lexical id.
    let wired = 0;
    for (const entry of allLexical()) {
      const relates = (entry.synonymIds?.length ?? 0) + (entry.antonymIds?.length ?? 0);
      if (relates > 0) wired += 1;
    }
    // At least some C2 rows now carry resolvable ID relations (not empty graph).
    expect(wired, "expected some wired syn/ant ID relations").toBeGreaterThan(100);
    // Dangling-free: every resolved relation endpoint must exist.
    // Count only resolvable subset (unresolvable display strings are dropped),
    // so the graph must stay non-dangling.
    expect(getDanglingRelations()).toEqual([]);
  });
});

import type { LexicalEntryV2 } from "@/content/vocab/types";

declare module "@/content/vocab" {
  // no augmentation needed; optional fields live on LexicalEntryV2
}

// Re-export guard so unused-import lint stays quiet about the type helper.
export type { LexicalEntryV2 };
