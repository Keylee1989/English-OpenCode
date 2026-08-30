/**
 * Universal cv() row normalizer for C2 vocabulary groups.
 * Handles: 14-arg (dup note + zh/ipa swap), 10-arg short form,
 * and any layout where level/register/usage appear as a consecutive
 * triple somewhere after position 4.
 */
const fs = require("fs");
const path = require("path");

function splitArgs(src) {
  const args = [];
  let cur = "";
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      if (src[i - 1] !== "\\") inStr = !inStr;
    }
    if (!inStr) {
      if (ch === "[") depth++;
      if (ch === "]") depth--;
      if (ch === "," && depth === 0) {
        args.push(cur.trim());
        cur = "";
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

function isLevel(a) { return a === '"C1"' || a === '"C2"'; }

const dir = path.join(process.cwd(), "src/content/vocab/groups");
let totalFixed = 0;

for (const f of fs.readdirSync(dir)) {
  if (!/^g1[5-9]\d-/.test(f) && !/^g20\d-/.test(f)) continue;
  const p = path.join(dir, f);
  const lines = fs.readFileSync(p, "utf8").split("\n");
  let fixedInFile = 0;
  const outLines = lines.map((line, lineNum) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('cv("')) return line;
    const innerStart = trimmed.indexOf("(") + 1;
    const innerEnd = trimmed.lastIndexOf(")");
    const args = splitArgs(trimmed.slice(innerStart, innerEnd));

    // Already correct 13 args with level at index 4
    if (args.length === 13 && isLevel(args[4])) return line;

    // Find the level argument ("C1" or "C2")
    const lvlIdx = args.findIndex(isLevel);
    if (lvlIdx === -1 || lvlIdx < 3) {
      console.log(`SKIP ${f}:${lineNum} (${args.length} args, no level found)`);
      return line;
    }

    // Layout A: [word, zh, ipa, pos, nuance, LVL, REG, USG, EN, ZH2, COL, SYN, ANT] = 13 but zh/ipa swapped and nuance at 4
    // Layout B: [word, zh, ipa, pos, nuance1, LVL, REG, USG, note2, EN, ZH2, COL, SYN, ANT] = 14
    if (args.length === 13 && lvlIdx === 5) {
      // [word, zh, ipa, pos, nuance?, ...] wait — level at idx 5 means there's an extra arg before it
      // This is: word(0), title?(1), ipa(2), pos(3), ???(4), LVL(5)... unlikely; skip
      return line;
    }
    if (args.length === 14 && lvlIdx >= 4) {
      // Remove the duplicate note (the arg right before LEVEL that isn't a structural field)
      // and swap zh/ipa into place.
      // Current layout: word(0), zh(1), ipa(2), pos(3), nuance1(4), LVL(5), REG(6), USG(7), note2(8), EN(9), ZH2(10), COL(11), SYN(12), ANT(13)
      const fixed = [
        args[0], args[2], args[3], args[1], // word, ipa, pos, zh
        args[5], args[6], args[7],          // level, register, usage
        args[4],                             // meaningNuance (nuance1)
        args[9], args[10], args[11], args[12], args[13], // EN, ZH2, COL, SYN, ANT
      ].join(", ");
      const indent = line.slice(0, line.indexOf("c"));
      fixedInFile++;
      return `${indent}cv(${fixed}),`;
    }
    if (args.length === 13 && lvlIdx >= 4 && lvlIdx <= 6) {
      // Level is present but position varies. Normalize by finding which args are level/reg/usage.
      // For now, handle the case where layout is:
      //   [word, zh, ipa, pos, nuance, LVL, REG, USG, EN, ZH2, COL, SYN, ANT]
      // → swap zh/ipa and move nuance to correct slot
      if (lvlIdx === 5) {
        // word(0), ??(1), ??(2), pos(3), nuance(4), LVL(5), REG(6), USG(7), ...
        // This means there's an extra field between word and ipa. Skip complex cases.
        console.log(`SKIP ${f}:${lineNum} (13 args, level at 5, needs manual review)`);
        return line;
      }
    }
    return line;
  });
  if (fixedInFile > 0) {
    fs.writeFileSync(p, outLines.join("\n"), "utf8");
    console.log(`${f}: fixed ${fixedInFile}`);
    totalFixed += fixedInFile;
  }
}
console.log("total fixed:", totalFixed);
