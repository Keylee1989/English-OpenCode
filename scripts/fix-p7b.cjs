const fs = require("fs");

// fix d143 vocab count (only 4)
{
  const p = "src/content/pipeline/plan-138-143.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace(
    '"w:volunteer", "w:donate", "w:shift", "w:community-center", "w:join"',
    '"w:volunteer", "w:donate", "w:shift", "w:community-center", "w:join", "w:feedback"'
  );
  fs.writeFileSync(p, s, "utf8");
}

// fix d156 phonics gh -> igh
{
  const p = "src/content/pipeline/plan-151-158.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split('"gh"').join('"igh"');
  fs.writeFileSync(p, s, "utf8");
}

// fix dynamic-days: update to 162
{
  const p = "src/content/dynamic-days.test.ts";
  let s = fs.readFileSync(p, "utf8");
  // already updated to 162 in most places, check remaining
  if (!s.includes("DAYS[161]")) {
    s = s.replace(
      "expect(DAYS[136]?.day).toBe(137);",
      "expect(DAYS[136]?.day).toBe(137);\n    expect(DAYS[161]?.day).toBe(162);"
    );
  }
  fs.writeFileSync(p, s, "utf8");
}
console.log("done");
