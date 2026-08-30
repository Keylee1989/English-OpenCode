import type { DayContent } from "@/content/types";

/** Day 7 - Week 1 review: nice/meet/you/too/good + Nice to meet you. */
export const day7: DayContent = {
  day: 7,
  titleEn: "Nice to Meet You!",
  titleZh: "第 7 天 · 第一周大复习",
  goalZh: "学会初次见面的完整寒暄，并复习第 1-6 天全部内容。",
  vocab: [
    {
      id: "w:nice",
      word: "nice",
      zh: "好的；令人愉快的",
      ipa: "/naɪs/",
      pos: "adj. 形容词",
      example: { en: "Nice to meet you!", zh: "很高兴认识你！" },
      difficulty: 0.2,
      phonicsHintZh: "ni- 读 /naɪ/（“耐”），结尾 s 在这里发 /s/。",
    },
    {
      id: "w:meet",
      word: "meet",
      zh: "见面；结识",
      ipa: "/miːt/",
      pos: "v. 动词",
      example: { en: "Come and meet my family.", zh: "来见见我的家人。" },
      difficulty: 0.25,
      phonicsHintZh: "ee 是长音 /iː/，读“米特”但拖长。和 meat（肉）同音。",
    },
    {
      id: "w:you",
      word: "you",
      zh: "你；你们",
      ipa: "/juː/",
      pos: "pron. 代词",
      example: { en: "How are you?", zh: "你好吗？" },
      difficulty: 0.15,
      phonicsHintZh: "读“尤”，长音 /uː/。口语弱读时听起来像 /jə/。",
    },
    {
      id: "w:too",
      word: "too",
      zh: "也",
      ipa: "/tuː/",
      pos: "adv. 副词",
      example: { en: "Me too.", zh: "我也是。" },
      difficulty: 0.2,
      phonicsHintZh: "和 two（Day 3）完全同音！oo 长音 /uː/。",
    },
    {
      id: "w:good",
      word: "good",
      zh: "好的",
      ipa: "/ɡʊd/",
      pos: "adj. 形容词",
      example: { en: "Have a good day!", zh: "祝你今天愉快！" },
      difficulty: 0.2,
      phonicsHintZh: "oo 这里是短音 /ʊ/（像“古”），不是长音。good 和 food 的 oo 发音不同！",
    },
  ],
  pattern: {
    id: "p:nice-to-meet",
    titleZh: "句型：Nice to meet you. — Nice to meet you, too.",
    explainZh:
      "初次见面必用：A: Nice to meet you.（很高兴认识你。）B: 回答加 too：Nice to meet you, too." +
      "把第一周学的串起来就是一段真实对话：" +
      "Hi! I'm Lin. — Nice to meet you! I'm Amy. — How old are you? — I'm thirty. And you?",
    examples: [
      { en: "Nice to meet you.", zh: "很高兴认识你。" },
      { en: "Nice to meet you, too.", zh: "我也很高兴认识你。" },
      { en: "Have a good day!", zh: "祝你今天愉快！" },
    ],
    practiceSentences: [
      { en: "Nice to meet you.", zh: "很高兴认识你。" },
      { en: "Nice to meet you, too.", zh: "我也很高兴认识你。" },
      { en: "Have a good day!", zh: "祝你今天愉快！" },
    ],
  },
  phonicsNoteZh:
    "本周拼读小结：/aɪ/ 出现在 hi·my·five·nice 里；/iː/ 出现在 he·she·tea·meet 里；" +
    "/θ/ 出现在 thanks·three 里。同一发音反复出现——这就是自然拼读的规律性，继续积累。",
};
