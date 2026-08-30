const fs = require("fs");

// 1) days-phase4a.test.ts
{
  const p = "src/content/days-phase4a.test.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace("Day 31-162", "Day 31-180");
  s = s.replace("132 sequential days 31..162", "150 sequential days 31..180");
  s = s.replace("{ length: 132 }", "{ length: 150 }");
  s = s.split("DAY_CONTENT.length).toBe(162)").join("DAY_CONTENT.length).toBe(180)");
  s = s.split("getDayContent(162)").join("getDayContent(180)");
  s = s.split("getDayContent(163)").join("getDayContent(181)");
  fs.writeFileSync(p, s, "utf8");
}

// 2) dynamic-days.test.ts
{
  const p = "src/content/dynamic-days.test.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split(".toBe(162)").join(".toBe(180)");
  s = s.split("toHaveLength(162)").join("toHaveLength(180)");
  if (!s.includes("DAYS[179]")) {
    s = s.replace(
      "expect(DAYS[136]?.day).toBe(137);",
      "expect(DAYS[136]?.day).toBe(137);\n    expect(DAYS[179]?.day).toBe(180);"
    );
  }
  fs.writeFileSync(p, s, "utf8");
}

// 3) index.test.ts
{
  const p = "src/content/index.test.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split(".toBe(162)").join(".toBe(180)");
  s = s.split("Day 1-162").join("Day 1-180");
  s = s.split("getDayContent(163)").join("getDayContent(181)");
  fs.writeFileSync(p, s, "utf8");
}

// 4) knowledge-model-v0.test.ts
{
  const p = "src/knowledge/knowledge-model-v0.test.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split(".toBe(162)").join(".toBe(180)");
  fs.writeFileSync(p, s, "utf8");
}

// 5) context-builder.test.ts
{
  const p = "src/engines/tutor/context-builder.test.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split(".toBe(162)").join(".toBe(180)");
  s = s.replace(/day=\\d\+\\\/\d+/g, "day=\\d+\\/180");
  fs.writeFileSync(p, s, "utf8");
}
console.log("all constants updated to 180");
