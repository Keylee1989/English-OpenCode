import type { DayContent } from "@/content/types";

/** Day 5 - Colors: color/red/blue/green/white/black + It is ___. / I like ___. */
export const day5: DayContent = {
  day: 5,
  titleEn: "Colors",
  titleZh: "第 5 天 · 颜色与喜好",
  goalZh: "认识 6 个高频颜色词，能说“它是什么颜色”和“我喜欢什么”。",
  vocab: [
    {
      id: "w:color",
      word: "color",
      zh: "颜色",
      ipa: "/ˈkʌlər/",
      pos: "n. 名词",
      example: { en: "What color is it?", zh: "它是什么颜色？" },
      difficulty: 0.3,
      phonicsHintZh: "重音在前：KU-lər。美音拼法是 color（英式 colour 多一个 u，读音相同）。",
    },
    {
      id: "w:red",
      word: "red",
      zh: "红色",
      ipa: "/red/",
      pos: "n./adj.",
      example: { en: "The car is red.", zh: "这辆车是红色的。" },
      difficulty: 0.15,
      phonicsHintZh: "短促的 /rɛd/，e 嘴半开。别拖长。",
    },
    {
      id: "w:blue",
      word: "blue",
      zh: "蓝色",
      ipa: "/bluː/",
      pos: "n./adj.",
      example: { en: "I like blue.", zh: "我喜欢蓝色。" },
      difficulty: 0.2,
      phonicsHintZh: "b 爆破 + l + 长音 /uː/（“布鲁”连快一点）。",
    },
    {
      id: "w:green",
      word: "green",
      zh: "绿色",
      ipa: "/ɡriːn/",
      pos: "n./adj.",
      example: { en: "The light is green.", zh: "灯是绿的。" },
      difficulty: 0.2,
      phonicsHintZh: "gr 是辅音连缀：g 和 r 几乎同时发出，中间不加“额”的音。",
    },
    {
      id: "w:white",
      word: "white",
      zh: "白色",
      ipa: "/waɪt/",
      pos: "n./adj.",
      example: { en: "Her bag is white.", zh: "她的包是白色的。" },
      difficulty: 0.2,
      phonicsHintZh: "wh- 发 /w/（双唇拢圆），ite 读 /aɪt/。整体像“外特”。",
    },
    {
      id: "w:black",
      word: "black",
      zh: "黑色",
      ipa: "/blæk/",
      pos: "n./adj.",
      example: { en: "My phone is black.", zh: "我的手机是黑色的。" },
      difficulty: 0.2,
      phonicsHintZh: "bl 连缀 + /æ/ 大嘴音 + k 收尾。和 dad 的 a 是同一个音。",
    },
  ],
  pattern: {
    id: "p:i-like",
    titleZh: "句型：It is ___. / I like ___.",
    explainZh:
      "描述事物：It is red.（它是红色的。）it 可以指任何刚提到的东西。" +
      "表达喜好：I like blue.（我喜欢蓝色。）like 后面直接加名词，不加动词变化。" +
      "两个句型合起来就能聊天：What color do you like? — I like green.",
    examples: [
      { en: "It is red.", zh: "它是红色的。" },
      { en: "I like blue.", zh: "我喜欢蓝色。" },
      { en: "It is black. I like black.", zh: "它是黑色。我喜欢黑色。" },
    ],
    practiceSentences: [
      { en: "It is red.", zh: "它是红色的。" },
      { en: "I like blue.", zh: "我喜欢蓝色。" },
      { en: "It is white.", zh: "它是白色的。" },
      { en: "I like green.", zh: "我喜欢绿色。" },
    ],
  },
  phonicsNoteZh:
    "今天接触“辅音连缀”：bl、gr、wh。要点是两个辅音之间不要加中文的“呃”音——" +
    "不是 bu-lue，而是 bl 连着出来。多听喇叭示范，跟着口型模仿。",
};
