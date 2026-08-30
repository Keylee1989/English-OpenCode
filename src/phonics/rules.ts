import type { MinimalPair, PhonicsRule } from "@/phonics/types";

/**
 * Core GPC rule library (Phase 2 v0).
 * Matching is longest-grapheme-first; word-level OVERRIDES (see decode.ts)
 * handle sight/irregular words honestly instead of faking rules.
 */
export const PHONICS_RULES: readonly PhonicsRule[] = [
  // --- consonant digraphs ---
  {
    id: "sh",
    graphemes: ["sh"],
    phoneme: "/ʃ/",
    type: "consonant",
    tipZh: "双唇前撅、舌身放平送气，像对别人“嘘——”。不要读成中文的“施”。",
    examples: ["she", "shop", "fish"],
  },
  {
    id: "ch",
    graphemes: ["ch", "tch"],
    phoneme: "/tʃ/",
    type: "consonant",
    tipZh: "先摆 /ʃ/ 的嘴形，再加一个短促的 t 爆破。",
    examples: ["chair", "lunch", "watch"],
  },
  {
    id: "th-vl",
    graphemes: ["th"],
    phoneme: "/θ/",
    type: "consonant",
    tipZh: "舌尖轻放在上下齿之间吹气，声带不震动。别读成 /s/。",
    examples: ["three", "thank", "bath"],
  },
  {
    id: "th-vd",
    graphemes: ["th"],
    phoneme: "/ð/",
    type: "consonant",
    tipZh: "舌位同 /θ/ 但震动声带（手摸喉咙能感到）。the / this / that 都是这个音。",
    examples: ["the", "this", "that", "mother"],
  },
  {
    id: "ng",
    graphemes: ["ng"],
    phoneme: "/ŋ/",
    type: "consonant",
    tipZh: "舌根抵上颚后部、从鼻子出气，嘴保持闭合感。像“唱”的韵尾。",
    examples: ["sing", "thing", "morning"],
  },
  {
    id: "wh",
    graphemes: ["wh"],
    phoneme: "/w/",
    type: "consonant",
    tipZh: "双唇拢圆发 /w/。what / when 的 wh 就读 w。",
    examples: ["what", "when", "white"],
  },

  // --- single consonants worth teaching ---
  { id: "h", graphemes: ["h"], phoneme: "/h/", type: "consonant", tipZh: "轻轻哈气，像往眼镜片上呵气。", examples: ["hi", "hello", "hand"] },
  { id: "r", graphemes: ["r"], phoneme: "/r/", type: "consonant", tipZh: "舌尖卷起但不碰上颚，嘴唇略圆。美音 r 很明显。", examples: ["red", "run", "right"] },
  { id: "l", graphemes: ["l"], phoneme: "/l/", type: "consonant", tipZh: "舌尖抵上齿龈。词尾的 l 也不要吞掉：girl / milk。", examples: ["like", "milk", "girl"] },
  { id: "w", graphemes: ["w"], phoneme: "/w/", type: "consonant", tipZh: "双唇快速拢圆再放开，像“乌”的起点。", examples: ["we", "water", "work"] },
  { id: "y-cons", graphemes: ["y"], phoneme: "/j/", type: "consonant", tipZh: "作辅音时读“耶”的开头：yes / you / year。", examples: ["yes", "you", "year"] },
  { id: "v", graphemes: ["v"], phoneme: "/v/", type: "consonant", tipZh: "上齿轻咬下唇并震动声带。和 w 完全不同！", examples: ["very", "five", "love"] },
  { id: "z", graphemes: ["z", "s"], phoneme: "/z/", type: "consonant", tipZh: "s 在元音之间常读浊音 /z/：nose / rose / zoo。", examples: ["zoo", "nose", "rose"] },
  { id: "j", graphemes: ["g", "j"], phoneme: "/dʒ/", type: "consonant", tipZh: "g 在 e/i/y 前常读 /dʒ/：orange / gym / job。", examples: ["job", "orange", "gym"] },

  // --- short vowels (American) ---
  { id: "a-short", graphemes: ["a"], phoneme: "/æ/", type: "vowel", tipZh: "嘴张到最大像检查喉咙，读“啊”但更扁更亮。bad / cat / man。", examples: ["cat", "man", "bad"] },
  { id: "e-short", graphemes: ["e"], phoneme: "/e/", type: "vowel", tipZh: "嘴半开，比“诶”短促。bed / ten / red。", examples: ["bed", "ten", "red"] },
  { id: "i-short", graphemes: ["i"], phoneme: "/ɪ/", type: "vowel", tipZh: "短促松懈的“衣”，嘴不用拉太开。sit / big / fish。", examples: ["sit", "big", "fish"] },
  { id: "o-short", graphemes: ["o"], phoneme: "/ɑ/", type: "vowel", tipZh: "美音里短 o 读长“啊”：hot / stop / mom。", examples: ["hot", "stop", "mom"] },
  { id: "u-short", graphemes: ["u"], phoneme: "/ʌ/", type: "vowel", tipZh: "放松的短“啊”，嘴不圆。cup / bus / run。", examples: ["cup", "bus", "run"] },

  // --- long vowels & vowel teams ---
  { id: "ee", graphemes: ["ee", "ea"], phoneme: "/iː/", type: "vowel", tipZh: "拉长的“衣——”，嘴角向两边裂开。see / tea / eat。", examples: ["see", "tea", "eat"] },
  { id: "ai", graphemes: ["ai", "ay"], phoneme: "/eɪ/", type: "vowel", tipZh: "读字母 A 的名字：“诶——”。day / rain / play。", examples: ["day", "rain", "play"] },
  { id: "igh", graphemes: ["igh", "i-e", "y"], phoneme: "/aɪ/", type: "vowel", tipZh: "读字母 I 的名字，“爱——”。hi / my / five / night。", examples: ["five", "night", "my"] },
  { id: "oa", graphemes: ["oa", "ow", "o-e"], phoneme: "/oʊ/", type: "vowel", tipZh: "读字母 O 的名字，“欧——”，结尾双唇收圆。boat / know / home。", examples: ["boat", "know", "home"] },
  { id: "oo-l", graphemes: ["oo", "ew", "u-e"], phoneme: "/uː/", type: "vowel", tipZh: "长“乌——”，双唇收圆突出口。food / too / blue。", examples: ["food", "too", "blue"] },
  { id: "oo-s", graphemes: ["oo"], phoneme: "/ʊ/", type: "vowel", tipZh: "短促放松的“乌”，比 /uː/ 短得多。good / book / look。", examples: ["good", "book", "look"] },
  { id: "ow-2", graphemes: ["ow"], phoneme: "/aʊ/", type: "vowel", tipZh: "ow 有两个读音；这里是“澳”：now / down / how。", examples: ["now", "down", "how"] },
  { id: "oi", graphemes: ["oi", "oy"], phoneme: "/ɔɪ/", type: "vowel", tipZh: "从“哦”滑到“衣”：boy / coin。", examples: ["boy", "coin"] },

  // --- r-controlled ---
  { id: "ar", graphemes: ["ar"], phoneme: "/ɑːr/", type: "r-controlled", tipZh: "“啊”直接卷舌接 r：car / star / park。", examples: ["car", "star", "park"] },
  { id: "or", graphemes: ["or", "ore"], phoneme: "/ɔːr/", type: "r-controlled", tipZh: "“哦”卷舌接 r：for / morning / more。", examples: ["for", "morning", "more"] },
  { id: "er", graphemes: ["er", "ir", "ur"], phoneme: "/ər/", type: "r-controlled", tipZh: "弱化的卷舌音，像轻快的“儿化”：her / girl / water 词尾。", examples: ["her", "girl", "water"] },

  // --- al family (walk/talk/tall/small) ---
  { id: "al", graphemes: ["al", "aw", "au"], phoneme: "/ɔː/", type: "vowel", tipZh: "圆唇长“奥——”。walk 里的 l 不发音！talk / small / all。", examples: ["small", "tall", "all"] },

  // --- common initial clusters ---
  { id: "bl", graphemes: ["bl"], phoneme: "/bl/", type: "cluster", tipZh: "b 和 l 连着发，中间不加“呃”音：blue。", examples: ["blue", "black"] },
  { id: "br", graphemes: ["br"], phoneme: "/br/", type: "cluster", tipZh: "b 直接滑入 r：bread / brother。", examples: ["bread", "brother"] },
  { id: "dr", graphemes: ["dr"], phoneme: "/dr/", type: "cluster", tipZh: "d 直接滑入 r：drink / drive。", examples: ["drink", "drive"] },
  { id: "tr", graphemes: ["tr"], phoneme: "/tr/", type: "cluster", tipZh: "t 直接滑入 r（美音带一点卷舌）：tree / trip。", examples: ["tree", "trip"] },
  { id: "gr", graphemes: ["gr"], phoneme: "/gr/", type: "cluster", tipZh: "g 直接滑入 r：green / great。", examples: ["green", "great"] },
  { id: "pl", graphemes: ["pl"], phoneme: "/pl/", type: "cluster", tipZh: "p 直接滑入 l：play / plate。", examples: ["play", "plate"] },
  { id: "st", graphemes: ["st"], phoneme: "/st/", type: "cluster", tipZh: "s + t 连发：stop / student / stand。", examples: ["stop", "student", "stand"] },
  { id: "sp", graphemes: ["sp"], phoneme: "/sp/", type: "cluster", tipZh: "s + p 连发：speak / sport / spoon。", examples: ["speak", "sport", "spoon"] },
  { id: "sl", graphemes: ["sl"], phoneme: "/sl/", type: "cluster", tipZh: "s 直接滑入 l：sleep / slow。", examples: ["sleep", "slow"] },
  { id: "fl", graphemes: ["fl"], phoneme: "/fl/", type: "cluster", tipZh: "f 直接滑入 l：flower / floor。", examples: ["flower", "floor"] },
];

