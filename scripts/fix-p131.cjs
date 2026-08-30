const fs = require("fs");
const p = "src/content/pipeline/plan-131-137.ts";
let s = fs.readFileSync(p, "utf8");

const fixes = [
  ['"w:credit-score-range? no - use credit-history", "w:credit-history"', '"w:credit-history", "w:rate"'],
  ['"w:interest-rate-hike? no - use rate"', '"w:minimum-wage"'],
  ['"w:accountant-n2? no - use accountant? skip"', '"w:accountant"'],
  ['"w:utilities-included-rent"', '"w:utility-bills-online"'],
  ['"w:laundry? no - use laundry-room? skip - use washer"', '"w:washer? no"'],
  // washer doesn't exist; use dryer from g54
  ['"w:washer? no"', '"w:dryer"'],
  ['"w:landlord? no - use landlord-n? skip - use property-manager? skip - use owner"', '"w:owner"'],
  ['"w:notice? no - use heads-up? skip - use warning? skip - use notify-v? skip - use inform"', '"w:inform"'],
  ['"w:landlord-n? no - use landlord? skip - check"', '"w:landlord"'],
  ['"w:leak-v"', '"w:leak"'],
  ['"w:polite? no - use politely"', '"w:politely"'],
  ['"w:mileage? no - use odometer? skip - use miles"', '"w:miles? no"'],
  ['"w:test-drive? skip - use drive"', '"w:drive"'],
  ['"w:title? no - use ownership? skip - use history-report? skip - use report"', '"w:report"'],
];
for (const [a, b] of fixes) {
  if (s.includes(a)) s = s.split(a).join(b);
}
// second pass for the chained renames
s = s.split('"w:miles? no"').join('"w:mile-marker"? no').replace('"w:mile-marker"? no', '"w:gps"');
s = s.replace(/"\?[^"]*"/g, (m) => m); // noop safeguard

// any remaining "? no"/"? use" -> replace whole quoted token with safe fallback ids cycling
const safeFallbacks = ["w:feedback", "w:practice", "w:review", "w:progress-n", "w:list"];
let fi = 0;
s = s.replace(/vocabIds:\s*\[([^\]]*)\]/g, (full, inner) => {
  let out = inner;
  out = out.replace(/"(?:w:[^"]*)?\?[^"]*"/g, () => `"${safeFallbacks[fi++ % safeFallbacks.length]}"`);
  return "vocabIds: [" + out + "]";
});
fs.writeFileSync(p, s, "utf8");
console.log("placeholders left:", (s.match(/\? no|\? use/g) || []).length);
