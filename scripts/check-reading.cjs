const fs = require("fs");
const path = require("path");
// Find any plan entry where reading: is missing or has a non-array value
for (const f of fs.readdirSync("src/content/pipeline")) {
  if (!f.startsWith("plan-") || !f.endsWith(".ts")) continue;
  const s = fs.readFileSync(path.join("src/content/pipeline", f), "utf8");
  // Split into day blocks
  const dayBlocks = s.split(/(?=\{ day: )/);
  for (const block of dayBlocks) {
    const dm = block.match(/day:\s*(\d+)/);
    if (!dm) continue;
    const day = dm[1];
    // Check reading exists and is an array literal
    if (!/reading:\s*\[/.test(block)) {
      console.log(`${f} day ${day}: reading is NOT an array or missing`);
      // Print the area around where reading should be
      const wi = block.indexOf("writing:");
      if (wi > -1) console.log("  context before writing:", JSON.stringify(block.slice(Math.max(0, wi - 100), wi)));
    }
  }
}
console.log("done");
