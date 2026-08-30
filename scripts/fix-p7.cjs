const fs = require("fs");

// fix d138 vocab count - add feedback as 6th
{
  const p = "src/content/pipeline/plan-138-143.ts";
  let s = fs.readFileSync(p, "utf8");
  const old = '"w:inform"],';
  const rep = '"w:inform", "w:feedback"],';
  if (s.includes(old)) {
    s = s.replace(old, rep);
    fs.writeFileSync(p, s, "utf8");
    console.log("d138 vocab fixed");
  } else console.log("d138 already ok or not found");
}

// fix d145 phonics cl -> bl
{
  const p = "src/content/pipeline/plan-144-150.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split('"cl"').join('"bl"');
  fs.writeFileSync(p, s, "utf8");
  console.log("d145 phonics fixed");
}

// fix plan-151-158 reading nesting
{
  const p = "src/content/pipeline/plan-151-158.ts";
  let s = fs.readFileSync(p, "utf8");
  // Move reading: out of the pattern object by finding pattern blocks that contain reading
  // The issue is `reading:` appears inside `pattern: { ... }` when it should be at day level
  // Fix by ensuring sentences array closes pattern, then reading is at day level
  const badPattern = /(sentences:\s*\[[^\]]*\]\]\s*\},)\s*\n\s*(reading:)/;
  while (badPattern.test(s)) {
    s = s.replace(badPattern, "$1\n    $2");
  }
  fs.writeFileSync(p, s, "utf8");
  console.log("plan-151-158 nesting checked");
}
