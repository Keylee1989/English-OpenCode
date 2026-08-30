/**
 * Knowledge Model v0 - the relation graph over words & grammar points.
 *
 * NOT just storage: the Adaptive Planner and Error Analysis call these
 * queries to expand drills (confusion partners, word families) and the
 * Student Model can look up related knowledge for an item.
 *
 * Sources of truth:
 *  - lexical entries: src/content/vocab (300+ core words, Phase 2)
 *  - grammar nodes: Day 1-7 sentence patterns + authored common errors
 *  - edges: synonym/antonym/word-family from vocab data, collocations
 *    derived automatically from phrases, confusion pairs from Phonics
 */
import { ALL_LEXICAL, findLexical } from "@/content/vocab";
import { DAYS } from "@/content/days";
import { MINIMAL_PAIRS } from "@/phonics/rules";
import {
  db,
  type KnowledgeEdgeRow,
  type KnowledgeItemRow,
  type KnowledgeRelationType,
} from "@/data/db";

// ---------------------------------------------------------------------------
// Grammar nodes: day patterns + common Chinese-learner errors
// ---------------------------------------------------------------------------

export interface GrammarErrorExample {
  wrong: string;
  right: string;
  zh: string;
}

export interface GrammarPointNode {
  id: string;
  patternId: string;
  titleZh: string;
  explainZh: string;
  examples: Array<{ en: string; zh: string }>;
  /** Typical mistakes Chinese learners make with this pattern. */
  commonErrors: GrammarErrorExample[];
}

const GRAMMAR_COMMON_ERRORS: Record<string, GrammarErrorExample[]> = {
  "p:im": [
    { wrong: "I Lin.", right: "I'm Lin.", zh: "漏掉 be 动词：中文可以说“我是林”，英语必须说 I am / I'm。" },
    { wrong: "I am agree.", right: "I agree.", zh: "agree 是动词，前面不加 be。" },
  ],
  "p:your-name": [
    { wrong: "What your name?", right: "What's your name?", zh: "问句必须有 be 动词：What's = What is。" },
    { wrong: "My name Li Na.", right: "My name is Li Na.", zh: "陈述句同样不能漏 is。" },
  ],
  "p:how-old": [
    { wrong: "How old are you? I have 25.", right: "How old are you? I'm 25.", zh: "年龄用 be（I'm 25），不用 have。" },
    { wrong: "I am 25 years.", right: "I am 25 years old.", zh: "完整说法是 years old，或直接省略成数字。" },
  ],
  "p:this-is": [
    { wrong: "This is my mom. He is nice.", right: "This is my mom. She is nice.", zh: "he/she 指代必须与性别一致。" },
    { wrong: "This my dad.", right: "This is my dad.", zh: "介绍句型不能省略 is。" },
  ],
  "p:i-like": [
    { wrong: "It is reds.", right: "It is red.", zh: "颜色作表语时不用复数。" },
    { wrong: "I very like blue.", right: "I like blue very much.", zh: "very 不直接修饰动词；用 very much 放句尾。" },
  ],
  "p:i-want": [
    { wrong: "I want coffee, no please.", right: "I want a coffee, please.", zh: "礼貌请求用 please 放句尾，不用中文式“不”字结构。" },
    { wrong: "I want drink water.", right: "I want to drink water.", zh: "want 后接 to do；want drinking 是错的。" },
  ],
  "p:nice-to-meet": [
    { wrong: "Nice meet you.", right: "Nice to meet you.", zh: "固定搭配是 Nice TO meet you，不能丢 to。" },
    { wrong: "Nice to meet you too.", right: "", zh: "回答里 too 位置正确；注意别写成 meet you also。" },
  ],
};

