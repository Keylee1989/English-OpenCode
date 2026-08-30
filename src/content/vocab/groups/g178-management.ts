import { cv } from "@/content/vocab/c2-types";

/** Phase 16-A · g178 Management — 管理运营（topic: management）. */
export const managementRows = [
  cv("operating-cadence-rhythm", "/ˈɒpəreɪtɪŋ kəˈdɛns/", "n.", "经营节奏", "C2", "business", "both", "例会/复盘/规划构成的固定节拍", "Tighten the operating cadence weekly.", "把经营节奏收紧到每周。", "set the operating cadence", [], []),
  cv("single-threaded-owner-model", "/ˈsɪŋ.ɡəl ˈθred.ɪd ˈoʊ.nər ˈmɑː.dəl/", "n.", "单线程负责人机制", "C2", "business", "written", "一个事项只设一名端到端负责人（Amazon 术语）", "Every project needs a single-threaded owner.", "每个项目都要有单一负责人。", "assign a single-threaded owner", ["DRI"], []),
  cv("root-cause-analysis-session", "/ruːt kɔːz əˈnæl.ə.sɪs ˈseʃ.ən/", "n.", "根因分析会", "C1", "academic", "both", "追因到底而非修补表象的复盘会", "Run a root cause analysis, not blame.", "做根因分析，不是追责。", "facilitate an RCA session", [], []),
  cv("capacity-planning-exercise", "/kəˈpæsəti/", "n.", "产能规划演练", "C1", "business", "written", "预测需求并匹配人手/资源的流程", "Capacity planning flagged the overload early.", "产能规划提前发现了过载。", "redo capacity planning quarterly", [], []),
  cv("servant-leadership-philosophy", "/ˈsɜːrvənt/", "n.", "服务型领导理念", "C2", "academic", "written", "领导职责是移除障碍而非发号施令", "Servant leadership removes blockers.", "服务型领导负责清除障碍。", "practice servant leadership", [], ["command-and-control"]),
];
