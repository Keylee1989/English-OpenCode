import type { DayContent } from "@/content/types";

/** Day 2 - Name & politeness: name/my/your/please/sorry + What's your name? */
export const day2: DayContent = {
  day: 2,
  titleEn: "What's Your Name?",
  titleZh: "第 2 天 · 姓名与礼貌用语",
  goalZh: "学会询问和回答姓名，掌握 please / sorry 两个高频礼貌词。",
  vocab: [
    {
      id: "w:name",
      word: "name",
      zh: "名字",
      ipa: "/neɪm/",
      pos: "n. 名词",
      example: { en: "My name is Li Na.", zh: "我的名字叫李娜。" },
      difficulty: 0.2,
      phonicsHintZh: "na-读 /neɪ/（“内”），me 弱读成 /m/。整体像“内姆”。",
    },
    {
      id: "w:my",
      word: "my",
      zh: "我的",
      ipa: "/maɪ/",
      pos: "det. 限定词",
      example: { en: "This is my book.", zh: "这是我的书。" },
      difficulty: 0.2,
      phonicsHintZh: "m 双唇闭合从鼻子出气；y 读 /aɪ/（“爱”）。my = “买”的音。",
    },
    {
      id: "w:your",
      word: "your",
      zh: "你的；你们的",
      ipa: "/jʊr/",
      pos: "det. 限定词",
      example: { en: "Your English is good!", zh: "你的英语很好！" },
      difficulty: 0.25,
      phonicsHintZh: "口语里 your 经常弱读成 /jər/（“哟儿”），听起来很短。",
    },
    {
      id: "w:please",
      word: "please",
      zh: "请",
      ipa: "/pliːz/",
      pos: "adv./int.",
      example: { en: "Coffee, please.", zh: "请给我咖啡。" },
      difficulty: 0.3,
      phonicsHintZh: "plea- 读 “普利”，长音 ee:/iː/，结尾 z 轻轻震动。",
    },
    {
      id: "w:sorry",
      word: "sorry",
      zh: "对不起；抱歉",
      ipa: "/ˈsɑːri/",
      pos: "adj. 形容词",
      example: { en: "Sorry, I'm late.", zh: "对不起，我迟到了。" },
      difficulty: 0.3,
      phonicsHintZh: "美音读 SAH-ree，o 读长“啊”/ɑː/。",
    },
  ],
  pattern: {
    id: "p:your-name",
    titleZh: "句型：What's your name? / My name is ___.",
    explainZh:
      "What's = What is 的缩写。问别人叫什么：What's your name?（你叫什么名字？）" +
      "回答两种都行：My name is Li Na. 或者更简单的 I'm Li Na." +
      "注意：对美国人直接问名字很自然，不用像中文那样先说“请问贵姓”。",
    examples: [
      { en: "What's your name?", zh: "你叫什么名字？" },
      { en: "My name is Li Na.", zh: "我叫李娜。" },
      { en: "Hi! I'm David. What's your name?", zh: "嗨！我是大卫。你叫什么？" },
    ],
    practiceSentences: [
      { en: "What's your name?", zh: "你叫什么名字？" },
      { en: "My name is Li Na.", zh: "我叫李娜。" },
      { en: "Sorry, what's your name?", zh: "抱歉，你叫什么来着？" },
    ],
  },
  phonicsNoteZh:
    "对比 Day 1 的 hi /haɪ/ 和今天的 my /maɪ/：它们结尾都是 /aɪ/。" +
    "英语里同一个发音可以由不同字母拼写（i, y, igh…），这就是为什么不能只看字母猜读音。",
};
