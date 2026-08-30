# English360 V2 · Phase 21 Report — Closed Learning Loop（基线→诊断→计划→自适应练习→SRS→再评估→进度差）

日期：2026-08-29
状态：**PHASE 21（RC6）COMPLETE** —— 把 Phase 20 的多技能自适应基线接入一条**可验证的闭环学习链路**：`基线 → 诊断 → 个性化计划 → 自适应练习 → SRS复习 → 再评估 → 进度差(Progress Delta)`。全部按严格诚实纪律落地、以真实构建/测试/门禁为权威验证，并修复了运行时冒烟测试发现的真实缺陷（hasBaseline）。**停止，等待审核，不自动进入 Phase 22。**

---

## 〇、判断口径（Honesty 声明）

本阶段所有条目均按以下 6 类如实标注：
- **DONE**：已完成并通过验证
- **PARTIAL**：部分完成（有明确边界）
- **NOT DONE**：明确未做
- **PRE-EXISTING**：会话前已存在，本会话未改动
- **NEW ISSUE**：本会话发现/修复的问题
- **ENV-BLOCKED**：环境限制导致无法验证（诚实标注，**绝不伪造 PASS**）

权威口径：一律以真实 App 构建 / `npx vitest run` / 门禁脚本 / 运行时冒烟为**权威**结果。

---

## 一、核心指标（REAL_APP_* 实测）

| 指标 | 数值 | 说明 |
|---|---|---|
| AUTHORED_DAYS | **180** | 未动（Hard Freeze）✅ |
| SCHEMA_VERSION | **7** | 未动（Hard Freeze）✅ |
| Vocabulary | **13,033** | 0 失败（IPA/ID/field/colloc/band/diff）✅ |
| App TS（tsconfig.app.json） | **0 errors** | 权威 ✅ |
| 生产构建 | **582 modules · built in ~17.8s** | ✅ |
| Entry bundle | `index-*.js` **3,212.18 kB**（gzip 1,173.35 kB） | >500kB 为既有警告（含必含词汇内容）；本会话闭环为程序化轻量层 |
| 新增代码分割 chunk | `DiagnosisPage-*.js` **13.57 kB** | 懒加载 ✅ |
| Release gate | **13/14** 自检通过 | check 13 = ENV-BLOCKED（诚实标注，见第五节） |
| 全量测试 | **63 files / 352 tests** | 全过 ✅（原 55/302；+8 自适应模块） |
| 自适应测试（7 引擎 + 闭环） | **49 tests / 8 files** | 全过 ✅ |
| 运行时冒烟 | `scripts/smoke-diagnosis.cjs` | **SMOKE PASS**（并据此修复 hasBaseline 缺陷）|

> 三只 P1 审计脚本（`check-c2-depth-quality.cjs` / `check-learning-progression.cjs` / `check-bundle-budget.cjs`）均已真实运行并如实上报（见第六节），未伪造通过。

---

## 二、本阶段目标（Objective）达成情况

> 目标：把 Phase 20 六技能自适应基线接到真实、可验证的闭环学习链路（基线→诊断→个性化计划→自适应练习→SRS→再评估→进度差），遵守严格诚实规则、以真实 App 验证为权威，并产出 `docs/phase-21-report.md`。随后**停止**，不自动进入 Phase 22。

| 目标项 | 状态 | 说明 |
|---|---|---|
| 闭环链路（Baseline→Diagnosis→Plan→Practice→SRS→Reassessment→Delta） | **DONE** | 7 个 P0 引擎 + `adaptive-runtime` 胶水 + 页面 |
| 7 个 P0 自适应引擎 | **DONE** | learner-profile / skill-priority / difficulty-controller / adaptive-plan / error-remediation / skill-review-queue / reassessment |
| P0 引擎为纯/确定性模块 | **DONE** | 可单测；`adaptive-runtime.ts` 为 DB 胶水 |
| 闭环集成测试 | **DONE** | 3 条（A-H / 全进步保持 / 检查点诚实） |
| Skill Review Queue 叠加冻结 SRS | **DONE** | 增量包装，不改动 SRS 核心 |
| 再评估检查点日 [1,7,30,60,90,180,360] | **DONE** | 仅提醒、不强制六技能全测（`CHECKPOINT_DAYS`）|
| `adjustPlanFrom` 仅提升退步技能 | **DONE** | 负 delta 才会改变 nextFocus |
| CEFR 诚实标注（非官方认证） | **DONE** | 页面 + 运行时 label 全程「内部估算，非官方」 |
| 口语/写作自评标注 | **DONE** | `selfReportedSkills=["speaking","writing"]` + `（自评）`徽标 |
| 听力不以 TTS 冒充真实音频 | **DONE** | 资源库明示「外部真语料」分类 + 诚实披露条 |
| 6 类分类（DONE/PARTIAL/NOT DONE/PRE-EXISTING/NEW ISSUE/ENV-BLOCKED） | **DONE** | 本报告全文采用 |
| ENV-BLOCKED 诚实标注、不伪造 PASS | **DONE** | gate 13（vitest 子进程）与 iOS/Safari PWA QA |
| 诊断/计划页接线进 App | **DONE** | `#/diagnosis` + 底部导航「诊断」 |
| 写 `docs/phase-21-report.md` 后停止 | **DONE** | 本文档；不自动进入 Phase 22 |

