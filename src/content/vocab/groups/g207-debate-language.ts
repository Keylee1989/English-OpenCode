import { cv } from "@/content/vocab/c2-types";

/** Phase 16-A · g207 Debate Language — 辩论语言（topic: debate-language）. */
export const debateLanguageRows = [
  cv("point-of-information-raised", "/point of information raised/", "n.", "质询环节（辩论术语）", "C2", "formal", "spoken", "POI，对方演讲中可站起提问；英式议会制辩论核心机制", "On that point, the evidence contradicts you.", "就这一点而言，证据与你的说法矛盾。", "raise a point of information", [], [], { topic: "debate-language" }),
  cv("burden-of-proof-reversal-tactic", "/burden of proof reversal tactic/", "phr.", "举证责任反转策略", "C2", "formal", "both", "要求对方先证伪己方默认立场；常用于政策辩", "Shift the burden of proof onto your opponent.", "把举证责任推给对手。", "reversing the burden of proof is a tactic", [], [], { topic: "debate-language" }),
  cv("strawman-fallacy-label-misrepresentation", "/ˈstrɔːmæn/", "idi.", "稻草人谬误标签", "C2", "academic", "both", "歪曲对方观点使其容易被攻击；与 steelman 相对", "That's a strawman; I never said that.", "那是稻草人谬误，我从没那样说过。", "accuse sb of building a strawman", [], [], { topic: "debate-language" }),
];
