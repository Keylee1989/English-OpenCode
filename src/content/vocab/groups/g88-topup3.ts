import { v } from "@/content/vocab/builder";
import type { VocabRow } from "@/content/vocab/types";

/** Top-up 3 - final gap-fill surfaced by Day 31-90 reference checks. */
export const topup3Rows: VocabRow[] = [
  v("visit", "/拜访；参观", "/ˈvɪzɪt/", "n./v.", 1, 0.05, "We pay grandma a visit every Sunday.", "我们每周日去看望奶奶。", "a return visit"),
  v("stay", "/停留；暂住；保持", "/steɪ/", "v./n.", 1, 0.05, "Stay hydrated on hot days.", "热天要保持补水。", "stay for dinner"),
  v("knowledge", "/知识；学问", "/ˈkɑːnɪdʒ/", "n.", 1, 0.15, "Knowledge grows when shared.", "知识越分享越丰富。", "a thirst for knowledge"),
];