---

## 三、本阶段新增能力（NEW —— 本会话完成）

### 3.1 七个 P0 自适应引擎（`src/study/adaptive/`）—— 纯、确定性、可单测

1. **learner-profile.ts**：把 Phase 20 `BaselineResult` + 学生模型（productive/receptive AbilityRow.score）合成 `LearnerProfile`——六技能 `ProfileSkill{band,score,confidence,selfReported}`、强弱项排序、receptive/productive 差距、六项技能 gap、强度/每日分钟/专注比建议、诚实 `notesZh`。每个 CEFR 值都是「English360 内部估算」。
2. **skill-priority.ts**：`skillWeight(profile)` → 按缺口/confidence 归一化六个技能优先级；`normalizedPriorities` 供计划消费。
3. **difficulty-controller.ts**：把近期表现映射到下一练习 CEFR 难度档，含护栏（单次对不升级、单次错不降级、只移动相邻档、永不卡死、降级封底 A1）。
4. **adaptive-plan.ts**：`buildAdaptivePlan` 把可用分钟切成十个 block（core-lesson/vocabulary/srs-review/weak-remediation/listening/speaking/reading/writing/grammar/checkpoint），瓶颈技能拿最大份额、无缺口技能归零、SRS 在无到期项时诚实归零。
5. **error-remediation.ts**：把最近错误归类为具体补救动作（复用 `loadRemedialCard`/`findLexical` 拉取对应练习）。
6. **skill-review-queue.ts**：封装冻结 SRS（`getDueCards`）成按技能聚合的到期视图，增量、零改动 SRS 核心。
7. **reassessment.ts**：`computeDelta`（进度差）+ `adjustPlanFrom`（仅负 delta 技能提升）+ `CHECKPOINT_DAYS=[1,7,30,60,90,180,360]` + `nextCheckpoint`。检查点是**提醒而非强制**六技能全测（诚实纪律）。

### 3.2 运行时胶水（DB 接线）

- **adaptive-runtime.ts**：`buildAdaptiveDiagnosis(opts)` 一站式装配 `loadBaselineCache` + `getProductiveAbility`/`getReceptiveAbility` + `skillWeight` + 每技能 `decideNextDifficulty` + `dueSkillCount` + `buildAdaptivePlan`，返回 `AdaptiveDiagnosis{hasBaseline, profile, priorities, plan, difficulty, dueReviewCount, honestyLabel}`。诚实标签在此边界统一注入。

### 3.3 诊断/计划页（`#/diagnosis`）

- **DiagnosisPage.tsx**（懒加载，13.57 kB code-split）：展示能力画像（每技能 CEFR 徽标 + 自评标注 + 分数 + 置信度）、今日自适应计划（每个 block 分钟 + 理由）、技能优先级、下次难度档位、到期复习数；所有 CEFR 值都带「内部估算，非官方 CEFR 认证」提示。
- **router.ts + App.tsx**：新增 `diagnosis` 路由 + 底部导航「诊断」。

### 3.4 资源分类 + 诚实披露（听力/阅读）

- **resource-engine.ts**：`ResourceItem.sourceKind` 新增 `inApp`（内置离线）与 `externalAuthentic`（第三方真实语料）。听力/视频全部 `externalAuthentic`（真实播客/讲座/广播，跳转官网），阅读/语法/口语/写作题目全部 `inApp`。
- **LibraryPage.tsx**：顶部披露条明示「本 App 不提供内置音频，也不会把机器合成语音冒充真实听力素材」；每个资源加「内置 / 外部真语料」徽标。
- **resource-engine.test.ts**：新增断言——所有离线资源须为 `inApp`、所有外部资源须 `externalAuthentic` 且以 `https://` 开头、**所有听力资源必须 `externalAuthentic` 且 `offlineAvailable=false`**（杜绝 TTS 冒充）。

