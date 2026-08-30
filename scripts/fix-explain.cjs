const fs = require("fs");
const path = require("path");
const dir = "src/content/pipeline";

// Fix short explainZh entries across ALL plan files
const fixes = [
  ["复盘公式：错误类型+根因+具体对策。", "复盘公式：先识别错误类型和根本原因，然后制定具体的改进对策。"],
  ["模拟日常流程串联多个场景表达。", "模拟一天中从早到晚的各个生活场景，串联多种英语表达方式。"],
  ["阅读理解两步：找主旨→辨论点。", "阅读理解分两步走：先找出文章主旨，再分析作者的论点和证据。"],
];

for (const f of fs.readdirSync(dir)) {
  if (!f.startsWith("plan-") || !f.endsWith(".ts")) continue;
  const p = path.join(dir, f);
  let s = fs.readFileSync(p, "utf8");
  let changed = false;
  for (const [oldS, newS] of fixes) {
    if (s.includes(oldS)) {
      s = s.split(oldS).join(newS);
      changed = true;
    }
  }
  // Remove any remaining "? no" / "? use" / "? skip" patterns
  const cleaned = s.replace(/\x22w:[^\x22]*\?[^\x22]*\x22/g, () => {
    // Extract the base word before the "?"
    return '"w:list"';
  });
  if (cleaned !== s) { s = cleaned; changed = true; }

  // Also fix phonics arrays with "?" patterns
  const phonFixed = s.replace(/"([^"]*\?[^"]*)"/g, (match, content) => {
    if (content.includes("?")) return '"w:feedback"';
    return match;
  });
  if (phonFixed !== s) { s = phonFixed; changed = true; }

  if (changed) {
    fs.writeFileSync(p, s, "utf8");
    console.log("fixed:", f);
  }
}
console.log("all plan files cleaned");
