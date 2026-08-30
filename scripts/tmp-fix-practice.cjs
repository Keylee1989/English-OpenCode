/**
 * Deduplicate grammar-practice.ts and add missing topics.
 * Keeps first occurrence of each topicId, removes rest.
 * Then adds stubs for any missing C2 grammar topics.
 */
const fs = require("fs");
const f = "src/content/grammar/practice/grammar-practice.ts";
let s = fs.readFileSync(f, "utf8");

// Step 1: Remove duplicate topic blocks
// Find all topic blocks like { topicId: "...", ... ]}
const blockRe = /\{ topicId: "([^"]+)",[\s\S]*?\]\},\n/g;
let match;
let seen = new Set();
const blocks = [];
let lastEnd = 0;

// Parse manually by finding { topicId markers
const lines = s.split("\n");
const cleanedLines = [];
const seenIds = new Set();
let inBlock = false;
let blockBuffer = [];
let removedDupes = 0;

for (const line of lines) {
  if (line.includes("{ topicId:") && !inBlock) {
    const m = line.match(/topicId:\s*"([^"]+)"/);
    if (m) {
      if (seenIds.has(m[1])) {
        // Skip this entire block until we hit ]},
        inBlock = true;
        removedDupes++;
        continue;
      }
      seenIds.add(m[1]);
    }
  }
  if (inBlock) {
    if (line.trim() === "]}," || line.trim() === "]}") {
      inBlock = false;
    }
    continue;
  }
  cleanedLines.push(line);
}

s = cleanedLines.join("\n");
console.log("Removed", removedDupes, "duplicate blocks");

// Step 2: Add missing topics as compact entries
const MISSING = [
  ["compound-complex-sentences", "sentence-structure"],
  ["progressive-aspect-grid", "verb-system"],
  ["future-forms-comparison", "verb-system"],
  ["modal-verbs-nuance", "verb-system"],
  ["noun-clauses", "advanced-clauses"],
  ["reduced-relative-clauses", "advanced-clauses"],
  ["adverb-clause-reduction", "advanced-clauses"],
  ["passive-infinitive-gerund", "passive-system"],
  ["reporting-passive-it-construction", "passive-system"],
  ["cohesion-devices", "academic-writing"],
  ["parallelism-rules", "academic-writing"],
  ["fronting-and-ellipsis", "advanced-structures"],
  ["discourse-markers-academic", "advanced-structures"],
];

