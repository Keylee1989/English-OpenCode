import { v } from "@/content/vocab/builder";
import type { VocabRow } from "@/content/vocab/types";

/** Connectors & discourse chunks - glue for opinions and discussion. */
export const connectors2Rows: VocabRow[] = [
  v("though", "/不过；虽然(句尾常用)", "/ðoʊ/", "conj./adv.", 1, 0.15, "It's expensive; I like it, though.", "虽然贵，不过我喜欢。", "as though nothing happened"),
  v("despite", "/尽管；任凭", "/dɪˈspaɪt/", "prep.", 3, 0.3, "Despite the rain, we hiked to the top.", "尽管下雨，我们还是登了顶。", "despite the cost"),
  v("unless", "/除非", "/ənˈles/", "conj.", 2, 0.25, "Unless it snows, the store opens on time.", "除非下雪，商店会准时开门。", "unless you hurry"),
  v("whenever", "/无论何时；每当", "/wenˈevər/", "conj.", 1, 0.1, "Call me whenever you need help.", "随时需要就打给我。", "whenever possible"),
  v("wherever", "/无论哪里", "/werˈevər/", "adv./conj.", 2, 0.15, "Sit wherever you like.", "想坐哪儿坐哪儿。", "wherever you go"),
  v("whatever", "/无论什么；不管怎样", "/wɑːtˈevər/", "pron./det.", 1, 0.1, "Whatever happens, stay calm.", "无论如何都要冷静。", "whatever you decide"),
  v("whoever", "/无论是谁", "/huːˈevər/", "pron.", 4, 0.35, "Whoever finishes first picks the movie.", "谁先完成谁选电影。", "give it to whoever needs it"),
  v("otherwise", "/否则；要不然", "/ˈʌðərwaɪz/", "adv./conj.", 1, 0.15, "Leave now; otherwise traffic gets bad.", "现在就走，不然路上会堵。", "unless otherwise stated"),
  v("whereas", "/然而；鉴于", "/werˈæz/", "conj.", 7, 0.65, "He loves cities, whereas she prefers villages.", "他爱城市，而她偏爱乡村。", "whereas last year sales rose"),
  v("as-soon-as", "/一…就…", "/əz suːn əz/", "phr.", 1, 0.1, "Call me as soon as you land.", "你一落地就打给我。", "as soon as possible"),
  v("even-if", "/即使；纵然", "/ˈiːvən ɪf/", "phr.", 1, 0.15, "Even if it rains, the game continues.", "即使下雨，比赛也照常进行。", "even if it takes all night"),
  v("even-though", "/虽然；尽管", "/ˈiːvən ðoʊ/", "phr.", 1, 0.15, "Even though he was tired, he kept practicing.", "尽管很累，他仍坚持练习。", "even though everyone warned us"),
  v("in-case-of", "/以防万一", "/ɪn keɪs/", "phr.", 1, 0.15, "Take an umbrella in case it rains.", "带把伞以防下雨。", "in case of fire"),
  v("so-that", "/以便；为了", "/soʊ ðæt/", "phr.", 2, 0.2, "Speak slowly so that everyone understands.", "说慢点让大家都听懂。", "save now so you can travel later"),
  v("such-as", "/例如；诸如", "/sʌtʃ æz/", "phr.", 2, 0.2, "Fruits such as mangoes ship well.", "像芒果这样的水果耐运输。", "sports such as swimming"),
  v("as-well", "/也；还", "/əz wel/", "phr.", 1, 0.1, "She speaks French as well.", "她也会说法语。", "might as well join us"),
  v("as-usual", "/像往常一样", "/əz ˈjuːʒuəl/", "phr.", 2, 0.15, "The bus was late, as usual.", "公交又迟到了，一如既往。", "the same as usual"),
  v("in-general", "/总体而言", "/ɪn ˈdʒenrəl/", "phr.", 2, 0.15, "In general, winters here are mild.", "总体来说这里冬天温和。", "the public in general"),
  v("on-average", "/平均来看", "/ˈænvərɪdʒ/", "phr.", 3, 0.25, "On average, we walk six kilometers a day.", "我们平均每天走六公里。", "above average grades"),
  v("at-first", "/起初；起先", "/æt fɜːrst/", "phr.", 2, 0.2, "At first, the plan seemed impossible.", "起初这计划看起来不可能。", "at first sight"),
  v("in-the-end", "/最后；终于", "/ɪn ði end/", "phr.", 1, 0.1, "In the end, patience won.", "最终，耐心赢得了胜利。", "win in the end"),
  v("in-addition", "/另外；此外", "/ɪn əˈdɪʃn/", "phr.", 3, 0.25, "In addition, the app works offline.", "此外，这个应用离线也能用。", "in addition to english"),
  v("for-now", "/暂时；目前", "/fɔːr naʊ/", "phr.", 1, 0.1, "For now, let's stick to the plan.", "目前我们先按计划来。", "good enough for now"),
  v("so-far", "/到目前为止", "/soʊ fɑːr/", "phr.", 1, 0.1, "So far, so good.", "到目前为止一切顺利。", "the best day so far"),
  v("long-term", "/长期的", "/ˌlɔːŋ ˈtɜːrm/", "adj./n.", 4, 0.3, "Reading daily is a long-term investment.", "每天阅读是长期投资。", "long-term planning"),
  v("short-term", "/短期的", "/ˌʃɔːrt ˈtɜːrm/", "adj./n.", 4, 0.3, "Short-term rentals cost more per night.", "短租房每晚更贵。", "only a short-term fix"),
  v("everyday", "/日常的；每天的", "/ˈevrideɪ/", "adj.", 1, 0.1, "Everyday habits shape your health.", "日常习惯决定健康。", "everyday objects"),
];
