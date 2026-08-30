const fs = require("fs");
// Rewrite days-phase4a.test.ts for Day 31-162 (132 days)
const content = `import { describe, expect, it } from "vitest";
import { DAY_CONTENT, getDayContent, getDayVocabulary } from "@/content";
import { GRAMMAR_TOPICS } from "@/engines/grammar/topics";
import { PHONICS_RULES, MINIMAL_PAIRS } from "@/phonics/rules";

describe("Phase 4-A/5/6/7 curriculum (Day 31-162)", () => {
  const newDays = DAY_CONTENT.filter((day) => day.day >= 31);

  it("has exactly 132 sequential days 31..162", () => {
    expect(newDays.map((d) => d.day)).toEqual(
      Array.from({ length: 132 }, (_, i) => i + 31),
    );
    expect(DAY_CONTENT.length).toBe(162);
  });

  it("every day carries all nine section hooks", () => {
    for (const day of newDays) {
      expect(day.pattern.examples.length, \`\${day.day} ex\`).toBeGreaterThanOrEqual(3);
      expect(day.pattern.practiceSentences.length, \`\${day.day} sent\`).toBeGreaterThanOrEqual(3);
      expect(getDayVocabulary(day).length, \`\${day.day} vocab\`).toBeGreaterThanOrEqual(5);
      expect(day.grammarTopicId, \`\${day.day} grammar\`).toBeTruthy();
      expect(day.phonicsFocus?.ruleIds.length ?? 0, \`\${day.day} phonics\`).toBeGreaterThan(0);
      expect((day.reading?.length ?? 0), \`\${day.day} reading\`).toBeGreaterThanOrEqual(1);
      expect(day.writingPrompt?.zh.length ?? 0, \`\${day.day} writing\`).toBeGreaterThan(0);
    }
  });

  it("every grammar topic id resolves", () => {
    const topicIds = new Set(GRAMMAR_TOPICS.map((t) => t.id));
    for (const day of newDays) {
      expect(topicIds.has(day.grammarTopicId!), \`\${day.day}: \${day.grammarTopicId}\`).toBe(true);
    }
  });

  it("every phonics rule id and pair id resolves", () => {
    const ruleIds = new Set(PHONICS_RULES.map((r) => r.id));
    const pairIds = new Set(MINIMAL_PAIRS.map((p) => p.id));
    for (const day of newDays) {
      for (const ruleId of day.phonicsFocus?.ruleIds ?? []) {
        expect(ruleIds.has(ruleId), \`\${day.day} rule \${ruleId}\`).toBe(true);
      }
      for (const pairId of day.phonicsFocus?.pairIds ?? []) {
        expect(pairIds.has(pairId), \`\${day.day} pair \${pairId}\`).toBe(true);
      }
    }
  });

  it("every vocab id resolves (no dangling references)", () => {
    for (const day of newDays) {
      const resolved = getDayVocabulary(day).length;
      const total = day.vocabIds?.length ?? day.vocab.length;
      expect(resolved, \`\${day.day}\`).toBe(total);
    }
  });

  it("has no placeholder markers anywhere", () => {
    for (const day of newDays) {
      const blob = JSON.stringify(day);
      expect(blob.includes("? no"), \`\${day.day} ph1\`).toBe(false);
      expect(blob.toLowerCase().includes("placeholder"), \`\${day.day} ph2\`).toBe(false);
      expect(blob.includes("TODO"), \`\${day.day} ph3\`).toBe(false);
    }
  });
});

describe("getDayContent boundary after expansion", () => {
  it("serves days up to 162 and rejects 163+", () => {
    expect(getDayContent(162)).not.toBeNull();
    expect(getDayContent(163)).toBeNull();
  });
});
`;
fs.writeFileSync("src/content/days-phase4a.test.ts", content, "utf8");
console.log("days-phase4a.test rewritten for Day 31-162");

// Also update dynamic-days test
const dp = "src/content/dynamic-days.test.ts";
let d = fs.readFileSync(dp, "utf8");
d = d.split("toHaveLength(162)").join("toHaveLength(162)");
if (!d.includes("DAYS[161]")) {
  d = d.replace(
    "expect(DAYS[136]?.day).toBe(137);",
    "expect(DAYS[136]?.day).toBe(137);\n    expect(DAYS[161]?.day).toBe(162);",
  );
}
fs.writeFileSync(dp, d, "utf8");
console.log("dynamic-days updated");
