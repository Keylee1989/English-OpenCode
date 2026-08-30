import type { DayContent } from "@/content/types";

/** Day 6 - Café: water/coffee/tea/milk/want/drink + I want a ___, please. */
export const day6: DayContent = {
  day: 6,
  titleEn: "At the Coffee Shop",
  titleZh: "第 6 天 · 咖啡店点单",
  goalZh: "学会 4 个饮品词，能用 “I want a ___, please.” 点单。",
  vocab: [
    {
      id: "w:water",
      word: "water",
      zh: "水",
      ipa: "/ˈwɔːtər/",
      pos: "n. 名词",
      example: { en: "Some water, please.", zh: "请给我一些水。" },
      difficulty: 0.3,
      phonicsHintZh: "WA-ter：/wɔː/（“沃”）+ 弱读的 /tər/。美音 t 在这里常发成快速轻拍。",
    },
    {
      id: "w:coffee",
      word: "coffee",
      zh: "咖啡",
      ipa: "/ˈkɔːfi/",
      pos: "n. 名词",
      example: { en: "A coffee, please.", zh: "请给我一杯咖啡。" },
      difficulty: 0.25,
      phonicsHintZh: "KAW-fee，重音在前，两个 f 只发一次音但音要拖住。",
    },
    {
      id: "w:tea",
      word: "tea",
      zh: "茶",
      ipa: "/tiː/",
      pos: "n. 名词",
      example: { en: "Tea for me.", zh: "我要茶。" },
      difficulty: 0.15,
      phonicsHintZh: "t 爆破 + 长音 /iː/，就是“提”。ea 组合在这里读 /iː/。",
    },
    {
      id: "w:milk",
      word: "milk",
      zh: "牛奶",
      ipa: "/mɪlk/",
      pos: "n. 名词",
      example: { en: "Coffee with milk.", zh: "加奶咖啡。" },
      difficulty: 0.3,
      phonicsHintZh: "mi-lk：短音 /ɪ/ + l + k 三个尾巴都要出来。",
    },
    {
      id: "w:want",
      word: "want",
      zh: "想要",
      ipa: "/wɑːnt/",
      pos: "v. 动词",
      example: { en: "I want a coffee.", zh: "我想要一杯咖啡。" },
      difficulty: 0.3,
      phonicsHintZh: "读“汪特”，a 是长“啊”/ɑː/。口语里 t 经常轻轻带过。",
    },
    {
      id: "w:drink",
      word: "drink",
      zh: "喝；饮料",
      ipa: "/drɪŋk/",
      pos: "v./n.",
      example: { en: "I want to drink some tea.", zh: "我想喝点茶。" },
      difficulty: 0.4,
      phonicsHintZh: "dr 连缀 + /ɪ/ + nk（鼻音收尾）。结尾 k 轻一点没关系，别吞掉整个音节。",
    },
  ],
  pattern: {
    id: "p:i-want",
    titleZh: "句型：I want a ___, please.",
    explainZh:
      "点单万能句：I want a coffee, please.（我想要一杯咖啡，谢谢。）" +
      "please 放句尾显得礼貌。不可数的液体常说 some：I want some water, please." +
      "更地道的说法是 I'd like…（I would like 的缩写），Phase 后面会教；先用 want 完全没问题。",
    examples: [
      { en: "I want a coffee, please.", zh: "我想要一杯咖啡，谢谢。" },
      { en: "I want a tea, please.", zh: "我想要一杯茶，谢谢。" },
      { en: "I want some water, please.", zh: "我想要一些水，谢谢。" },
    ],
    practiceSentences: [
      { en: "I want a coffee, please.", zh: "我想要一杯咖啡，谢谢。" },
      { en: "I want a tea, please.", zh: "我想要一杯茶，谢谢。" },
      { en: "I want some water, please.", zh: "我想要一些水，谢谢。" },
    ],
  },
  phonicsNoteZh:
    "注意 tea /tiː/ 和 Day 1 的 thanks：t 发音相同，但 ea 组合是长音 /iː/。" +
    "英语字母组合的发音要靠“见得多”积累，本课程的拼读提示会一直陪你建立这个直觉。",
};
