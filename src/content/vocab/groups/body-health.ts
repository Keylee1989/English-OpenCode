import { v } from "@/content/vocab/builder";
import type { VocabRow } from "@/content/vocab/types";

export const bodyHealthRows: VocabRow[] = [
  v("head", "/头", "/hed/", "n.", 1, 0.2, "My head hurts.", "我头疼。", "my head hurts"),
  v("face", "/脸；面对", "/feɪs/", "n./v.", 1, 0.25, "Wash your face.", "洗脸。", "wash your face"),
  v("eye", "/眼睛", "/aɪ/", "n.", 1, 0.15, "She has big eyes.", "她眼睛很大。", "close your eyes"),
  v("ear", "/耳朵", "/ɪr/", "n.", 1, 0.15, "I hear with my ears.", "我用耳朵听。", "my ears hurt"),
  v("nose", "/鼻子", "/noʊz/", "n.", 1, 0.15, "The dog's nose is wet.", "狗鼻子湿湿的。", "runny nose"),
  v("mouth", "/嘴", "/maʊθ/", "n.", 1, 0.2, "Open your mouth.", "张开嘴。", "open your mouth"),
  v("hand", "/手", "/hænd/", "n.", 1, 0.15, "Give me your hand.", "把手给我。", "give me a hand"),
  v("arm", "/手臂", "/ɑːrm/", "n.", 1, 0.2, "My arm is sore.", "我胳膊酸。", "my left arm"),
  v("leg", "/腿", "/leɡ/", "n.", 1, 0.2, "My legs are tired.", "我腿很酸。", "my leg hurts"),
  v("foot", "/脚", "/fʊt/", "n.", 1, 0.25, "My feet are cold.", "我脚冷。", "on foot"),
  v("hair", "/头发", "/her/", "n.", 1, 0.2, "Black hair.", "黑头发。", "long hair"),
  v("body", "/身体", "/ˈbɑːdi/", "n.", 1, 0.25, "Exercise is good for the body.", "锻炼对身体好。", "good for your body"),
  v("heart", "/心脏；核心", "/hɑːrt/", "n.", 2, 0.3, "My heart beats fast.", "我心跳很快。", "learn it by heart"),
  v("medicine", "/药", "/ˈmedsn/", "n.", 2, 0.4, "Take this medicine twice a day.", "这药一天吃两次。", "take medicine"),
  v("sick", "/生病的", "/sɪk/", "adj.", 1, 0.25, "She feels sick.", "她不舒服。", "feel sick", { ant: ["healthy"] }),
  v("healthy", "/健康的", "/ˈhelθi/", "adj.", 1, 0.3, "Healthy food and sleep.", "健康饮食和睡眠。", "stay healthy", { ant: ["sick"] }),
  v("hurt", "/疼；受伤", "/hɜːrt/", "v.", 1, 0.35, "Does it hurt?", "疼吗？", "get hurt"),
  v("fine", "/好的；没事", "/faɪn/", "adj.", 1, 0.2, "I'm fine, thanks.", "我很好，谢谢。", "I am fine"),
];
