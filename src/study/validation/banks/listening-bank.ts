/**
 * Listening probe bank for the adaptive baseline.
 *
 * Each item is a short spoken-style transcript with ONE word blanked; the
 * learner listens (reads the transcript as the audio substitute when no audio
 * is available, clearly labeled) and types the missing word. Auto-gradable on
 * the exact key. The recognition of spoken word forms is what we sample.
 */
import type { Probe } from "./types";
import type { CefrLevel } from "@/study/validation/adaptive";

function l(
  id: string,
  band: CefrLevel,
  transcriptEn: string,
  key: string,
  tipZh: string,
): Probe {
  const blanked = transcriptEn.replace(
    new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
    "______",
  );
  return {
    id: `listening-${band}-${id}`,
    skill: "listening",
    band,
    kind: "listening-dictation",
    productive: true,
    promptEn: `（听/看口语句子，写出缺失的单词）\n${blanked}`,
    promptZh: `听或朗读上面的口语句子，填入缺失的英文单词。`,
    key: key.toLowerCase(),
    tipZh,
  };
}

type Row = [CefrLevel, string, string, string, string];

const ROWS: Row[] = [
  ["A1", "00", "Hello! My name is Anna. I am from China.", "name", "name = 名字。"],
  ["A1", "01", "I have one sister and two brothers.", "one", "one = 一。"],
  ["A1", "02", "The weather is very cold today.", "cold", "cold = 冷的。"],
  ["A2", "03", "Could you tell me the way to the station?", "station", "station = 车站。"],
  ["A2", "04", "We arrived at the hotel around nine o'clock.", "arrived", "arrive at = 到达。"],
  ["A2", "05", "Please remember to bring your passport tomorrow.", "passport", "passport = 护照。"],
  ["B1", "06", "The project was finally completed ahead of schedule.", "completed", "complete = 完成。"],
  ["B1", "07", "She suggested that we postpone the meeting until next week.", "postpone", "postpone = 推迟。"],
  ["B1", "08", "He apologized for the inconvenience caused by the delay.", "apologized", "apologize for = 为……道歉。"],
  ["B2", "09", "The committee will reconvene after reviewing the evidence.", "reconvene", "reconvene = 重新召集。"],
  ["B2", "10", "The findings corroborate earlier research in the field.", "corroborate", "corroborate = 佐证。"],
  ["B2", "11", "Management intends to implement the new policy incrementally.", "incrementally", "incrementally = 渐进地。"],
  ["C1", "12", "The opposition's objections were summarily dismissed by the chair.", "summarily", "summarily = 草率地、即席地。"],
  ["C1", "13", "The negotiators reached a tentative agreement after prolonged talks.", "tentative", "tentative = 暂定的。"],
  ["C1", "14", "Officials sought to assuage public concerns about the measure.", "assuage", "assuage = 缓和。"],
  ["C2", "15", "Intransigence on either side will only prolong this impasse.", "intransigence", "intransigence = 顽固、不让步。"],
  ["C2", "16", "The auditor flagged several discrepancies that warrant immediate scrutiny.", "scrutiny", "scrutiny = 审查、细察。"],
  ["C2", "17", "The policy was predicated on an assumption that has since been refuted.", "predicated", "be predicated on = 以……为前提。"],
];

export const LISTENING_BANK: Probe[] = ROWS.map((row, i) =>
  l(String(i).padStart(2, "0"), row[0], row[1], row[2], row[3]),
);

export function listeningBankForBand(band: CefrLevel): Probe[] {
  return LISTENING_BANK.filter((p) => p.band === band);
}
