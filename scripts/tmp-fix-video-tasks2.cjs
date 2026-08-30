const fs = require("fs");
const f = "src/content/resources/video-library.ts";
let s = fs.readFileSync(f, "utf8");

// Find all tasksZh arrays with only 2 items and add a third
const re = /tasksZh: \[([^\]]+)\]/g;
let match;
const fixes = [];
while ((match = re.exec(s)) !== null) {
  const inner = match[1];
  const count = (inner.match(/"/g) || []).length / 2;
  if (count < 3) {
    fixes.push({ full: match[0], inner, count });
  }
}

for (const fix of fixes) {
  const items = fix.inner.split(",").map(x => x.trim());
  // Add a third generic task based on context
  let third;
  if (fix.inner.includes("总结") || fix.inner.includes("summary")) {
    third = '"写50词学习心得并朗读"';
  } else if (fix.inner.includes("记录") || fix.inner.includes("记下")) {
    third = '"写50词分析笔记并自评"';
  } else {
    third = '"写50词反思笔记并准备讨论问题"';
  }
  const newInner = fix.inner + ", " + third;
  s = s.replace(fix.full.replace(/[[\]]/g, "\\$&").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 
    "tasksZh: [" + newInner + "]");
}

fs.writeFileSync(f, s, "utf8");
console.log("Fixed", fixes.length, "entries");
