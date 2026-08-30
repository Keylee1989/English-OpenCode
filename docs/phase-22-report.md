# English360 V2 · Phase 22 Report — 让闭环「可运行、可发现问题、可修复」（产品化收口）

日期：2026-08-29
状态：**PHASE 22（RC6）COMPLETE（含 P0 PARTIAL 诚实标注）** —— 本阶段目标是把 RC6 从「闭环存在」升级为「一个**可靠运行闭环、能发现并修复真实学习效果问题**的产品」。全部按严格诚实纪律落地，以真实构建 / `npx vitest run` / 门禁脚本 / 运行时冒烟为权威验证，并按 6 类口径如实标注（对无法完整完成的 P0 记录 **PARTIAL + 原因**）。**停止，等待审核，不自动进入下一阶段。**

---

## 〇、判断口径（Honesty 声明）

本阶段所有条目均按以下 6 类如实标注：
- **DONE**：已完成并通过验证
- **PARTIAL**：部分完成（有明确边界）
- **NOT DONE**：明确未做
- **PRE-EXISTING**：会话前已存在，本会话未改动
- **NEW ISSUE**：本会话发现/修复的问题
- **ENV-BLOCKED**：环境限制导致无法验证（诚实标注，**绝不伪造 PASS**）

权威口径：一律以真实 App 构建 / `npx vitest run` / 门禁脚本 / 运行时冒烟为**权威**结果。P0-8 以「功能不变、数据 ID 不变、SRS 不变、Export 兼容」与「不要为了达到某个数字而牺牲离线体验」为判断底线——**因此拒绝一个会破坏离线正确性的激进 code-split，诚实记录 PARTIAL + 原因**。

---

## 一、核心指标（REAL_APP_* 实测）

| 指标 | 数值 | 说明 |
|---|---|---|
| AUTHORED_DAYS | **180** | 未动（Hard Freeze）✅ |
| SCHEMA_VERSION | **7** | 未动（Hard Freeze）✅ |
| Vocabulary | **13,033** | 0 失败（IPA/ID/field/colloc/band/diff）✅ |
| 全量测试 | **67 files / 389 tests** | 全过 ✅（本 host 直接全量运行 501s 实证；修复 3 处重型数据测试超时，见第七节） |
| P0-2 闭环场景矩阵 A–P | **16 tests** | 新文件全过 ✅ |
| P0-6 基线纵向 | **6 tests** | 新增全过 ✅ |
| P0-3 CEFR 映射层 | **6 tests** | 新增全过 ✅ |
| P0-5 AI 判分证据 | **4 tests** | 新增（累计 baseline-ai 10）✅ |
| P0-7 Day181–360 架构 | **5 tests** | 新增全过 ✅ |
| App TS（tsconfig.app.json / `-b`） | **0 errors** | 权威 ✅ |
| lint（eslint） | **clean** | ✅ |
| 生产构建 | **583 modules · built ~32s** | ✅（roleplay-engine 静态+动态双导入警告 + entry>500KB 警告，均为既有/P0-8 根因，如实记录） |
| Release gate（自检 1–12） | **12/12 PASS** | check 13（脚本内 spawn vitest 子进程）为 ENV-BLOCKED；其代表的全量套件已由本 host 直接 `npx vitest run` 实证 14 项全绿（见第五/七节） |
| 运行时冒烟 | `scripts/smoke-diagnosis.cjs` | **SMOKE PASS** |

---

## 二、本阶段目标（Objective）达成情况

> 目标：把 RC6 从「闭环存在」升级为「一个能**可靠运行闭环、且能发现并修复真实学习效果问题**的产品」。P0 全部完成，或对无法完成的 P0 记录 **PARTIAL + 原因**；随后写 `docs/phase-22-report.md` 并**停止**。

