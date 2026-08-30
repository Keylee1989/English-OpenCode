import type { DayContent } from "@/content/types";

/** Day 4 - Family: family/mom/dad/he/she + This is my ___. */
export const day4: DayContent = {
  day: 4,
  titleEn: "Family",
  titleZh: "第 4 天 · 家人",
  goalZh: "学会介绍家人，区分 he（他）/ she（她）。",
  vocab: [
    {
      id: "w:family",
      word: "family",
      zh: "家庭；家人",
      ipa: "/ˈfæməli/",
      pos: "n. 名词",
      example: { en: "I love my family.", zh: "我爱我的家人。" },
      difficulty: 0.3,
      phonicsHintZh: "重音在最前：FA-mə-li。口语里常读成三个音节 “fæm-li”。",
    },
    {
      id: "w:mom",
      word: "mom",
      zh: "妈妈",
      ipa: "/mɑːm/",
      pos: "n. 名词",
      example: { en: "This is my mom.", zh: "这是我妈妈。" },
      difficulty: 0.2,
      phonicsHintZh: "美音读“妈姆”/mɑːm/，o 是长“啊”。注意美式说 mom，英式说 mum。",
    },
    {
      id: "w:dad",
      word: "dad",
      zh: "爸爸",
      ipa: "/dæd/",
      pos: "n. 名词",
      example: { en: "My dad is a driver.", zh: "我爸是司机。" },
      difficulty: 0.15,
      phonicsHintZh: "d 舌尖抵上齿龈弹开；a 读 /æ/——嘴张大像被检查喉咙。",
    },
    {
      id: "w:he",
      word: "he",
      zh: "他",
      ipa: "/hiː/",
      pos: "pron. 代词",
      example: { en: "He is my dad.", zh: "他是我爸。" },
      difficulty: 0.15,
      phonicsHintZh: "h 哈气 + ee 长音 /iː/，读“黑依”去掉 h 以外的部分。",
    },
    {
      id: "w:she",
      word: "she",
      zh: "她",
      ipa: "/ʃiː/",
      pos: "pron. 代词",
      example: { en: "She is my mom.", zh: "她是我妈。" },
      difficulty: 0.2,
      phonicsHintZh: "sh 撅起嘴唇像嘘人一样 /ʃ/（不是“斯”），+ 长音 /iː/。",
    },
  ],
  pattern: {
    id: "p:this-is",
    titleZh: "句型：This is my ___. / He is ___. / She is ___.",
    explainZh:
      "向别人介绍人或物：This is…（这是……）。my 表示“我的”。" +
      "男性用 He（他），女性用 She（她）：He is David. / She is Lily." +
      "中文的“他/她”发音相同所以容易混，英语 he/she 发音完全不同，必须分清。",
    examples: [
      { en: "This is my mom.", zh: "这是我妈妈。" },
      { en: "This is my dad.", zh: "这是我爸爸。" },
      { en: "She is Lily.", zh: "她是莉莉。" },
      { en: "He is David.", zh: "他是大卫。" },
    ],
    practiceSentences: [
      { en: "This is my mom.", zh: "这是我妈妈。" },
      { en: "This is my dad.", zh: "这是我爸爸。" },
      { en: "She is Lily.", zh: "她是莉莉。" },
      { en: "He is David.", zh: "他是大卫。" },
    ],
  },
  phonicsNoteZh:
    "今天两个新辅音：/ʃ/（she）和复习 /θ/。发 /ʃ/ 时双唇向前撅、舌头平放，像对别人“嘘——”。" +
    "对比：see /siː/（看见）用 /s/，she /ʃiː/ 用 /ʃ/，听感差别很大。",
};
