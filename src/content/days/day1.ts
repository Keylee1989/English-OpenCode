import type { DayContent } from "@/content/types";

/** Day 1 - Greetings: hi / hello / bye / thanks / OK + I'm ___. */
export const day1: DayContent = {
  day: 1,
  titleEn: "Greetings",
  titleZh: "第 1 天 · 打招呼",
  goalZh: "学会 5 个最常用的打招呼词，并能用 “I'm …” 说出自己的名字。",
  vocab: [
    {
      id: "w:hi",
      word: "hi",
      zh: "你好（随意，朋友之间）",
      ipa: "/haɪ/",
      pos: "interj. 感叹词",
      example: { en: "Hi, Lin!", zh: "嗨，林！" },
      difficulty: 0.15,
      phonicsHintZh: "h 像轻轻哈气 /h/；这里的 i 读 /aɪ/（像中文“爱”）。hi 整体读“嗨”。",
    },
    {
      id: "w:hello",
      word: "hello",
      zh: "你好（通用）",
      ipa: "/həˈloʊ/",
      pos: "interj. 感叹词",
      example: { en: "Hello! I'm Amy.", zh: "你好！我是艾米。" },
      difficulty: 0.2,
      phonicsHintZh: "重音在后面：hə-LOH。lo 里的 o 读 /oʊ/（像“欧”）。",
    },
    {
      id: "w:bye",
      word: "bye",
      zh: "再见",
      ipa: "/baɪ/",
      pos: "interj. 感叹词",
      example: { en: "Bye! See you!", zh: "再见！回头见！" },
      difficulty: 0.15,
      phonicsHintZh: "b 双唇先闭再爆开；ye 读 /aɪ/（“爱”）。bye 和 hi 押韵。",
    },
    {
      id: "w:thanks",
      word: "thanks",
      zh: "谢谢",
      ipa: "/θæŋks/",
      pos: "n./interj.",
      example: { en: "Thanks a lot!", zh: "多谢！" },
      difficulty: 0.3,
      phonicsHintZh: "th 要把舌尖放在上下牙齿之间轻轻送气 /θ/，不是 /s/。结尾 ks 连读。",
    },
    {
      id: "w:ok",
      word: "OK",
      zh: "好；可以；没问题",
      ipa: "/ˌoʊˈkeɪ/",
      pos: "adj./interj.",
      example: { en: "OK, see you tomorrow.", zh: "好，明天见。" },
      difficulty: 0.1,
      phonicsHintZh: "两个字母各读一个音：O=/oʊ/（欧），K=/keɪ/（克诶）。",
    },
  ],
  pattern: {
    id: "p:im",
    titleZh: "句型：I'm ___. （我是……）",
    explainZh:
      "I'm 是 I am 的缩写，用来介绍自己。把你的名字放在后面：I'm Lin.（我是林。）" +
      "美国人自我介绍最常用这一句，比 My name is… 更口语。",
    examples: [
      { en: "I'm Lin.", zh: "我是林。" },
      { en: "I'm Amy.", zh: "我是艾米。" },
      { en: "Hi, I'm Mr. Wang.", zh: "嗨，我是王先生。" },
    ],
    practiceSentences: [
      { en: "Hi, I'm Lin.", zh: "嗨，我是林。" },
      { en: "Hello, I'm Amy.", zh: "你好，我是艾米。" },
      { en: "Bye!", zh: "再见！" },
    ],
  },
  phonicsNoteZh:
    "重要概念：字母有“名字”和“发音”。比如字母 H 的名字读 /eɪtʃ/，但在 hello 里它发 /h/。" +
    "本课程关注的是单词里的真实发音。点击每个单词的喇叭按钮可以听真人速度的美音示范。",
};
