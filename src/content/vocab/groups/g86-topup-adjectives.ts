import { v } from "@/content/vocab/builder";
import type { VocabRow } from "@/content/vocab/types";

/** Top-up adjectives - closes the 3000-word target and fixes relation anchors. */
export const topupAdjectivesRows: VocabRow[] = [
  v("anxious", "/焦虑的；渴望的", "/ˈæŋkʃəs/", "adj.", 2, 0.25, "He felt anxious before the results came out.", "结果出来前他很焦虑。", "feel anxious about the future"),
  v("faithful", "/忠实的；如实的", "/ˈfeɪθfl/", "adj.", 4, 0.35, "A faithful dog waited at the station every day.", "一只忠实的狗每天在车站等。", "a faithful old friend"),
  v("ugly", "/丑的；难看的", "/ˈʌɡli/", "adj.", 1, 0.1, "The storm left an ugly scar on the roof.", "暴风雨在屋顶留下难看的痕迹。", "an ugly sweater contest"),
  v("upset", "/难过的；不安的", "/ʌpˈset/", "adj./v.", 1, 0.15, "She was upset about the broken vase? natural: She was upset about the vase.", "她为花瓶的事难过。", "get upset over small things"),
  v("wild", "/野生的；狂野的", "/waɪld/", "adj.", 1, 0.1, "Wild horses ran along the ridge.", "野马沿着山脊奔跑。", "wild flowers by the road"),
  v("ashamed", "/羞愧的", "/əˈʃeɪmd/", "adj.", 4, 0.35, "He felt ashamed after yelling at his sister.", "他对妹妹大喊后感到羞愧。", "be ashamed of rude behavior"),
  v("sleepy", "/困的；寂静的", "/ˈsliːpi/", "adj.", 1, 0.05, "Warm rooms make everyone sleepy.", "温暖的房间让人昏昏欲睡。", "a sleepy little town"),
  v("moody", "/情绪化的；喜怒无常的", "/ˈmuːdi/", "adj.", 5, 0.4, "Teenagers can be moody before breakfast.", "青少年早饭前可能情绪多变。", "a moody blues track"),
  v("humble", "/谦逊的；简陋的", "/ˈhʌmbl/", "adj./v.", 5, 0.45, "The champion stayed humble in interviews.", "这位冠军在采访中保持谦逊。", "come from a humble background"),
  v("sincere", "/真诚的", "/sɪnˈsɪr/", "adj.", 5, 0.4, "Thank her with a sincere smile? natural: Thank her with a sincere smile.", "用真诚的微笑感谢她。", "my sincere apologies"),
];