| P0 | 状态 | 说明 |
|---|---|---|
| **P0-6** 基线纵向（我到底进步了多少？） | **DONE** | `compareBaselines`/`withBaselineMetadata`/`SkillDelta`：档位差+评分差+置信差+证据数+分技能增损+诚实「内部估算」中文摘要；接入基线页持久化与结果视图；6 测试全过 |
| **P0-2** 闭环场景矩阵 A–P | **DONE** | 16 场景（无基线/均衡/词弱/说弱/连续挂→降1/连续成→升1/退步→仅加权/进步→不加量/无SRS到期→0/多SRS到期→加量/跳过→索引不错位/中途退出续测/刷新恢复/无AI→不伪造/AI坏JSON→安全回退/AI超时→不丢记录）全部断言通过；E/F、O/P、M 复用既有套件 |
| **P0-3** CEFR 映射层 | **DONE（核心）** | `cefr-mapping.ts`：`DerivedCefrLevel{level,confidence,source,evidenceCount,caveatZh,internalEstimate}`、4 来源强度排序（objective>algorithm>ai-grade>self-report）、`mergeCefrSources` 加权合并、`internalCefrOf`/`internalCefrFromScore`；接线进基线页结果视图（明示来源+「非官方认证」）；6 测试全过 |
| **P0-3a** 词汇关系网络（C1/C2） | **PARTIAL** | 存量 C1/C2 的 syn/ant 为**展示层字符串**（非 ID 图），`getDanglingRelations()` 恒空——**无悬挂**；但未写入 `synonymIds/antonymIds` ID 图。属既有内容深度缺口（与 P0-1 审计一致），未伪造通过 |
| **P0-5** 口语/写作判分证据 | **DONE** | `baseline-ai.ts` 扩展：AI 判分可返回 `evidenceZH`+`confidence`，`parseProductiveGrades` 容错解析（含 snake_case/非法 confidence 忽略），新增 `productiveEvidenceOf` 分技能证据汇总；接线进基线页（判分依据明示）；4 测试全过 |
| **P0-7** Day181–360 进阶架构 | **DONE（架构）** | `phase2-plan.ts`：非空、可追溯的 6 块进阶计划（流利度→学术写作→思辨→职场→媒体素养→高阶综合），含目标 CEFR 漂移 B2→C2、里程碑日映射、技能加权、`getPhase2Block` 解析器；Day 181 真实入口；5 测试全过（不伪造 180 天课文案） |
| **P0-8** 惰性 C2 分包（bundle 根因） | **PARTIAL + 原因** | 审计确认根因=`vocab/index.ts` 静态导入 202 个 group + top-level await 分包 a–s（entry 3,137 KB）。但存在**冻结核心同步消费者**（`lvm.ts`/`vocab-bank.ts`/`knowledge-model-v0.ts`/`grammar-engine-v0.ts`/`error-analysis-v0.ts` 等同步 `findLexical/allLexical`）：强行惰性 C2 会让已学 C2 词在 LVM/评估中**静默丢失**，破坏离线正确性（违反「不要为了达到数字牺牲离线体验」「Export 兼容」）。工程判断：**不冒险破坏冻结核心**，全部完成需跨模块异步化大重构（超本会话范围）。见第七节详述 |
| **P0-4** 听力质量审计与披露 | **DONE（审计）** | 听力库 A1–C2 各 3 条、可自动判分；已内置诚实披露「听/看口语句子（无音频时以文字替代，明确标注）」，**不以 TTS 冒充真实音频**。审计确认披露已充分，如实记录 |
| **P0-1** 运行时完整性审计 | **DONE（本会话项）** | 多数完整性点已被既有套件覆盖（IndexedDB 空态/undefined/skip/顺序/刷新/迁移/资源ID/移动端均已有对应测试或代码审查）。本会话新增**修复**：重型数据测试超时（`vocab.test.ts` 全量遍历 13,033 条 / `knowledge-model-v0.test.ts` Dexie 持久化 13,000+ 节点 / `skill-telemetry.test.ts` 530 次 IndexedDB 写入）经全量运行暴露后全部显式放宽超时；并将 gate 13 陈旧注记「55 files/302 tests」更正为「67 files/389 tests」 |

---

## 三、本阶段新增能力（NEW —— 本会话完成）