### 3.5 三只 P1 审计脚本（已真实运行）

- **check-c2-depth-quality.cjs**：抽样 C1/C2 验证 register/usage/meaningNuance/collocations/examples 与同义/反义/词族关系覆盖。
- **check-learning-progression.cjs**：验证 180/360 天覆盖、词汇 CEFR 档位分布、四技能资源池深度、自适应闭环静态存在（reassessment checkpoints + delta/adjust）。
- **check-bundle-budget.cjs**：审计生产 dist JS 总大小、最大 chunk、entry 占比、code-split chunk 数。

### 3.6 运行时冒烟 + 真实缺陷修复（NEW ISSUE → 已修复）

- **scripts/smoke-diagnosis.cjs**：用 esbuild + fake-indexeddb 在 Node 下真实执行 `buildAdaptiveDiagnosis()`。
- **修复**：初版 `hasBaseline: baseline !== null` 在 `cache.latest === undefined`（空库）时误判为 `true`（`undefined !== null` 为真），导致「尚未完成基线」诚实标签与实际冲突。改为 `baseline != null` 后一致（`hasBaseline=false` + 「尚未完成」）。

---

## 四、修改文件清单

### 新增（NEW）
- `src/study/adaptive/learner-profile.ts`、`skill-priority.ts`、`difficulty-controller.ts`、`adaptive-plan.ts`、`error-remediation.ts`、`skill-review-queue.ts`、`reassessment.ts`.
- `src/study/adaptive/adaptive-runtime.ts`（DB 胶水）
- `src/study/adaptive/*.test.ts` ×8（learner-profile 9 / skill-priority 5 / difficulty 10 / adaptive-plan 7 / error-remediation 4 / skill-review-queue 4 / reassessment 7 / closed-loop 3 = **49 tests**）
- `src/pages/DiagnosisPage.tsx`
- `scripts/check-c2-depth-quality.cjs`、`check-learning-progression.cjs`、`check-bundle-budget.cjs`、`smoke-diagnosis.cjs`

### 修改（修改）
- `src/content/resources/resource-engine.ts`（+`sourceKind`，全库赋值）
- `src/content/resources/resource-engine.test.ts`（+2 分类断言）
- `src/pages/LibraryPage.tsx`（披露条 + 分类徽标）
- `src/router.ts`（+`diagnosis` 路由）
- `src/App.tsx`（懒加载 + 渲染 + 导航项）
- `src/study/adaptive/adaptive-runtime.ts`（`hasBaseline` 修复 `!==`→`!=`）

