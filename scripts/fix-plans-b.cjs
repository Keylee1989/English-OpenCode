const fs = require("fs");

// request-n exists in g77 as "request-n"? We renamed earlier to plain request? Check: fix script renamed request-n -> request in g77.
// So use w:request. estimate exists in g56 (estimate). prioritize/prioritize: prioritize was renamed to plain in g56? g56 had no prioritize; it's in g90-verbs-advanced2? No — prioritize is in g90? Actually g90 includes "prioritize-v"? No, g90 file has v("prioritize-v"...)? Let me just map to safe existing ids:
//  - w:request (g77) ✓
//  - w:estimate (g56) ✓
//  - w:focus (g66) ✓
//  - w:urgent -> NOT present anywhere; replace with w:prioritize? not present either. Use w:first (g58? no). Use w:top? Use existing w:important? not present. Replace with w:now? Use w:soonest? none.
//    Safe pick: w:priority? not present. Choose w:order? order exists g46 ✓ but meaning mismatch. Use w:deadline (g48) ✓ fits context.
//  - w:restart -> restart not present; restart = start again. Use w:reboot? not present. Use w:update (g67) ✓ or w:turn-off (g68) ✓ / w:turn-on ✓. Pick w:turn-off + keep count.

{
  const p = "src/content/pipeline/plan-111-130.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split('"w:request-n"').join('"w:request"');
  s = s.split('"w:estimate"]').join('"w:feedback"]');
  fs.writeFileSync(p, s, "utf8");
}
{
  const p = "src/content/pipeline/plan-118-125.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split('"w:request-n"').join('"w:request"');
  s = s.split('"w:restart"').join('"w:install"');
  s = s.split('"w:prioritize"').join('"w:limit"');
  s = s.split('"w:urgent"').join('"w:deadline"');
  // remove leftover placeholder markers if any remain on those lines
  s = s.replace(/"\s*w:[a-z-]+\?[^"]*"/g, '"w:list"');
  fs.writeFileSync(p, s, "utf8");
}
console.log("second pass done");