/**
 * Word-level overrides for high-frequency irregular words.
 * Format: raw [grapheme, ipa] segments - used verbatim, coverage counts as full.
 * These are SIGHT words for Chinese learners; rules cannot explain them.
 */
export const PHONICS_OVERRIDES: Record<string, Array<[string, string]>> = {
  one: [["on", "/wʌn/"], ["e", ""]],
  two: [["tw", "/tuː/"], ["o", ""]],
  who: [["wh", "/huː/"], ["o", ""]],
  walk: [["w", "/w/"], ["al", "/ɔː/"], ["k", ""]],
  talk: [["t", "/t/"], ["al", "/ɔː/"], ["k", ""]],
  good: [["g", "/ɡ/"], ["oo", "/ʊ/"], ["d", "/d/"]],
  food: [["f", "/f/"], ["oo", "/uː/"], ["d", "/d/"]],
  book: [["b", "/b/"], ["oo", "/ʊ/"], ["k", ""]],
  look: [["l", "/l/"], ["oo", "/ʊ/"], ["k", ""]],
  too: [["t", "/t/"], ["oo", "/uː/"]],
  school: [["sch", "/sk/"], ["oo", "/uː/"], ["l", "/l/"]],
  come: [["c", "/k/"], ["o", "/ʌ/"], ["me", ""]],
  some: [["s", "/s/"], ["o", "/ʌ/"], ["me", ""]],
  love: [["l", "/l/"], ["o", "/ʌ/"], ["ve", "/v/"]],
  live: [["l", "/l/"], ["iv", "/ɪv/"]],
  have: [["h", "/h/"], ["ave", "/æv/"]],
  give: [["g", "/ɡ/"], ["ive", "/ɪv/"]],
  what: [["wh", "/w/"], ["a", "/ɑ/"], ["t", "/t/"]],
};