### PRE-EXISTING（未在本会话改动）
- Phase 20 基线系统（`adaptive.ts`/`baseline-model.ts`/`session.ts`/`run-baseline.ts`/banks/`baseline-ai.ts`）
- Day1–180 课程 / 词库 g100–g270（13,033）/ SRS / Assessment / Planner / Roleplay / AI Provider（Hard Freeze）

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
12 Phonics + reading + chunks                    ✅ structural=ok（entry>500KB 为既有警告）
13 Full unit test suite                          ⚠️ ENV-BLOCKED（host 子进程可靠性问题，权威=workflow `npm test`；本 host 实测 63 files/352 tests 全绿）
14 Asset-count reconciliation                    ✅ all counts match
-------------------------------------------------------------
RESULT                                          ✅ 13/14（check 13 诚实标注 ENV-BLOCKED）
```

**权威测试（本 host 直接运行，满足 P0 纪律）**：`npx vitest run` → **63 files / 352 tests 全过**（原 55 files / 302 tests；本会话 +8 files / +50 tests：自适应 49 + resource-engine 1）。
**构建**：`npm run build` → 582 modules / `DiagnosisPage-*.js` 13.57 kB code-split / entry 3,212.18 kB。
**自适应专项**：`npx vitest run src/study/adaptive` → **49 tests 全过**。
**运行时冒烟**：`node scripts/smoke-diagnosis.cjs` → **SMOKE PASS**（并修复 hasBaseline 缺陷）。

---

## 六、P1 审计脚本实测结果（诚实上报）

### 6.1 `check-c2-depth-quality.cjs`（抽样 200 C1 + 200 C2）
- register / usage / meaningNuance：**C1、C2 均 100%**
- collocations / example：**均 100%**
- synonym / antonym / wordFamily ids：**均为 0%**（结构性缺口，无悬挂引用）
- **PARTIAL**：深度字段（register/usage/nuance/colloc/example）完备，但词汇关系（同义/反义/词族）在存量词库中未填充 —— 属内容深度 gap，如实披露，未伪造通过。

### 6.2 `check-learning-progression.cjs`（诚实）
- 已著天数：**180/360**（延续既有 Hard Freeze；>180 靠 `factory`/`generated-days` 动态扩展，Day 编号 1–180 连续唯一）。
- 词汇 CEFR `level` 标签：仅 C1=229 / C2=7,790 带 `level`（合计 8,019/13,033）；**基础词库用 `difficulty`+`frequencyBand` 而非 CEFR level**（8/11 难度桶有分布）。如实说明，非缺陷但为既有覆盖特征。
- 阅读文章档位：`difficulty` 字段 C1/C2（不存在 A1–B2 阅读文章，即**无低档阅读池**，为既有局限）。
- 各技能资源池：Reading 23 / Listening 50 / Writing 100 / Speaking(任务+辩论) 1050。
- 自适应闭环存在性：reassessment checkpoints ✅ / computeDelta+adjustPlanFrom ✅ / dueSkillCount ✅。
- **PARTIAL**（既有）：低档阅读池缺失、基础词库缺 CEFR level 标签——非本会话新增缺陷。

### 6.3 `check-bundle-budget.cjs`（诚实）
- 产物 JS：46 assets / 总 **5.19 MB**；最大 chunk `index-*.js` **3.06 MB**（entry 占比 ~59%）。
- LibraryPage chunk **0.77 MB**、其余 <0.24 MB 的 code-split 若干（非 entry chunk 45 个）。
- **PARTIAL**：entry 单块偏大（Phase 17 时 ~400kB，Phase 20 词库扩张后 ~3MB）——**可测回归，需后续治理**，非本会话新增；如实上报非伪造。

---

## 七、诚实披露：局限与风险（NEW ISSUE 相关）

1. **NEW ISSUE（本会话发现并修复）**：`hasBaseline !== null` 在 `latest=undefined` 时误判 `true`，与「尚未完成基线」诚实标签冲突。已改为 `!= null`，冒烟复测一致。
2. **ENV-BLOCKED gate 13**：host 的 Node 子进程无法稳定 spawn vitest（与 Phase 20 相同），门禁脚本对该项诚实标注 ENV-BLOCKED（**绝不伪造 PASS**）；权威为 workflow `npm test`，而本 host 直接 `npx vitest run` 已实测 63/352 全绿。
3. **ENV-BLOCKED iOS/Safari PWA QA**：本 host 无法进行 iOS/Safari 的 PWA 安装/离线性 QA，如实标注，不做「已通过」声明。
4. **词汇关系（同义/反义/词族）在存量词库未填充**（6.1）：深度字段完备但关系层空，属内容深度 PARTIAL。
5. **阅读池仅 C1/C2、基础词库缺 CEFR level 标签**（6.2）：既有覆盖特征，非本会话新增。
6. **Entry bundle 偏大**（6.3）：Phase 20 词库扩张后的既有可测回归，需后续治理（不在本会话范围）。
7. **CEFR 一律为「English360 内部估算」**：审判页、运行时、诊断页全程明示「非官方 CEFR 认证」；口语/写作为自评或未接 AI 判分时明确 `（自评）`，绝不与客观测试等权。

---

## 八、Hard Freeze 确认

Day1–180 课程零改动 / 词库 g100–g270 结构不变（13,033）/ SRS · Assessment · Planner · Roleplay Engine · AI Provider 架构零改动（闭环以**增量**包装 Skill Review Queue，不触碰冻结核心）/ SCHEMA_VERSION = 7 / Export 协议兼容旧版 / local-first 不变。

---

## 九、下一阶段建议（供审核，非自动执行）

1. 启动真人试用闭环：基线 → 诊断页 → 按计划练习 ≥2 周 → 再评估，采集首条 **Progress Delta** 数据。
2. 治理 Entry bundle（3.06 MB）与 LibraryPage chunk（0.77 MB）：进一步 code-split 或按需加载词库分片。
3. 补齐低档（A1–B2）阅读池 + 基础词库 CEFR level 标签，提升学习进度审计覆盖率。
4. 为词汇条目补充同义/反义/词族关系，补足 C2 深度层。
5. 打造权威 CI：把 `npm test` 与 P1 审计脚本统一进 workflow，使 gate 13 从 ENV-BLOCKED 转为可自动验证。

---

**完成。停止，等待审核，不自动进入 Phase 22。**
