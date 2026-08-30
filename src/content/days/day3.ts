import type { DayContent } from "@/content/types";

/** Day 3 - Numbers 1-5 & age: one..five/old + How old are you? */
export const day3: DayContent = {
  day: 3,
  titleEn: "Numbers & Age",
  titleZh: "第 3 天 · 数字与年龄",
  goalZh: "学会数字 one 到 five，能问、说年龄。",
  vocab: [
    {
      id: "w:one",
      word: "one",
      zh: "一",
      ipa: "/wʌn/",
      pos: "num. 数词",
      example: { en: "One coffee, please.", zh: "请给我一杯咖啡。" },
      difficulty: 0.25,
      phonicsHintZh: "注意！one 读“万”/wʌn/，o 在这里不读 /oʊ/。这是最常见的例外之一。",
    },
    {
      id: "w:two",
      word: "two",
      zh: "二",
      ipa: "/tuː/",
      pos: "num. 数词",
      example: { en: "Two teas, please.", zh: "请给我两杯茶。" },
      difficulty: 0.25,
      phonicsHintZh: "w 不发音，直接读“图”/tuː/，oo 是长音。",
    },
    {
      id: "w:three",
      word: "three",
      zh: "三",
      ipa: "/θriː/",
      pos: "num. 数词",
      example: { en: "I have three kids.", zh: "我有三个孩子。" },
      difficulty: 0.4,
      phonicsHintZh: "th 咬舌 /θ/（舌尖放在齿间），ree 长音 /iː/。不要读成“斯里”。",
    },
    {
      id: "w:four",
      word: "four",
      zh: "四",
      ipa: "/fɔːr/",
      pos: "num. 数词",
      example: { en: "The same four words.", zh: "同样的四个词。" },
      difficulty: 0.2,
      phonicsHintZh: "f 上齿咬下唇送气；our 读 /ɔːr/（“奥儿”）。",
    },
    {
      id: "w:five",
      word: "five",
      zh: "五",
      ipa: "/faɪv/",
      pos: "num. 数词",
      example: { en: "Give me five!", zh: "击个掌！" },
      difficulty: 0.2,
      phonicsHintZh: "fi- 读 /faɪ/（“法爱”连读），结尾 v 要上齿咬下唇并震动。",
    },
    {
      id: "w:old",
      word: "old",
      zh: "……岁的；老的",
      ipa: "/oʊld/",
      pos: "adj. 形容词",
      example: { en: "My dad is sixty years old.", zh: "我爸爸六十岁。" },
      difficulty: 0.25,
      phonicsHintZh: "读“欧尔德”，l 在 old 里要发出来：/oʊ-l-d/ 三段连起来。",
    },
  ],
  pattern: {
    id: "p:how-old",
    titleZh: "句型：How old are you? / I'm ___ years old.",
    explainZh:
      "问年龄：How old are you?（你多大了？）。回答用 I'm + 数字 + years old." +
      "口语里经常省略 years old，直接说 I'm twenty-five.（我 25。）" +
      "注意 I'm 一词两用：I'm Lin.（名字）和 I'm 30.（年龄）都成立。",
    examples: [
      { en: "How old are you?", zh: "你多大了？" },
      { en: "I'm twenty-five years old.", zh: "我 25 岁。" },
      { en: "I'm thirty.", zh: "我 30。" },
    ],
    practiceSentences: [
      { en: "How old are you?", zh: "你多大了？" },
      { en: "I'm twenty-five years old.", zh: "我 25 岁。" },
      { en: "I'm thirty years old.", zh: "我 30 岁。" },
    ],
  },
  phonicsNoteZh:
    "今天重点音：th /θ/（three）。中文没有这个音，方法是：舌尖轻轻放在上下牙之间吹气，" +
    "声带不震动。对比 thanks /θæŋks/（Day 1）— 同样的舌位。",
};