const STUBS = {
  "compound-complex-sentences": [
    { level: 1, promptZh: "识别并列复合句", promptEn: "Revenue grew, and margins improved because costs dropped.", options: ["Simple", "Compound-complex"], answer: "Compound-complex", explanationZh: "两个独立分句+一个从句。" },
    { level: 2, promptZh: "找错误", promptEn: "Revenue grew and margins improved, because costs dropped.", answer: "Remove comma before because (subordinating conjunction doesn't need one here).", explanationZh: "从属连词前不需要逗号。" },
  ],
  "progressive-aspect-grid": [
    { level: 1, promptZh: "选时态", promptEn: "She ___ been reviewing since Monday.", options: ["have", "has", "had"], answer: "has", explanationZh: "has been + V-ing 表持续至今。" },
    { level: 2, promptZh: "找错误", promptEn: "I am knowing the answer.", answer: "am knowing → know (state verbs don't use progressive)", explanationZh: "状态动词不用进行体。" },
  ],
  "future-forms-comparison": [
    { level: 1, promptZh: "选最佳将来形式", promptEn: "The train ___ at noon (scheduled).", options: ["will leave", "leaves", "is leaving"], answer: "leaves", explanationZh: "时刻表性未来用一般现在时。" },
    { level: 2, promptZh: "辨析", promptEn: "What's the difference between 'I will help' and 'I'm helping tomorrow'?", answer: "'will' = spontaneous offer; 'am helping' = pre-existing arrangement.", explanationZh: "will=临时决定；进行时=已有安排。" },
  ],
  "modal-verbs-nuance": [
    { level: 1, promptZh: "按力度排序", promptEn: "Order from weakest to strongest: must / could / should.", answer: "could < should < must", explanationZh: "could < should < must 是力度递增。" },
    { level: 2, promptZh: "选最佳 hedging", promptEn: "The delay ___ reflect seasonal demand. (weak speculation)", options: ["must", "should", "might"], answer: "might", explanationZh: "might 表最弱推测。" },
  ],
  "noun-clauses": [
    { level: 1, promptZh: "识别名词从句", promptEn: "Whether we proceed depends on funding.", options: ["Whether we proceed depends on funding.", "We proceed on funding."], answer: "Whether we proceed depends on funding.", explanationZh: "whether 从句作主语。" },
    { level: 2, promptZh: "找错误", promptEn: "If we go depends on the weather.", answer: "If → Whether (subject position requires whether)", explanationZh: "主语位置只能用 whether 不用 if。" },
  ],
  "reduced-relative-clauses": [
    { level: 1, promptZh: "缩略定语从句", promptEn: "Anyone who wishes to apply...", answer: "Anyone wishing to apply...", explanationZh: "who + V → V-ing。" },
    { level: 2, promptZh: "被动缩略", promptEn: "Systems which were installed last year...", answer: "Systems installed last year...", explanationZh: "which were + V3 → V3。" },
  ],
  "adverb-clause-reduction": [
    { level: 1, promptZh: "缩略状语从句", promptEn: "While she was reviewing data, she found an anomaly.", answer: "While reviewing data, she found an anomaly.", explanationZh: "主从句主语一致时可省 be + V-ing。" },
    { level: 2, promptZh: "判断垂悬修饰", promptEn: "While reviewing data, the anomaly appeared. Correct?", answer: "No — dangling modifier (the anomaly didn't review data)", explanationZh: "从句逻辑主语必须与主句一致。" },
  ],
  "passive-infinitive-gerund": [
    { level: 1, promptZh: "被动不定式", promptEn: "The report needs ___ before Friday.", options: ["to revise", "to be revised"], answer: "to be revised", explanationZh: "needs to be done = 需要被做。" },
    { level: 2, promptZh: "被动动名词", promptEn: "He resents people micromanaging him.", answer: "He resents being micromanaged.", explanationZh: "being + V3 被动动名词。" },
  ],
  "reporting-passive-it-construction": [
    { level: 1, promptZh: "选择报道性被动", promptEn: "___ estimated that costs will rise.", options: ["It is", "There is"], answer: "It is", explanationZh: "It is estimated that... 固定句式。" },
    { level: 2, promptZh: "改为 S + passive + to", promptEn: "People believe the firm is for sale.", answer: "The firm is believed to be for sale.", explanationZh: "S + passive + to V 结构。" },
  ],
  "cohesion-devices": [
    { level: 1, promptZh: "选衔接词", promptEn: "This approach reduces variance. ___, it improves reliability.", options: ["Moreover", "However"], answer: "Moreover", explanationZh: "Moreover 表递进。" },
    { level: 2, promptZh: "改进回指", promptEn: "Improve: 'This helps.' (vague this)", answer: "This approach helps reduce variance.", explanationZh: "this 后跟名词消除歧义。" },
  ],
  "parallelism-rules": [
    { level: 1, promptZh: "找不对称项", promptEn: "reading, writing, and to think critically", options: ["reading", "writing", "to think critically"], answer: "to think critically", explanationZh: "应改为 thinking critically 保持对称。" },
    { level: 2, promptZh: "改正", promptEn: "Fix: 'She likes hiking, to swim, and biking.'", answer: "She likes hiking, swimming, and biking.", explanationZh: "统一为动名词。" },
  ],
  "fronting-and-ellipsis": [
    { level: 1, promptZh: "识别前置", promptEn: "To the budget we must add legal fees.", options: ["Fronting", "Passive", "Cleft"], answer: "Fronting", explanationZh: "补语提前制造焦点。" },
    { level: 2, promptZh: "省略练习", promptEn: "'Some prefer tea; others ___ coffee.' Fill in.", answer: "prefer (ellipsis omits repeated verb)", explanationZh: "省去重复动词使行文紧凑。" },
  ],
  "discourse-markers-academic": [
    { level: 1, promptZh: "选衔接词", promptEn: "Small sample. ___, trend held.", options: ["However", "Furthermore", "Thus"], answer: "However", explanationZh: "However 承认局限后转折。" },
    { level: 2, promptZh: "正式化", promptEn: "'But data limited.' formal version?", answer: "Nonetheless, the data was limited.", explanationZh: "Nonetheless 更正式。" },
  ],
};

// Insert stubs before the closing ];
let insertIdx = s.lastIndexOf("];");
if (insertIdx === -1) {
  fail("Cannot find array closing");
  process.exit(1);
}
let addedCount = 0;
const insertParts = [];
for (const [id, cat] of MISSING) {
  if (!s.includes(`topicId: "${id}"`)) {
    const exercises = STUBS[id] ?? [
      { level: 1, promptZh: `Practice ${id}`, promptEn: `Practice exercise for ${id}.`, answer: "See explanation.", explanationZh: "练习说明。" },
      { level: 2, promptZh: `Advanced ${id}`, promptEn: `Advanced exercise for ${id}.`, answer: "See explanation.", explanationZh: "进阶练习。" },
    ];
    const exStr = exercises.map(ex =>
      `{ level: ${ex.level}, promptZh: "${ex.promptZh}", promptEn: "${ex.promptEn}", answer: "${ex.answer.replace(/"/g, '\\"')}", explanationZh: "${ex.explanationZh}" }`
    ).join(", ");
    insertParts.push(`  { topicId: "${id}", category: "${cat}", exercises: [${exStr}] },`);
    addedCount++;
  }
}

if (insertParts.length > 0) {
  s = s.slice(0, insertIdx) + "\n" + insertParts.join("\n") + "\n" + s.slice(insertIdx);
}

fs.writeFileSync(f, s, "utf8");
console.log("Added", addedCount, "missing topic stubs");
console.log("Done");

function fail(msg) {
  console.error("ERROR:", msg);
  process.exit(1);
}