1. **基线纵向对比（P0-6）**：`src/study/validation/baseline-model.ts` 新增 `SkillDelta`/`BaselineComparison`/`compareBaselines`/`withBaselineMetadata`（ADD-only 可选字段，向后兼容）；首次与历次基线差（档位/评分/置信/证据/分技能增损）以诚实「内部估算」摘要呈现。
2. **闭环场景矩阵（P0-2）**：`src/study/adaptive/closed-loop-scenarios.test.ts` —— 将 A–P 16 个真实闭环场景固化为确定性引擎+DB 断言，作为**回归护栏**，防止闭环逻辑漂移。
3. **CEFR 映射层（P0-3）**：`src/study/validation/cefr-mapping.ts` —— 统一的「内部估算」CEFR 标注层（来源+置信+证据+免责），4 来源权重化合并；接入基线页结果视图。
4. **AI 判分证据（P0-5）**：`src/ai/baseline-ai.ts` —— 判分可携带中文依据+置信，`productiveEvidenceOf` 分技能汇总；接线进基线页（「判分依据：…」）。
5. **Day181–360 进阶架构（P0-7）**：`src/content/phase2-plan.ts` —— 非空、可追溯的第二阶段课程计划（6 块/目标 CEFR 漂移/里程碑/技能加权）+ `getPhase2Block` 解析器 + Day 181 真实入口。
6. **修复（P0-1/P0-4-可靠性）**：3 处重型数据测试超时显式放宽（vocab / knowledge-model-v0 / skill-telemetry）；gate 13 陈旧计数更正。

---

## 四、修改文件清单

新增（NEW）：
- `src/study/adaptive/closed-loop-scenarios.test.ts`（A–P 场景矩阵）
- `src/study/validation/cefr-mapping.ts` + `cefr-mapping.test.ts`
- `src/study/validation/baseline-longitudinal.test.ts`
- `src/content/phase2-plan.ts` + `phase2-plan.test.ts`

修改（MODIFIED）：
- `src/study/validation/baseline-model.ts`（ADD-only 纵向对比 + metadata）
- `src/pages/LearningValidationPage.tsx`（纵向摘要 + CEFR 来源行 + 判分依据；新增 import `internalCefrOf`/`productiveEvidenceOf`）
- `src/ai/baseline-ai.ts` + `baseline-ai.test.ts`（判分证据 schema）
- `src/content/vocab.test.ts` / `src/knowledge/knowledge-model-v0.test.ts` / `src/study/telemetry/skill-telemetry.test.ts`（重型测试超时显式放宽）
- `scripts/check-release-quality.cjs`（gate 13 陈旧计数 55/302 → 67/389）

未触碰（Hard Freeze）：Day1–180 课程、词库 13,033 ID 结构、SRS/Assessment/Planner/Roleplay Engine/AI Provider 架构、`SCHEMA_VERSION=7`、Export 兼容、local-first。

---

## 五、门禁与验证（REAL_APP_*）

```
检查项                                          结果
1  App TS strict（tsconfig.app.json）            ✅ 0 errors
2  Vocab strict quality                          ✅ 13033 · 0 fail
3  src 无 @ts-ignore / @ts-nocheck               ✅ clean
4  Resource quality                              ✅ 1281 unified · 13033 vocab · 0 fail
5  Learning content                              ✅ listening 50 · writing 100
6  C2 content                                    ✅ grammar topics 25
7  Grammar practice                              ✅ 7 categories · 1250 exercises
8  Data integrity                                ✅ 0 fail
9  Export integrity                              ✅ 162/162 rows · audio blob preserved
10 Telemetry quality                             ✅ 6/6 call sites · empty/invalid 0%
11 Course quality（180 days）                    ✅ 13033 vocab
12 Phonics + reading + chunks                    ✅ structural=ok（entry>500KB 为既有警告，根因见 P0-8）
13 Full unit test suite                          ✅ 本 host 实证 67 files/389 tests 全过（501s；与 workflow `npm test` 同源）
14 Asset-count reconciliation                    ✅ all counts match
-------------------------------------------------------------
RESULT                                          ✅ 14/14 全绿
```

**权威测试（本 host 直接运行，满足 P0 纪律）**：`npx vitest run` 全量实证 → **67 files / 389 tests 全过**（501s；自 Phase 21 的 63 files/352 tests → **+4 files / +37 tests**，与新增文件逐一吻合：基线纵向 6 + 场景矩阵 16 + CEFR 6 + 判分证据 4 + 进阶架构 5）。本会话 7 个相关文件单独复测 **57/57 全过**。
**构建**：`npm run build` → **583 modules · ~32s**；roleplay-engine 静态+动态双导入警告（既有，见第七节）。
**运行时冒烟**：`node scripts/smoke-diagnosis.cjs` → **SMOKE PASS**（基线→诊断→优先级→计划→难度→SRS 全链路，诚实「尚未完成基线」label）。

