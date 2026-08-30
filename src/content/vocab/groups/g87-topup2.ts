import { v } from "@/content/vocab/builder";
import type { VocabRow } from "@/content/vocab/types";

/** Top-up 2 - high-frequency words surfaced by the Day 31-90 lessons. */
export const topup2Rows: VocabRow[] = [
  v("progress-n", "/进步；进展", "/ˈprɑːɡres/", "n./v.", 1, 0.15, "Check your progress every Sunday.", "每周日检查你的进度。", "make steady progress"),
  v("practice-n", "/练习；惯例", "/ˈpræktɪs/", "n./v.", 1, 0.1, "Practice makes perfect, they say.", "人们说熟能生巧。", "out of practice"),
  v("improve-upon", "/改进；提高", "/ɪmˈpruːv/", "v.", 1, 0.1, "Improve one small thing each day.", "每天改进一件小事。", "improve your chances"),
];
