const fs = require("fs");

// plan-118-125
{
  const p = "src/content/pipeline/plan-118-125.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split('["pr? use pl", "sh"]').join('["pl", "sh"]');
  s = s.split('["str", "ee"]').join('["st", "ee"]');
  fs.writeFileSync(p, s, "utf8");
}

// plan-126-130
{
  const p = "src/content/pipeline/plan-126-130.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split('["au? use aw? none - use o-short", "ai"]').join('["ow-2", "ai"]');
  fs.writeFileSync(p, s, "utf8");
}

// plan-131-137: the blanket safe-replace corrupted phonics arrays; restore valid rules per day
{
  const p = "src/content/pipeline/plan-131-137.ts";
  let s = fs.readFileSync(p, "utf8");
  const dayRules = {
    131: '["a-short", "ng"]',
    132: '["ai", "dr"]',
    133: '["ai", "st"]',
    134: '["a-short", "oa"]',
    135: '["ee", "i-short"]',
    136: '["ai", "sh"]',
    137: '["dr", "ai"]',
  };
  // Replace every phonicsRuleIds array containing a w: token with sequential valid ones.
  let currentDay = null;
  const lines = s.split("\n");
  const out = lines.map((line) => {
    const dm = line.match(/day:\s*(\d+)/);
    if (dm) currentDay = Number(dm[1]);
    if (/phonicsRuleIds:\s*\[[^\]]*w:[^\]]*\]/.test(line) && currentDay && dayRules[currentDay]) {
      return line.replace(/phonicsRuleIds:\s*\[[^\]]*\]/, `phonicsRuleIds: ${dayRules[currentDay]}`);
    }
    return line;
  });
  fs.writeFileSync(p, out.join("\n"), "utf8");
}
console.log("phonics arrays fixed");
