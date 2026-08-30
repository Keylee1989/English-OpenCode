/**
 * Smart cv() row normalizer v3.
 * Semantically identifies each argument rather than relying on position.
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

const LEVELS = new Set(['"C1"', '"C2"']);
const REGISTERS = new Set(['"formal"', '"neutral"', '"casual"', '"academic"', '"slang"', '"business"']);
const USAGES = new Set(['"spoken"', '"written"', '"both"']);
const POS_PREFIXES = ["n.", "v.", "adj.", "adv.", "phr.v.", "phr.", "idi.", "prep.", "conj.", "interj.", "pron.", "num.", "art.", "disc.", "abbr."];

function classifyArgs(args) {
  const result = { word: null, ipa: null, pos: null, zh: null, level: null, reg: null, usage: null, nuance: null, en: null, zh2: null, col: null, syn: null, ant: null };
  const used = new Set();

  // word: always args[0]
  result.word = args[0]; used.add(0);

  // ipa: starts with / OR empty ""
  for (let i = 1; i < args.length; i++) {
    if (!used.has(i) && /^"/.test(args[i]) && (/\/.*\/$/.test(args[i].replace(/^"|"$/g, "")) || args[i] === '""')) {
      result.ipa = args[i]; used.add(i); break;
    }
  }

  // level: C1 or C2
  for (let i = 1; i < args.length; i++) {
    if (!used.has(i) && LEVELS.has(args[i])) {
      result.level = args[i]; used.add(i); break;
    }
  }

  // register
  for (let i = 1; i < args.length; i++) {
    if (!used.has(i) && REGISTERS.has(args[i])) {
      result.reg = args[i]; used.add(i); break;
    }
  }

  // usage
  for (let i = 1; i < args.length; i++) {
    if (!used.has(i) && USAGES.has(args[i])) {
      result.usage = args[i]; used.add(i); break;
    }
  }

  // pos: short string ending in . matching known prefixes
  for (let i = 1; i < args.length; i++) {
    if (!used.has(i)) {
      const inner = args[i].replace(/^"|"$/g, "");
      if (POS_PREFIXES.some((pfx) => inner === pfx || inner.startsWith(pfx.replace(".", "") + "."))) {
        result.pos = args[i]; used.add(i); break;
      }
    }
    // Also match compound like "n./v." or "adj./n."
    if (!used.has(i)) {
      const inner = args[i]?.replace(/^"|"$/g, "") ?? "";
      if (/^[a-z]+\.[\/a-z.]*$/.test(inner) && inner.endsWith(".")) {
        result.pos = args[i]; used.add(i); break;
      }
    }
  }

  // syn/ant: arrays [...]
  const arrays = [];
  for (let i = args.length - 1; i >= 0; i--) {
    if (!used.has(i) && /^\[.*\]$/.test(args[i])) {
      arrays.unshift(i);
    }
  }
  if (arrays.length >= 2) {
    result.ant = args[arrays[arrays.length - 1]];
    result.syn = args[arrays[arrays.length - 2]];
    used.add(arrays[arrays.length - 1]);
    used.add(arrays[arrays.length - 2]);
  }

  // col: string right before syn
  if (result.syn !== null) {
    const synIdx = parseInt(result.syn === args[result.syn] ? result.syn : "0");
    for (let i = args.length - 1; i >= 0; i--) {
      if (!used.has(i) && !/^\"?\[/.test(args[i]) ) {
        result.col = args[i]; used.add(i); break;
      }
    }
  }

  // Remaining strings: assign to zh, en, zh2, nuance based on content heuristics
  const remaining = [];
  for (let i = 1; i < args.length; i++) {
    if (!used.has(i)) remaining.push(i);
  }
  // Sort by original index
  remaining.sort((a, b) => a - b);

  // zh: Chinese text (contains CJK chars)
  for (const i of remaining) {
    const inner = args[i].replace(/^"|"$/g, "");
    if (/[\u4e00-\u9fff]/.test(inner) && !result.zh) {
      result.zh = args[i]; used.add(i);
      break;
    }
  }

  // zh2: another Chinese string
  for (const i of remaining) {
    if (used.has(i)) continue;
    const inner = args[i].replace(/^"|"$/g, "");
    if (/[\u4e00-\u9fff]/.test(inner) && !result.zh2) {
      result.zh2 = args[i]; used.add(i);
      break;
    }
  }

  // nuance: contains Chinese but longer / has technical terms
  for (const i of remaining) {
    if (used.has(i)) continue;
    result.nuance = args[i]; used.add(i);
    break;
  }

  // en: English sentence
  for (const i of remaining) {
    if (used.has(i)) continue;
    const inner = args[i].replace(/^"|"$/g, "");
    if (/^[A-Z]/.test(inner)) {
      result.en = args[i]; used.add(i);
      break;
    }
  }

  return result;
}

const dir = path.join(process.cwd(), "src/content/vocab/groups");
let totalFixed = 0;
let totalSkipped = 0;

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
    if (args.length === 13 && isLevel(args[4])) return line; // already correct

    const r = classifyArgs(args);
    if (!r.word || !r.ipa === undefined || !r.level || !r.pos) {
      totalSkipped++;
      if (totalSkipped <= 3) console.log(`SKIP ${f}:${lineNum + 1} word=${r.word} ipa=${r.ipa} lvl=${r.level}`);
      return line;
    }

    const indent = line.slice(0, line.indexOf("c"));
    const parts = [r.word, r.ipa ?? '""', r.pos ?? '"v."', r.zh ?? '""', r.level, r.reg ?? '"neutral"', r.usage ?? '"both"', r.nuance ?? '""', r.en ?? '""', r.zh2 ?? '""', r.col ?? r.word, r.syn ?? "[]", r.ant ?? "[]"];
    fixedInFile++;
    return `${indent}cv(${parts.join(", ")}),`;
  });
  if (fixedInFile > 0) {
    fs.writeFileSync(p, outLines.join("\n"), "utf8");
    console.log(`${f}: fixed ${fixedInFile}`);
    totalFixed += fixedInFile;
  }
}
console.log("total:", totalFixed, "skipped:", totalSkipped);
