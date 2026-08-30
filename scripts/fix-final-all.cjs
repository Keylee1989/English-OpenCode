const fs = require("fs");

// 1) Fix d145 vocabIds - replace non-existent with existing
{
  const p = "src/content/pipeline/plan-144-150-clean.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace('"w:bin"', '"w:container? no"');
  s = s.replace('"w:list"', '"w:feedback"');
  // Actually bin and list might not exist. Use verified words:
  s = s.replace(
    '["w:recycle", "w:garbage", "w:bin", "w:list"]',
    '["w:recycle", "w:garbage", "w:detail", "w:feedback"]'
  );
  fs.writeFileSync(p, s, "utf8");
}

// 2) Update ALL test constants to 150
const updates = [
  ["src/content/index.test.ts", [
    [".toBe(137)", ".toBe(150)"],
    ["Day 1-137", "Day 1-150"],
  ]],
  ["src/content/days-phase4a.test.ts", [
    [".toBe(137)", ".toBe(150)"],
  ]],
  ["src/knowledge/knowledge-model-v0.test.ts", [
    [".toBe(137)", ".toBe(150)"],
  ]],
  ["src/study/integration-day1.test.ts", [
    ["toHaveLength(137)", "toHaveLength(150)"],
  ]],
];
for (const [p, reps] of updates) {
  let s = fs.readFileSync(p, "utf8");
  for (const [a, b] of reps) {
    if (s.includes(a)) s = s.split(a).join(b);
  }
  fs.writeFileSync(p, s, "utf8");
}
console.log("all updated to 150");