---

## 六、P1 审计脚本实测结果（诚实上报）

- **check-c2-depth-quality.cjs**：register/usage/nuance/colloc/example 均 100%；synonym/antonym/wordFamily 为 **0%**（结构性缺口、无悬挂）—— 与 P0-3a PARTIAL 一致。
- **check-learning-progression.cjs**：已著 180/360；基础词库用 difficulty+frequencyBand 而非 CEFR level；阅读仅 C1/C2（无低档阅读池，既有）。
- **check-bundle-budget.cjs**：entry 单块偏大（~3MB，P0-8 根因，既有可测回归）。
- 本阶段**新增正向**：单词关系网络/CEFR 层/进阶架构等以**新增模块与测试**形式落地；存量深度缺口如实披露，未伪造通过。

---

## 七、诚实披露：局限与风险（NEW ISSUE 相关）

1. **NEW ISSUE（本会话发现并修复）**：3 条重型数据测试在全量序列化运行下超 5000ms 默认超时 → 显式放宽超时至 120s，逐条单独复测通过（`vocab.test.ts` 13,033 条遍历 / `knowledge-model-v0.test.ts` 13,000+ 节点 Dexie 持久化 / `skill-telemetry.test.ts` 530 次 IndexedDB 写入）。属**测速可靠性**修复，非逻辑缺陷。全量复跑 501s 全绿实证。
2. **P0-8 = PARTIAL（重要判断）**：entry bundle ~3.1 MB（根因=`vocab/index.ts` 静态导入 202 个 group 文件 + top-level await 强制分包）。**不做激进惰性 C2 分包**，因冻结核心存在同步 `findLexical/allLexical` 消费者（`lvm.ts`/`vocab-bank.ts`/`knowledge-model-v0.ts`/`grammar-engine-v0.ts`/`error-analysis-v0.ts`/`skill-review-queue.ts`/`phonics/drills.ts`/`roleplay-engine.ts`）——强行惰性会让已学 C2 词在 LVM 评估/词汇库中静默缺失，破坏离线与 Export 兼容。**为守住「功能不变/数据ID不变/离线体验」而放弃达成 ≤500KB 数字**，如实标注。治理需把上述同步消费者异步化（大重构，超本会话范围）。
3. **ENV-BLOCKED iOS/Safari PWA QA**：本 host 无法做 iOS/Safari 的 PWA 安装/离线 QA，如实标注。
4. **P0-3a / P0-7 为 PARTIAL / 架构层**：词汇关系未写入 ID 图（既有深度缺口）；Day181–360 为**可追溯架构**而非 180 天完整课文案（不伪造占位课）。
5. **roleplay-engine 静态+动态双导入**（既有警告）：`AiTutorPage.tsx` 既静态又动态导入 roleplay-engine，动态导入未生效——记录，未改动冻结核心。

---

## 八、Hard Freeze 确认

Day1–180 课程零改动 / 词库 13,033 ID 结构不变 / SRS · Assessment · Planner · Roleplay Engine · AI Provider 架构零改动（P0-6/P0-7 以 ADD-only 字段与新增模块方式融入） / `SCHEMA_VERSION = 7` / Export 协议兼容 / local-first 不变。

---

## 九、下一阶段建议（供审核，非自动执行）

1. **P0-8 治理（优先级最高）**：把冻结核心的同步 `findLexical/allLexical` 消费者逐模块异步化为 `await ensureVocabularyLoaded()`，再对 C2 做真正惰性分包，以同时满足 bundle 预算与离线正确性——需跨模块重构立项。
2. 上线真人纵向试用：首次基线 → 练习 ≥2 周 → 再评估，采集第一条 **Progress Delta**（P0-6 现可输出）。
3. 补齐词汇关系 ID 图（针对可解析的同/反义词做子集接入 + 校验器，延续 P0-3a）。
4. 补齐低档（A1–B2）阅读池与基础词库 CEFR level 标签。
5. 打造权威 CI：把 `npm test`（本 host 现已可直接全量跑 501s 出结果）与 P1 审计统一进 workflow，使门禁 13 从「ENV-BLOCKED 依赖外部 workflow」转为仓库内一键自动验证。

---

**完成。停止，等待审核，不自动进入下一阶段。**
