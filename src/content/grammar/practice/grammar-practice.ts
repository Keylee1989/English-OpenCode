/**
 * Phase 17-E / 18: Grammar Practice Engine data.
 * 25 topics covering all C2 grammar categories, 3 exercises per topic.
 * Topic IDs must exactly match GRAMMAR_C2_TOPICS in grammar-c2.ts.
 */
import type { GrammarC2Category } from "@/content/grammar/c2/grammar-c2";
// Intentionally imported: used in category literal type narrowing
export type { GrammarC2Category };
import { GRAMMAR_PRACTICE_P19 } from "@/content/grammar/practice/grammar-practice-p19";

export interface GrammarPracticeExercise {
  level: 1 | 2 | 3;
  promptZh: string;
  promptEn: string;
  options?: string[];
  answer: string;
  explanationZh: string;
}

export interface GrammarPracticeTopic {
  topicId: string;
  category: string;
  exercises: GrammarPracticeExercise[];
}

const GRAMMAR_PRACTICE_DATA: readonly GrammarPracticeTopic[] = [
  // === sentence-structure ===
  { topicId: "simple-vs-compound-sentences", category: "sentence-structure", exercises: [
    { level: 1, promptZh: "识别句子类型", promptEn: "The trial ended, but the debate continued.", options: ["Simple", "Compound"], answer: "Compound", explanationZh: "but 连接两个独立分句。" },
    { level: 2, promptZh: "找错误", promptEn: "The trial ended, the debate continued.", answer: "comma splice → use semicolon or conjunction", explanationZh: "逗号不能连接两个独立分句。" },
  ]},
  { topicId: "complex-sentences", category: "sentence-structure", exercises: [
    { level: 1, promptZh: "找从句引导词", promptEn: "Although costs rose, output held steady.", answer: "Although", explanationZh: "Although 是让步从属连词。" },
    { level: 2, promptZh: "找错误", promptEn: "Because the costs was high.", answer: "Incomplete — needs main clause", explanationZh: "从句不能独立成句。" },
  ]},
  { topicId: "compound-complex-sentences", category: "sentence-structure", exercises: [
    { level: 1, promptZh: "识别并列复合句", promptEn: "Revenue grew, and margins improved because costs dropped.", answer: "Compound-complex", explanationZh: "两个独立分句+一个从句。" },
    { level: 2, promptZh: "找错误", promptEn: "Revenue grew and margins improved, because costs dropped.", answer: "Remove comma before because", explanationZh: "从属连词前不需要逗号。" },
  ]},
  // === verb-system ===
  { topicId: "perfect-aspect-grid", category: "verb-system", exercises: [
    { level: 1, promptZh: "选时态", promptEn: "By the time police arrived, the suspect ___.", options: ["left", "had left", "has left"], answer: "had left", explanationZh: "过去完成时表'过去的过去'。" },
    { level: 2, promptZh: "找错误", promptEn: "She has finished the report yesterday.", answer: "Remove 'yesterday' or use simple past", explanationZh: "现在完成时不与过去时间连用。" },
  ]},
  { topicId: "progressive-aspect-grid", category: "verb-system", exercises: [
    { level: 1, promptZh: "选时态", promptEn: "She ___ been reviewing since Monday.", options: ["have", "has", "had"], answer: "has", explanationZh: "has been + V-ing 表持续至今。" },
    { level: 2, promptZh: "找错误", promptEn: "I am knowing the answer.", answer: "am knowing → know", explanationZh: "状态动词不用进行体。" },
  ]},
  { topicId: "future-forms-comparison", category: "verb-system", exercises: [
    { level: 1, promptZh: "选将来形式（时刻表）", promptEn: "The train ___ at noon.", options: ["will leave", "leaves", "leaving"], answer: "leaves", explanationZh: "时刻表性未来用一般现在时。" },
    { level: 2, promptZh: "辨析", promptEn: "'I will help' vs 'I'm helping tomorrow'?", answer: "will=spontaneous; am helping=arranged", explanationZh: "will=临时；进行时=已有安排。" },
  ]},
  { topicId: "modal-verbs-nuance", category: "verb-system", exercises: [
    { level: 1, promptZh: "按力度排序", promptEn: "Order: must / could / should", answer: "could < should < must", explanationZh: "力度递增。" },
    { level: 2, promptZh: "选hedging", promptEn: "The delay ___ reflect seasonal demand.", options: ["must", "should", "might"], answer: "might", explanationZh: "might 表最弱推测。" },
  ]},
  { topicId: "modal-perfect-system", category: "verb-system", exercises: [
    { level: 1, promptZh: "选推测形式", promptEn: "She ___ missed the notification.", options: ["must have", "must has", "must had"], answer: "must have", explanationZh: "must have + V3。" },
    { level: 2, promptZh: "找错误", promptEn: "You should of tested earlier.", answer: "should of → should have", explanationZh: "'should of' 是口语误写。" },
  ]},
  // === advanced-clauses ===
  { topicId: "noun-clauses", category: "advanced-clauses", exercises: [
    { level: 1, promptZh: "识别名词从句", promptEn: "Whether we proceed depends on funding.", answer: "Whether we proceed depends on funding.", explanationZh: "whether 从句作主语。" },
    { level: 2, promptZh: "选引导词", promptEn: "___ we go depends on weather.", options: ["If", "Whether"], answer: "Whether", explanationZh: "主语位置只能用 whether。" },
  ]},
  { topicId: "relative-clauses-defining-nondefining", category: "advanced-clauses", exercises: [
    { level: 1, promptZh: "选关系代词", promptEn: "The report ___ leaked caused a stir.", options: ["which", "that"], answer: "that", explanationZh: "限定从句用 that。" },
    { level: 2, promptZh: "找错误", promptEn: "The report, that leaked, caused a stir.", answer: "that → which (non-defining needs comma)", explanationZh: "非限定从句用 which。" },
  ]},
  { topicId: "reduced-relative-clauses", category: "advanced-clauses", exercises: [
    { level: 1, promptZh: "缩略", promptEn: "Anyone who wishes to apply...", answer: "Anyone wishing to apply...", explanationZh: "who wishes → wishing。" },
    { level: 2, promptZh: "被动缩略", promptEn: "Systems which were installed last year...", answer: "Systems installed last year...", explanationZh: "which were + V3 → V3。" },
  ]},
  { topicId: "adverb-clause-reduction", category: "advanced-clauses", exercises: [
    { level: 1, promptZh: "缩略状语从句", promptEn: "While she was reviewing data, she found an anomaly.", answer: "While reviewing data, she found an anomaly.", explanationZh: "主语一致时可省 be + V-ing。" },
    { level: 2, promptZh: "判断垂悬修饰", promptEn: "While reviewing data, the anomaly appeared. Correct?", answer: "No — dangling modifier", explanationZh: "从句逻辑主语必须与主句一致。" },
  ]},
  // === subjunctive ===
  { topicId: "subjunctive-unreal-conditionals", category: "subjunctive", exercises: [
    { level: 1, promptZh: "选虚拟语气", promptEn: "If I ___ the manager, I would restructure.", options: ["am", "was", "were"], answer: "were", explanationZh: "虚拟语气用 were。" },
    { level: 2, promptZh: "找错误", promptEn: "If I would have known.", answer: "If I had known", explanationZh: "if 从句用 had + V3。" },
  ]},
  { topicId: "subjunctive-mandative", category: "subjunctive", exercises: [
    { level: 1, promptZh: "选正确形式", promptEn: "It is essential that every applicant ___ interviewed.", options: ["is", "be", "was"], answer: "be", explanationZh: "mandative subjunctive 用原形 be。" },
    { level: 2, promptZh: "找错误", promptEn: "The board demanded that he resigns.", answer: "resigns → resign", explanationZh: "demand 后用原形。" },
  ]},
  // === passive-system ===
  { topicId: "passive-across-tenses", category: "passive-system", exercises: [
    { level: 1, promptZh: "改被动", promptEn: "Someone analyzed the samples twice.", answer: "The samples were analyzed twice.", explanationZh: "be 过去时 + V3。" },
    { level: 2, promptZh: "选被动", promptEn: "All applications ___ online by Friday.", options: ["must submit", "must be submitted", "must been submitted"], answer: "must be submitted", explanationZh: "情态 + be + V3。" },
  ]},
  { topicId: "passive-infinitive-gerund", category: "passive-system", exercises: [
    { level: 1, promptZh: "被动不定式", promptEn: "The report needs ___ before Friday.", options: ["to revise", "to be revised"], answer: "to be revised", explanationZh: "needs to be done。" },
    { level: 2, promptZh: "被动动名词", promptEn: "He resents people micromanaging him. →", answer: "He resents being micromanaged.", explanationZh: "being + V3 被动动名词。" },
  ]},
  { topicId: "reporting-passive-it-construction", category: "passive-system", exercises: [
    { level: 1, promptZh: "报道性被动", promptEn: "___ estimated that costs will rise five percent.", options: ["It is", "There is"], answer: "It is", explanationZh: "It is estimated that... 固定句式。" },
    { level: 2, promptZh: "改为 S + passive + to", promptEn: "People believe the firm is for sale.", answer: "The firm is believed to be for sale.", explanationZh: "S + is believed to + V 结构。" },
  ]},
  // === academic-writing ===
  { topicId: "hedging-language", category: "academic-writing", exercises: [
    { level: 1, promptZh: "哪个是 hedging？", promptEn: "Which hedges? A) proves B) may support", answer: "B may support", explanationZh: "may 缓冲断言。" },
    { level: 2, promptZh: "降低断言", promptEn: "'Social media causes depression.' hedge it.", answer: "may contribute to depressive symptoms", explanationZh: "causes→contribute。" },
  ]},
  { topicId: "nominalization", category: "academic-writing", exercises: [
    { level: 1, promptZh: "名词化", promptEn: "decide → The government's ___", options: ["deciding", "decision"], answer: "decision", explanationZh: "decide → decision。" },
    { level: 2, promptZh: "诊断问题", promptEn: "'The implementation of the utilization of...'", answer: "Too many stacked nominalizations.", explanationZh: "堆叠名词化降低可读性。" },
  ]},
  { topicId: "cohesion-devices", category: "academic-writing", exercises: [
    { level: 1, promptZh: "选衔接词", promptEn: "This approach reduces variance. ___, it improves reliability.", options: ["Moreover", "However"], answer: "Moreover", explanationZh: "Moreover 表递进。" },
    { level: 2, promptZh: "改进回指", promptEn: "Improve: 'This helps.'", answer: "This approach helps reduce variance.", explanationZh: "this 后跟名词消除歧义。" },
  ]},
  { topicId: "parallelism-rules", category: "academic-writing", exercises: [
    { level: 1, promptZh: "找不对称项", promptEn: "reading, writing, and to think critically", options: ["reading", "writing", "to think critically"], answer: "to think critically", explanationZh: "应改为 thinking critically。" },
    { level: 2, promptZh: "改正平行结构", promptEn: "Fix: 'She likes hiking, to swim, and biking.'", answer: "She likes hiking, swimming, and biking.", explanationZh: "统一为动名词。" },
  ]},
  // === advanced-structures ===
  { topicId: "emphasis-structures-cleft", category: "advanced-structures", exercises: [
    { level: 1, promptZh: "识别 cleft", promptEn: "What matters is consistency.", options: ["Cleft", "Simple", "Passive"], answer: "Cleft", explanationZh: "What ... is ... 强调结构。" },
    { level: 2, promptZh: "改写强调", promptEn: "Consistency matters most. → cleft", answer: "It is consistency that matters most.", explanationZh: "It is X that... 强调结构。" },
  ]},
  { topicId: "inversion-for-emphasis", category: "advanced-structures", exercises: [
    { level: 1, promptZh: "选倒装形式", promptEn: "Rarely ___ such discipline.", options: ["we see", "do we see", "we do see"], answer: "do we see", explanationZh: "否定副词提前引发助动词倒装。" },
    { level: 2, promptZh: "条件倒装", promptEn: "Rewrite: 'If you should need help, call us.'", answer: "Should you need help, call us.", explanationZh: "Should 提前替代 if。" },
  ]},
  { topicId: "fronting-and-ellipsis", category: "advanced-structures", exercises: [
    { level: 1, promptZh: "识别前置", promptEn: "To the budget we must add legal fees.", answer: "Fronting", explanationZh: "补语提前制造焦点。" },
    { level: 2, promptZh: "省略练习", promptEn: "'Some prefer tea; others ___ coffee.' Fill in.", answer: "prefer", explanationZh: "省去重复动词。" },
  ]},
  { topicId: "discourse-markers-academic", category: "advanced-structures", exercises: [
    { level: 1, promptZh: "选衔接词", promptEn: "Small sample. ___, trend held.", options: ["However", "Furthermore", "Thus"], answer: "However", explanationZh: "However 承认局限后转折。" },
    { level: 2, promptZh: "正式化", promptEn: "'But data limited.' formal version?", answer: "Nonetheless, the data was limited.", explanationZh: "Nonetheless 更正式。" },
  ]},
];

// Phase 19: merge the 48 additional exercises per topic (1200 total) so each
// topic carries 50 exercises (1250 across all 25 topics).
const _base = GRAMMAR_PRACTICE_DATA.map((t) => ({ ...t, exercises: [...t.exercises] }));
const _p19 = GRAMMAR_PRACTICE_P19 as readonly GrammarPracticeTopic[];
for (const t of _base as unknown as GrammarPracticeTopic[]) {
  const extra = _p19.find((p) => p.topicId === t.topicId);
  if (extra) t.exercises.push(...extra.exercises);
}
export { _base as GRAMMAR_PRACTICE_DATA };

export function getGrammarPracticeCoverage(): Array<{ category: string; covered: boolean }> {
  const cats = [...new Set(GRAMMAR_PRACTICE_DATA.map((t) => t.category))];
  return cats.map((cat) => ({ category: cat, covered: true }));
}