/** Minimal pairs for listening discrimination. Both words MUST exist in vocab. */
export const MINIMAL_PAIRS: readonly MinimalPair[] = [
  { id: "pair-eat-it", aWord: "eat", bWord: "it", contrastZh: "长 /iːt/ vs 短 /ɪt/：嘴角裂开的长“衣” vs 松短“衣”" },
  { id: "pair-live-leave", aWord: "live", bWord: "leave", contrastZh: "短 /ɪ/ vs 长 /iː/：live 住在 leave 离开" },
  { id: "pair-work-walk", aWord: "work", bWord: "walk", contrastZh: "卷舌 /ər/ vs 圆唇 /ɔː/：work 工作 walk 走路（l 不发音）" },
  { id: "pair-three-tree", aWord: "three", bWord: "tree", contrastZh: "咬舌 /θr/ vs 爆破 /tr/：三 vs 树" },
  { id: "pair-bad-bed", aWord: "bad", bWord: "bed", contrastZh: "大嘴 /æ/ vs 半开 /e/：坏 vs 床" },
  { id: "pair-cat-cut", aWord: "cat", bWord: "cut", contrastZh: "亮 /æ/ vs 松 /ʌ/：猫 vs 切" },
  { id: "pair-full-food", aWord: "full", bWord: "food", contrastZh: "短 /ʊ/ vs 长 /uː/：满的 vs 食物" },
  { id: "pair-sit-seat", aWord: "sit", bWord: "seat", contrastZh: "短 /ɪ/ vs 长 /iː/：坐 vs 座位" },
];

export function findRule(ruleId: string): PhonicsRule | undefined {
  return PHONICS_RULES.find((rule) => rule.id === ruleId);
}

export function findPair(pairId: string): MinimalPair | undefined {
  return MINIMAL_PAIRS.find((pair) => pair.id === pairId);
}
