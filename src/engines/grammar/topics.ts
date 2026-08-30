/**
 * Grammar Engine v0 - core topics for the first 30 days (zero-basis path).
 *
 * Every error entry carries authored distractors so 改错 exercises have
 * plausible wrong options. Related vocabulary ids MUST exist in the lexical
 * model (validated by tests).
 */

export interface GrammarErrorSpec {
  wrong: string;
  right: string;
  /** Why it's wrong, in Chinese. */
  zh: string;
  /** Two plausible-but-wrong corrections for MCQ distractors. */
  distractors: [string, string];
}

export interface GrammarTopic {
  id: string;
  nameEn: string;
  nameZh: string;
  explanationZh: string;
  rule: string;
  examples: Array<{ en: string; zh: string }>;
  commonErrors: GrammarErrorSpec[];
  relatedVocabIds: string[];
}

export const GRAMMAR_TOPICS: readonly GrammarTopic[] = [
  {
    id: "be-verb",
    nameEn: "Verb Be (am/is/are)",
    nameZh: "be 动词",
    explanationZh:
      "英语句子必须有动词。“我是林”不能说成 I Lin——必须带上“是”：I am Lin。" +
      "口诀：I 配 am；you/we/they 和复数配 are；he/she/it 和单数配 is。",
    rule: "I am … / You-We-They are … / He-She-It is …",
    examples: [
      { en: "I am a student.", zh: "我是学生。" },
      { en: "She is my mom.", zh: "她是我妈妈。" },
      { en: "They are teachers.", zh: "他们是老师。" },
    ],
    commonErrors: [
      {
        wrong: "I Lin.",
        right: "I'm Lin.",
        zh: "中文可以说“我是林”省略“是”，英语不行：必须有 am/is/are。",
        distractors: ["I is Lin.", "I are Lin."],
      },
      {
        wrong: "They is students.",
        right: "They are students.",
        zh: "they 是复数，要配 are，不是 is。",
        distractors: ["They am students.", "They be students."],
      },
    ],
    relatedVocabIds: ["w:i", "w:she", "w:they", "w:tired", "w:happy"],
  },
  {
    id: "present-simple",
    nameEn: "Present Simple",
    nameZh: "一般现在时",
    explanationZh:
      "说习惯和事实用一般现在时。注意“三单”：主语是 he/she/it 时，动词要加 s" +
      "（work→works）。I/you/we/they 用动词原形。",
    rule: "I/You/We/They + 动词原形；He/She/It + 动词-s",
    examples: [
      { en: "I work every day.", zh: "我每天工作。" },
      { en: "She drinks coffee.", zh: "她喝咖啡。" },
      { en: "We play tennis on Sundays.", zh: "我们周日打网球。" },
    ],
    commonErrors: [
      {
        wrong: "He go to school.",
        right: "He goes to school.",
        zh: "第三人称单数（he/she/it）动词要加 -es/-s：go → goes。",
        distractors: ["He going to school.", "He gone to school."],
      },
      {
        wrong: "I plays tennis.",
        right: "I play tennis.",
        zh: "I/you/we/they 后面用动词原形，不加 s。",
        distractors: ["I playing tennis.", "I played tennis."],
      },
    ],
    relatedVocabIds: ["w:work", "w:coffee", "w:morning", "w:tennis"],
  },
  {
    id: "past-simple",
    nameEn: "Past Simple",
    nameZh: "一般过去时",
    explanationZh:
      "说过去发生的事，动词变成过去式：规则动词加 -ed（work→worked）；" +
      "常见不规则动词要背：go→went，eat→ate，see→saw。",
    rule: "主语 + V-ed / 不规则过去式（yesterday, last night…）",
    examples: [
      { en: "I worked yesterday.", zh: "我昨天工作了。" },
      { en: "She went home early.", zh: "她早早回家了。" },
      { en: "We ate dinner at seven.", zh: "我们七点吃的晚饭。" },
    ],
    commonErrors: [
      {
        wrong: "I goed home.",
        right: "I went home.",
        zh: "go 的过去式是不规则的 went，不是 goed。",
        distractors: ["I gone home.", "I going home."],
      },
      {
        wrong: "She didn't went.",
        right: "She didn't go.",
        zh: "didn't 已经表示过去了，后面的动词用原形 go。",
        distractors: ["She doesn't went.", "She not went."],
      },
    ],
    relatedVocabIds: ["w:yesterday", "w:rain", "w:dinner", "w:week"],
  },
  {
    id: "present-progressive",
    nameEn: "Present Progressive",
    nameZh: "现在进行时",
    explanationZh:
      "说“正在做”用 am/is/are + 动词-ing。中文的“正、在、呢”对应这个时态：" +
      "I am eating. 我正在吃。",
    rule: "主语 + am/is/are + V-ing（now）",
    examples: [
      { en: "I am reading now.", zh: "我现在正在读书。" },
      { en: "She is cooking dinner.", zh: "她在做晚饭。" },
      { en: "They are playing outside.", zh: "他们在外面玩。" },
    ],
    commonErrors: [
      {
        wrong: "I reading now.",
        right: "I am reading now.",
        zh: "-ing 前面不能丢掉 am/is/are。",
        distractors: ["I reads now.", "I be reading."],
      },
      {
        wrong: "He is play soccer.",
        right: "He is playing soccer.",
        zh: "进行时要同时有 be 和 -ing：is playing，缺一不可。",
        distractors: ["He is plays soccer.", "He are playing soccer."],
      },
    ],
    relatedVocabIds: ["w:now", "w:sing", "w:cook", "w:sleep"],
  },
  {
    id: "future-simple",
    nameEn: "Future (will / be going to)",
    nameZh: "一般将来时",
    explanationZh:
      "说将来的事用 will + 动词原形，或者 am/is/are going to + 动词原形。" +
      "will 后面的动词永远是原形，不加 s，不加 to。",
    rule: "will + 动词原形；am/is/are going to + 动词原形",
    examples: [
      { en: "It will rain tomorrow.", zh: "明天会下雨。" },
      { en: "I'm going to start tonight.", zh: "我今晚就要开始。" },
      { en: "We will see you soon.", zh: "很快就会见到你。" },
    ],
    commonErrors: [
      {
        wrong: "I will to go.",
        right: "I will go.",
        zh: "will 后面直接跟动词原形，不需要 to。",
        distractors: ["I will going.", "I wills go."],
      },
      {
        wrong: "She will comes back.",
        right: "She will come back.",
        zh: "will 后面动词永远用原形，即使主语是 she 也不加 s。",
        distractors: ["She will came back.", "She will coming back."],
      },
    ],
    relatedVocabIds: ["w:tomorrow", "w:weekend", "w:trip", "w:soon"],
  },
  {
    id: "negation",
    nameEn: "Negation",
    nameZh: "否定句",
    explanationZh:
      "有 be 动词就在后面加 not（isn't / aren't）；行为动词要用助动词：" +
      "don't（I/you/we/they）、doesn't（he/she/it）、didn't（过去），后面接原形。",
    rule: "be + not；don't/doesn't/didn't + 动词原形",
    examples: [
      { en: "I don't like coffee.", zh: "我不喜欢咖啡。" },
      { en: "She isn't hungry.", zh: "她不饿。" },
      { en: "They didn't come.", zh: "他们没来。" },
    ],
    commonErrors: [
      {
        wrong: "I not like tea.",
        right: "I don't like tea.",
        zh: "行为动词的否定必须借助 don't/doesn't，不能像中文只加一个“不”。",
        distractors: ["I no like tea.", "I am not like tea."],
      },
      {
        wrong: "She don't know.",
        right: "She doesn't know.",
        zh: "第三人称单数用 doesn't；用了 doesn't 之后动词保持原形 know。",
        distractors: ["She doesn't knows.", "She not know."],
      },
    ],
    relatedVocabIds: ["w:no", "w:not", "w:never", "w:coffee"],
  },
  {
    id: "questions",
    nameEn: "Questions",
    nameZh: "疑问句",
    explanationZh:
      "行为动词提问要请出助动词 Do/Does/Did 放句首：Do you like it?" +
      "特殊疑问词（what/where…）放在最前面：What do you want?",
    rule: "(Wh-) + Do/Does/Did + 主语 + 动词原形？",
    examples: [
      { en: "Do you speak English?", zh: "你说英语吗？" },
      { en: "Does she work here?", zh: "她在这儿工作吗？" },
      { en: "What do you want?", zh: "你想要什么？" },
    ],
    commonErrors: [
      {
        wrong: "Where she works?",
        right: "Where does she work?",
        zh: "特殊疑问句需要 does 帮忙，且动词回到原形 work。",
        distractors: ["Where does she works?", "Where do she work?"],
      },
      {
        wrong: "You like music?",
        right: "Do you like music?",
        zh: "书面和正式口语都要以 Do 开头构成一般疑问句。",
        distractors: ["Do you likes music?", "Are you like music?"],
      },
    ],
    relatedVocabIds: ["w:what", "w:where", "w:music", "w:name"],
  },
  {
    id: "articles",
    nameEn: "Articles (a/an/the)",
    nameZh: "冠词 a/an/the",
    explanationZh:
      "a 用于辅音音开头的单数名词前（a book）；an 用于元音音开头（an apple，" +
      "看发音不看字母）；the 表示双方都知道的那个东西。",
    rule: "a + 辅音音；an + 元音音；the + 特定的人或物",
    examples: [
      { en: "I have an apple.", zh: "我有一个苹果。" },
      { en: "The car is red.", zh: "那辆车是红色的。" },
      { en: "She wants a dog.", zh: "她想要一只狗。" },
    ],
    commonErrors: [
      {
        wrong: "I eat a apple.",
        right: "I eat an apple.",
        zh: "apple 以元音音 /æ/ 开头，冠词用 an。",
        distractors: ["I eat the apples.", "I eat a apples."],
      },
      {
        wrong: "Sun rises in east.",
        right: "The sun rises in the east.",
        zh: "独一无二的东西（sun/moon）和方位（east）前面要加 the。",
        distractors: ["A sun rises in an east.", "Sun rise in the east."],
      },
    ],
    relatedVocabIds: ["w:apple", "w:egg", "w:car", "w:dog"],
  },
  {
    id: "prepositions-basic",
    nameEn: "Prepositions (in/on/at)",
    nameZh: "基础介词 in/on/at",
    explanationZh:
      "时间：at + 时刻（at seven），on + 某天（on Monday），in + 月/年（in May）。" +
      "地点：at 小地点，in 里面，on 表面上。固定搭配要一个个记：good AT English。",
    rule: "at 时刻/小地点 · on 具体某天/表面 · in 月年/内部",
    examples: [
      { en: "Meet me at the station.", zh: "在车站等我。" },
      { en: "We start on Monday.", zh: "我们周一开始。" },
      { en: "The keys are in the drawer.", zh: "钥匙在抽屉里。" },
    ],
    commonErrors: [
      {
        wrong: "I'm good in English.",
        right: "I'm good at English.",
        zh: "固定搭配 be good at：擅长什么用 at。",
        distractors: ["I'm good on English.", "I'm good for English."],
      },
      {
        wrong: "In Monday we meet.",
        right: "On Monday we meet.",
        zh: "具体某一天用 on：on Monday / on Friday morning。",
        distractors: ["At Monday we meet.", "On Mondays we met."],
      },
    ],
    relatedVocabIds: ["w:station", "w:drawer", "w:door", "w:box"],
  },
  {
    id: "countable-uncountable",
    nameEn: "Countable & Uncountable",
    nameZh: "可数与不可数名词",
    explanationZh:
      "能数的（apple/book）叫可数名词，有复数；不能直接数的（water/money/rice）" +
      "叫不可数名词，没有复数，用 some/much 修饰，数量借 a glass of 来表达。",
    rule: "many + 复数 · much + 不可数 · some 两者皆可",
    examples: [
      { en: "How many apples?", zh: "多少个苹果？" },
      { en: "How much water?", zh: "多少水？" },
      { en: "I need some money.", zh: "我需要一些钱。" },
    ],
    commonErrors: [
      {
        wrong: "How much apples?",
        right: "How many apples?",
        zh: "apples 是可数复数，提问用 how many。",
        distractors: ["How many water?", "How much apples do you want?"],
      },
      {
        wrong: "I have many money.",
        right: "I have a lot of money.",
        zh: "money 不可数：不说 many money；大量用 a lot of / much。",
        distractors: ["I have many moneys.", "I have much moneys."],
      },
    ],
    relatedVocabIds: ["w:apple", "w:water", "w:money", "w:rice"],
  },
  {
    id: "pronouns-basic",
    nameEn: "Basic Pronouns",
    nameZh: "基础代词",
    explanationZh:
      "主格（I/he/she/we/they）当主语；宾格（me/him/her/us/them）放动词后面；" +
      "形容词性物主代词（my/his/her）后面必须跟名词：my book。",
    rule: "主格作主语 · 宾格作宾语 · my/his/her + 名词",
    examples: [
      { en: "She knows me.", zh: "她认识我。" },
      { en: "This is my book.", zh: "这是我的书。" },
      { en: "Give him the key.", zh: "把钥匙给他。" },
    ],
    commonErrors: [
      {
        wrong: "Her is my sister.",
        right: "She is my sister.",
        zh: "作主语要用主格 she；her 是“她的”或宾格“她”。",
        distractors: ["Hers is my sister.", "Him is my sister."],
      },
      {
        wrong: "Give I the book.",
        right: "Give me the book.",
        zh: "动词后面的人物用宾格 me，不是主格 I。",
        distractors: ["Give my the book.", "Give mine the book."],
      },
    ],
    relatedVocabIds: ["w:i", "w:they", "w:brother", "w:book"],
  },
  {
    id: "basic-clauses",
    nameEn: "Basic Clauses",
    nameZh: "基础从句概念",
    explanationZh:
      "把两个句子连起来：I think (that) + 完整句子 表示看法；because + 原因句 " +
      "解释为什么。从句里同样要有主语和动词，不能缺胳膊少腿。",
    rule: "I think (that) + S + V · because + S + V",
    examples: [
      { en: "I think it is easy.", zh: "我觉得它很容易。" },
      { en: "I walk because I like it.", zh: "我走路是因为我喜欢。" },
      { en: "She says she is busy.", zh: "她说她很忙。" },
    ],
    commonErrors: [
      {
        wrong: "I think is easy.",
        right: "I think it is easy.",
        zh: "think 后面的从句必须有自己的主语 it，不能直接跟 is。",
        distractors: ["I think it easy.", "I think that is easy."],
      },
      {
        wrong: "Because I tired.",
        right: "Because I am tired.",
        zh: "because 引导的从句也是完整句子，需要 be 动词：I AM tired。",
        distractors: ["Because I am tire.", "Because tired me."],
      },
    ],
    relatedVocabIds: ["w:think", "w:because", "w:language", "w:learn"],
  },
];

export function getGrammarTopic(idOrName: string): GrammarTopic | null {
  const id = idOrName.startsWith("g-") ? idOrName.slice(2) : idOrName;
  return GRAMMAR_TOPICS.find((topic) => topic.id === id) ?? null;
}

export const GRAMMAR_TOPIC_IDS = GRAMMAR_TOPICS.map((topic) => topic.id);
