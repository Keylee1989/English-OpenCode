const fs = require("fs");

// 1) fix d92 vocabIds
{
  const p = "src/content/pipeline/plan-101-110.ts";
  let s = fs.readFileSync(p, "utf8");
  const bad = '["w:issue", "w:fix", "w:apologize", "w:plumber", "w:landlord"]';
  const good = '["w:issue", "w:fix", "w:apologize", "w:repair", "w:schedule"]';
  if (s.includes(bad)) s = s.split(bad).join(good);
  fs.writeFileSync(p, s, "utf8");
}

// 2) dynamic-days expectations to 110
{
  const p = "src/content/dynamic-days.test.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split("toHaveLength(90)").join("toHaveLength(110)");
  if (!s.includes("DAYS[109]")) {
    s = s.replace(
      "expect(DAYS[89]?.day).toBe(90);",
      "expect(DAYS[89]?.day).toBe(90);\n    expect(DAYS[109]?.day).toBe(110);",
    );
  }
  fs.writeFileSync(p, s, "utf8");
}

// 3) index.test boundary + describe title
{
  const p = "src/content/index.test.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split('expect(getDayContent(91)).toBeNull();').join('expect(getDayContent(111)).toBeNull();');
  s = s.split("authored curriculum Day 1-90").join("authored curriculum Day 1-110");
  s = s.split("has exactly seven sequential days").join("has sequential authored days");
  fs.writeFileSync(p, s, "utf8");
}
console.log("done");
