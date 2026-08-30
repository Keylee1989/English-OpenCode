import { v } from "@/content/vocab/builder";
import type { VocabRow } from "@/content/vocab/types";

export const peopleJobsRows: VocabRow[] = [
  v("parents", "/父母", "/ˈperənts/", "n.", 2, 0.3, "My parents are here.", "我父母在这儿。", "my parents"),
  v("brother", "/哥哥；弟弟", "/ˈbrʌðər/", "n.", 1, 0.25, "My brother is tall.", "我哥哥很高。", "big brother"),
  v("sister", "/姐姐；妹妹", "/ˈsɪstər/", "n.", 1, 0.25, "My sister is nice.", "我姐姐人很好。", "little sister"),
  v("son", "/儿子", "/sʌn/", "n.", 2, 0.3, "Their son is five.", "他们儿子五岁。", "only son"),
  v("daughter", "/女儿", "/ˈdɔːtər/", "n.", 2, 0.35, "Her daughter sings.", "她女儿会唱歌。", "only daughter"),
  v("grandma", "/奶奶；外婆", "/ˈɡrænmɑː/", "n.", 2, 0.25, "Grandma cooks well.", "奶奶做饭好吃。", "visit grandma"),
  v("baby", "/婴儿；宝宝", "/ˈbeɪbi/", "n.", 1, 0.2, "The baby sleeps.", "宝宝在睡觉。", "baby food"),
  v("boy", "/男孩", "/bɔɪ/", "n.", 1, 0.15, "That boy runs fast.", "那个男孩跑得快。", "a little boy"),
  v("girl", "/女孩", "/ɡɜːrl/", "n.", 1, 0.15, "The girl is smart.", "这个女孩很聪明。", "a little girl"),
  v("man", "/男人；人", "/mæn/", "n.", 1, 0.15, "That man works here.", "那个人在这里工作。", "young man"),
  v("woman", "/女人", "/ˈwʊmən/", "n.", 1, 0.15, "This woman helps me.", "这位女士帮助我。", "young woman"),
  v("friend", "/朋友", "/frend/", "n.", 1, 0.2, "She is my best friend.", "她是我最好的朋友。", "best friend"),
  v("people", "/人们", "/ˈpiːpl/", "n.", 1, 0.2, "People like coffee.", "人们喜欢咖啡。", "many people"),
  v("person", "/人（单个）", "/ˈpɜːrsn/", "n.", 2, 0.3, "He is a kind person.", "他是个善良的人。", "in person"),
  v("child", "/孩子（单数）", "/tʃaɪld/", "n.", 1, 0.25, "The child plays outside.", "孩子在外面玩。", "one child"),
  v("children", "/孩子们", "/ˈtʃɪldrən/", "n.", 1, 0.25, "Children love games.", "孩子们喜欢游戏。", "my children"),
  v("teacher", "/老师", "/ˈtiːtʃər/", "n.", 1, 0.25, "She is a teacher.", "她是老师。", "English teacher", { fam: ["teach"] }),
  v("student", "/学生", "/ˈstuːdnt/", "n.", 1, 0.25, "I am a student.", "我是学生。", "college student"),
  v("doctor", "/医生", "/ˈdɑːktər/", "n.", 1, 0.3, "See a doctor today.", "今天去看医生。", "see a doctor"),
  v("worker", "/工人；员工", "/ˈwɜːrkər/", "n.", 2, 0.4, "A good worker.", "一名好员工。", "office worker", { fam: ["work"] }),
  v("husband", "/丈夫", "/ˈhʌzbənd/", "n.", 2, 0.35, "Her husband cooks.", "她丈夫做饭。", "her husband"),
  v("wife", "/妻子", "/waɪf/", "n.", 2, 0.3, "His wife teaches.", "他妻子教书。", "my wife"),
];