function buildGrammarNodes(): GrammarPointNode[] {
  const nodes: GrammarPointNode[] = [];
  for (const day of DAYS) {
    const pattern = day.pattern;
    nodes.push({
      id: `g:${pattern.id}`,
      patternId: pattern.id,
      titleZh: pattern.titleZh,
      explainZh: pattern.explainZh,
      examples: pattern.examples,
      commonErrors: GRAMMAR_COMMON_ERRORS[pattern.id] ?? [],
    });
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// In-memory model (built once at module load - content is static)
// ---------------------------------------------------------------------------

export interface KnowledgeNodeIndex {
  words: number;
  grammar: number;
  edgesByRelation: Record<KnowledgeRelationType, number>;
}

function edgeKey(from: string, relation: KnowledgeRelationType, to: string): string {
  return `${from}|${relation}|${to}`;
}

const EDGES = new Map<string, KnowledgeEdgeRow>();

function addEdge(
  fromItemId: string,
  relation: KnowledgeRelationType,
  toItemId: string,
  noteZh?: string,
): void {
  if (fromItemId === toItemId) return;
  if (!findLexical(fromItemId) && !fromItemId.startsWith("g:")) return;
  if (!findLexical(toItemId) && !toItemId.startsWith("g:")) return;
  const key = edgeKey(fromItemId, relation, toItemId);
  if (EDGES.has(key)) return;
  EDGES.set(key, { edgeKey: key, fromItemId, relation, toItemId, noteZh });
}

for (const entry of ALL_LEXICAL) {
  for (const target of entry.synonymIds) addEdge(entry.id, "synonym", target);
  for (const target of entry.antonymIds) addEdge(entry.id, "antonym", target);
  // Word family: connect every member pair within the family set.
  for (let i = 0; i < entry.wordFamilyIds.length; i++) {
    for (let j = 0; j < entry.wordFamilyIds.length; j++) {
      if (i !== j) addEdge(entry.wordFamilyIds[i], "word-family", entry.wordFamilyIds[j]);
    }
    addEdge(entry.id, "word-family", entry.wordFamilyIds[i]);
  }
}

// Collocation edges derived from phrases: adjacent known word pairs.
for (const entry of ALL_LEXICAL) {
  for (const phrase of entry.collocations) {
    const tokens = phrase.toLowerCase().replace(/[^a-z\s']/g, "").split(/\s+/);
    for (let i = 0; i < tokens.length - 1; i++) {
      const a = findLexical(tokens[i]);
      const b = findLexical(tokens[i + 1]);
      if (a && b && a.id !== b.id && a.id !== entry.id && b.id !== entry.id) {
        addEdge(a.id, "collocation", b.id, phrase);
      }
    }
  }
}
// Collocations that include the head word itself link head->partner.
for (const entry of ALL_LEXICAL) {
  for (const phrase of entry.collocations) {
    const tokens = phrase.toLowerCase().replace(/[^a-z\s']/g, "").split(/\s+/);
    for (const token of tokens) {
      const partner = findLexical(token);
      if (partner && partner.id !== entry.id) {
        addEdge(entry.id, "collocation", partner.id, phrase);
      }
    }
  }
}

// Confusion pairs are mutual.
for (const pair of MINIMAL_PAIRS) {
  const aId = `w:${pair.aWord}`;
  const bId = `w:${pair.bWord}`;
  if (findLexical(aId) && findLexical(bId)) {
    addEdge(aId, "confusion-pair", bId, pair.contrastZh);
    addEdge(bId, "confusion-pair", aId, pair.contrastZh);
  }
}

export const GRAMMAR_NODES: readonly GrammarPointNode[] = buildGrammarNodes();

export function getGrammarNode(idOrPatternId: string): GrammarPointNode | null {
  const id = idOrPatternId.startsWith("g:") ? idOrPatternId : `g:${idOrPatternId}`;
  return GRAMMAR_NODES.find((node) => node.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Queries (called by Planner / Error Analysis / Student Model consumers)
// ---------------------------------------------------------------------------

/** All outgoing relations of one node. */
export function related(itemId: string): KnowledgeEdgeRow[] {
  return [...EDGES.values()].filter((edge) => edge.fromItemId === itemId);
}

/** Confusion partners of a word (minimal pairs), empty for non-words. */
export function getConfusionSet(itemId: string): string[] {
  return related(itemId)
    .filter((edge) => edge.relation === "confusion-pair")
    .map((edge) => edge.toItemId);
}

export function getWordFamily(itemId: string): string[] {
  return related(itemId)
    .filter((edge) => edge.relation === "word-family")
    .map((edge) => edge.toItemId);
}

export function getCollocationPartners(itemId: string): string[] {
  return related(itemId)
    .filter((edge) => edge.relation === "collocation")
    .map((edge) => edge.toItemId);
}

/**
 * Related items the learner has NOT mastered yet - used by the planner to
 * expand a drill into its confusion partners / family members.
 */
export async function getRelatedUnmastered(itemId: string): Promise<string[]> {
  const neighborIds = [...new Set(related(itemId).map((edge) => edge.toItemId))];
  if (neighborIds.length === 0) return [];
  const states = await db.memoryStates.bulkGet(neighborIds);
  const result: string[] = [];
  neighborIds.forEach((id, index) => {
    const state = states[index];
    if (!state || state.stage === "unseen" || state.successCount === 0) result.push(id);
  });
  return result;
}

export function knowledgeStats(): KnowledgeNodeIndex {
  const edgesByRelation = {
    synonym: 0,
    antonym: 0,
    "word-family": 0,
    collocation: 0,
    "confusion-pair": 0,
  } as Record<KnowledgeRelationType, number>;
  for (const edge of EDGES.values()) edgesByRelation[edge.relation] += 1;
  return { words: ALL_LEXICAL.length, grammar: GRAMMAR_NODES.length, edgesByRelation };
}

// ---------------------------------------------------------------------------
// Dexie persistence mirror (schema v3) - keeps export/sync complete.
// ---------------------------------------------------------------------------

export async function syncKnowledgeToDb(): Promise<{ items: number; edges: number }> {
  const items: KnowledgeItemRow[] = ALL_LEXICAL.map((entry) => ({
    id: entry.id,
    kind: "word",
    data: entry,
  }));
  for (const node of GRAMMAR_NODES) {
    items.push({ id: node.id, kind: "grammar", data: node });
  }

  await db.transaction("rw", db.knowledgeItems, db.knowledgeEdges, async () => {
    await db.knowledgeItems.clear();
    await db.knowledgeItems.bulkPut(items);
    await db.knowledgeEdges.clear();
    await db.knowledgeEdges.bulkPut([...EDGES.values()]);
  });

  return { items: items.length, edges: EDGES.size };
}

export function edgeCount(): number {
  return EDGES.size;
}
