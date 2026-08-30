const fs = require("fs");
const f = "src/content/grammar/practice/grammar-practice.ts";
let s = fs.readFileSync(f, "utf8");

// Find the misplaced block (after getGrammarPracticeCoverage function) and extract it
const funcEndMarker = "return allCategories.map((cat) => ({ category: cat, covered: true }));\n}";
const funcEndIdx = s.indexOf(funcEndMarker);
if (funcEndIdx === -1) { console.log("function marker not found"); process.exit(1); }

// Extract everything after the function close to the end of misplaced entries
// Find the start of misplaced content (first "{ topicId:" after funcEnd)
const afterFuncStart = funcEndIdx + funcEndMarker.length;
const nextBrace = s.indexOf("\n", afterFuncStart);
let misplaced = "";
let cleanEnd = s.length;

// Find all consecutive misplaced entry blocks
let searchPos = afterFuncStart;
while (true) {
  const entryIdx = s.indexOf("{ topicId:", searchPos);
  if (entryIdx === -1) break;
  const entryEnd = s.indexOf("},", entryIdx);
  if (entryEnd === -1) break;
  misplaced += "\n  " + s.slice(entryIdx, entryEnd + 2);
  searchPos = entryEnd + 2;
}

if (misplaced) {
  // Remove from current position
  let clean = s;
  for (const part of misplaced.split("\n").filter(l => l.trim())) {
    clean = clean.replace(part + "\n", "").replace(part, "");
  }
  
  // Insert before the closing ]; of GRAMMAR_PRACTICE_DATA
  const arrayClose = clean.lastIndexOf("];");
  if (arrayClose > 0) {
    // Remove trailing comma issues - ensure last entry has comma
    const beforeArray = clean.slice(0, arrayClose).trimEnd();
    clean = beforeArray + ",\n" + misplaced.trim() + "\n" + clean.slice(arrayClose);
    fs.writeFileSync(f, clean, "utf8");
    console.log("Fixed: moved", misplaced.split("topicId").length - 1, "entries");
  }
} else {
  console.log("No misplaced entries found");
}
