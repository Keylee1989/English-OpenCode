import { cv } from "@/content/vocab/c2-types";

/** Phase 16-A · g193 AI & Machine Learning — AI/ML（topic: ai-ml）. */
export const aiMlRows = [
  cv("fine-tuning-pretrained-model", "/faɪn ˈtjuːnɪŋ/", "phr.", "微调预训练模型", "C2", "academic", "written", "fine-tune ≠ retrain from scratch；需 GPU 资源", "Fine-tuning the model took three GPU days.", "微调模型花了三天GPU时间。", "fine-tune a pretrained model", [], [], { topic: "ai-ml" }),
  cv("hallucination-ai-fabrication", "/həˌluːsɪˈneɪʃn/", "n.", "AI幻觉（编造内容）", "C2", "academic", "both", "模型生成看似合理实则虚构的信息；2023年高频术语", "The chatbot's hallucination fooled many users.", "聊天机器人的幻觉骗过了许多用户。", "reduce AI hallucination rates", [], [], { topic: "ai-ml" }),
  cv("prompt-engineering-discipline", "/prɒmpt ˈendʒɪˈnɪərɪŋ/", "n.", "提示词工程", "C1", "academic", "both", "设计输入以获得最佳输出的技能；新读写能力", "Prompt engineering is the new literacy.", "提示词工程是新的读写能力。", "master prompt engineering techniques", [], [], { topic: "ai-ml" }),
  cv("reinforcement-learning-human-feedback", "/ˌriːɪnˈfɔːsmənt ˈlɜːrnɪŋ/", "n.", "人类反馈强化学习（RLHF）", "C2", "neutral", "written", "对齐模型与人类偏好的训练方法；ChatGPT 对齐核心技术", "RLHF made chatbots more helpful and safer.", "RLHF让聊天机器人更有用更安全。", "apply RLHF to align model behavior", [], [], { topic: "ai-ml" }),
  cv("zero-shot-learning-capability", "/ˈzɪroʊ ʃɑːt ˈlɜːrnɪŋ/", "n.", "零样本学习能力", "C2", "academic", "written", "无需专门训练样本即可完成新任务；few-shot learning 为相关概念", "Zero-shot learning amazed early adopters.", "零样本学习令早期用户惊叹。", "test zero-shot performance first", [], [], { topic: "ai-ml" }),
  cv("alignment-problem-research-field", "/əˈlaɪnmənt prəˈbləm/", "n.", "AI对齐问题", "C2", "academic", "written", "确保 AI 目标与人类价值观一致的研究方向；AI safety 核心子问题", "Alignment research grew tenfold since 2020.", "自2020年以来对齐研究增长了十倍。", "contribute to alignment research", [], [], { topic: "ai-ml" }),
];
