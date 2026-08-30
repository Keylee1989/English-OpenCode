# English360 V2 · Phase 20 Report — Adaptive Learning Validation / Baseline System（多技能自适应基线）

日期：2026-08-29
状态：**PHASE 20（自适应基线扩展）COMPLETE** —— 将原有「仅词汇」Learning Validation Mode 扩展为覆盖 词汇/语法/阅读/听力/口语/写作 六技能的自适应能力基线系统，含持久化与档位变化追踪。

---

## 〇、判断口径（Honesty 声明）

本阶段所有条目均按以下类别如实标注：
- **DONE**：已完成并通过验证
- **PARTIAL**：部分完成（有明确边界）
- **NOT DONE / PRE-EXISTING / NEW ISSUE**：分别标注未做 / 会话前已存在 / 新发现问题
- **REAL_APP_***：一律以真实 App 构建/tests/门禁结果为**权威**（root `tsc` ≠ App 通过）

---

## 一、核心指标（REAL_APP_* 实测）

| 指标 | 数值 | 说明 |
|---|---|---|
| AUTHORED_DAYS | **180** | 未动（Hard Freeze）✅ |
| SCHEMA_VERSION | **7** | 未动（Hard Freeze）✅ |
| Vocabulary | **13,033** | 0 失败（IPA/ID/field/colloc/band/diff）✅ |
| App TS（tsconfig.app.json） | **0 errors** | 权威 ✅ |
| 生产构建 | **575 modules · built in ~10s** | ✅ |
| Entry bundle | `index-*.js` **3,211.48 kB**（gzip 1,173.14 kB） | 与构建前持平（自适应为程序化词库，几乎零增量）；>500kB 为既有警告（含必含词汇内容），非新增回归 |
| 新增代码分割 chunk | `LearningValidationPage-*.js` **37.66 kB** | 懒加载 ✅ |
| Runtime module graph | **46 chunks / 0 missing** | "RUNTIME MODULE GRAPH OK" ✅ |
| Release gate | **13/14** 自检通过 | check 13 = ENV-BLOCKED（诚实标注，见第五节） |
| Tests | **55 files / 302 cases** | 全过 ✅（原 53/277；+19 baseline +6 baseline-ai） |

> 词汇量 13,033 中包含**本会话前已预制**的 Phase 20 g251–g270（音乐理论/量子计算/密码学/信息论等 20 个 C2 词群）——此部分标记为 **PRE-EXISTING**，未在本会话重复编写；本会话新增的是 13033 基础上的**校验/基线**层。

---

## 二、本阶段目标（Objective）达成情况

> 目标：把仅词汇的 Learning Validation Mode 扩展为多技能自适应基线系统，覆盖 6 技能 + 综合，每技能 CEFR 对齐估算（诚实标注，绝不伪造官方认证），跨 Day 30/60/90/180/360 档位变化，复用现有 `settings` 表持久化（SCHEMA_VERSION=7 冻结）。

| 目标项 | 状态 | 说明 |
|---|---|---|
| 6 技能 + 综合基线 | **DONE** | vocab/grammar/reading/listening/speaking/writing + overall |
| CEFR 对齐估算（诚实） | **DONE** | 明确显示「估算，非官方认证」+ 置信度 + 证据 + 局限 |
| 受接受/产出维度区分 | **DONE** | `Probe.productive` 区分接受性(选择/填空/听写)与产出性(口语/写作) |
| 档位变化追踪（Day30…360） | **DONE** | `bandDeltaFrom` 前后对比 + `history` 记录多次 |
| settings 持久化、SCHEMA_VERSION=7 冻结 | **DONE** | settings 键 `adaptive-baseline`/`adaptive-latest`/`adaptive-history` |
| 保护既有核心（SRS/Assessment/Planner/Roleplay/AI Provider/local-first） | **DONE** | 全部零改动（Hard Freeze） |
| 增量/惰性/向后兼容 | **DONE** | 只加不改，新子模块懒加载 |

---

## 三、本阶段新增能力（NEW —— 本会话完成）

1. **自适应估分引擎** `adaptive.ts`
   - 确定性、可测试的 Elo 启发式（非标定 IRT）：`PRIOR_RATING=1200`、`DEFAULT_K=48`、`estimateFromTrials`
   - `CEFR_LEVELS` + 阈值穿越循环 `cefrForElo`（边界语义已修复）
2. **六技能题库 banks/**（每个 band 至少 16 条，A1–C2 全档位）
   - `vocab-bank.ts`：程序化生成（recognition/recall/collocation），`allLexical()` 驱动，几乎零体积
   - `grammar-bank.ts`：24 条（4/band）
   - `reading-bank.ts`：18 条微篇章 + 3/band（MCQ 理解）
   - `listening-bank.ts`：18 条听写填空（3/band）
   - `speaking-bank.ts`：18 条观点口述（3/band）
   - `writing-bank.ts`：18 条短文（3/band）
3. **会话编排** `session.ts`：`bandSweep`（带内扫描）、`planSkill`、`gradeProbeAnswer`（选择题/回忆/听写/改错自动判分）、`estimateFromSkillAnswers`
4. **基线模型 + 持久化** `baseline-model.ts`
   - `overallFromSkills`（按题量加权综合档位/置信度/分数）、`bandDeltaFrom`（档差）
   - `persistBaselineResult` + `loadBaselineCache`（IndexedDB settings，SCHEMA_VERSION=7 不动）
   - 内置 `DEFAULT_LIMITATIONS`（诚实披露）
5. **轮次装配** `run-baseline.ts`：`buildAllRounds`、`SKILL_ROUND_SIZE`、`SKILL_LABELS_ZH`
6. **AI 产出判分** `ai/baseline-ai.ts`：`gradeProductiveBatch`（严格 JSON 批量、索引校验）、`parseProductiveGrades`；无 AI 时不伪造，退回结构化自评
7. **页面重写** `LearningValidationPage.tsx`：
   - 多技能自适应 walk（每技能轮次拍平为有序单题流、逐题作答）
   - 自动判分（选择/填空/听写/改错）+ 口语/写作可选 AI 判分或自评
   - 结果：综合档位 + 每技能档位/分数/置信度/题量 + 相对首测 ±N 档 + 局限披露 + 历史次数
   - 遥测 `track({ skill, interaction:"self-assess", meta:{source:"adaptive-baseline",...} })`
8. **CSS**：`global.css` 新增 `.tag/.en-prompt/.area/.selfcheck/.overall/.delta/.skill-table/.tested/.limitations/.btn-selected`
9. **测试**：`baseline.test.ts`（19）+ `baseline-ai.test.ts`（6）

---

## 四、修改文件清单

### 新增（NEW）
- `src/study/validation/adaptive.ts`
- `src/study/validation/baseline-model.ts`
- `src/study/validation/session.ts`
- `src/study/validation/run-baseline.ts`
- `src/study/validation/baseline.test.ts`
- `src/study/validation/banks/types.ts`、`vocab-bank.ts`、`grammar-bank.ts`、`reading-bank.ts`、`listening-bank.ts`、`speaking-bank.ts`、`writing-bank.ts`
- `src/ai/baseline-ai.ts`、`src/ai/baseline-ai.test.ts`

### 修改（修改）
- `src/pages/LearningValidationPage.tsx`（仅词汇 → 多技能自适应重写；含**索引键 Record 对齐修复**）
- `src/styles/global.css`（新增自适应汇总样式类）
- `src/App.tsx`（`#/validate` → `LearningValidationPage`，懒加载）
- `scripts/check-release-quality.cjs`（check 13 权威计数更新为 55/302）

### PRE-EXISTING（未在本会话改动）
- `src/content/vocab/groups/g251–g270`（Phase 20 预制 C2 词群，计入 13,033）
- `src/study/validation/lvm.ts`、`lvm.test.ts`、`src/ai/lvm-service.ts`、`lvm-service.test.ts`（原仅词汇 LVM 保留）
- Day1–180 课程 / SRS / Assessment / Planner / Roleplay / AI Provider（Hard Freeze）

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
13 Full unit test suite                          ⚠️ ENV-BLOCKED（host 子进程可靠性问题，权威=workflow `npm test` —— 本 host 实测 55 files/302 tests 全绿）
14 Asset-count reconciliation                    ✅ all counts match
-------------------------------------------------------------
RESULT                                          ✅ 13/14（check 13 诚实标注 ENV-BLOCKED）
```

> **权威测试结果（本 host 直接运行，满足 P0 纪律）**：`npx vitest run` → **55 files / 302 tests 全过**（含新增 baseline 19 + baseline-ai 6）。
> **构建**：`npm run build` → 575 modules / `LearningValidationPage-*.js` 37.66 kB 代码分割 / entry 3,211.48 kB 与构建前持平。
> **运行时图**：46 chunks / 0 missing，OK。

---

## 六、诚实披露：局限与风险（NEW ISSUE 相关）

1. **签为估算、绝不伪造官方 CEFR 认证**：结果明确标注「非官方 CEFR 认证」，附置信度 + 证据（题量/正确数）+ 局限列表。产出性口语/写作在无 AI 时**从不自动打分**，仅记录学习者自评（诚实，但置信度相应降低并明确提示）。
2. **算法为启发式 Elo，非标定 IRT**（设计决定，已标注）：确定性、可测试，但不是标准参考测评，不宣称与官方量表统计等价。
3. **NEW ISSUE（本会话修复）**：页面初版把 `answers` 建成**压缩数组**传入 `estimateFromSkillAnswers`，而该函数契约是**按题目索引的 `Record<number, ProbeAnswer|null>`**——若有任一题被跳过会导致错位。已重构为索引键 Record，tsc/构建/推理复查通过。
4. **听力题依赖朗读播放本地口语句子 + 填空**，非真实音频文件；属可接受的启发式近似。
5. **口语/写作需连接 AI 或自评**：未连 AI 时这些维度为自评驱动，跨次对比置信度偏低。
6. Entry bundle >500 kB 为**既有**警告（含全部必含词汇内容），本会话零增量；如需治理可后续将 HomePage 懒加载（不在本会话范围）。

---

## 七、Hard Freeze 确认

Day1–180 课程零改动 / 词库 g100–g270 结构不变 / SRS · Assessment · Planner · Roleplay Engine · AI Provider 架构零改动 / SCHEMA_VERSION = 7 / Export 协议兼容旧版 / local-first 不变。

---

## 八、下一阶段建议（供审核，非自动执行）

1. 组织真人运行多技能基线，收集首份**技能剖面 + 档位追踪**数据。
2. 为听力补真实音频资源，将听写启发式升级为真实听测。
3. 长期可引入约束召回/校准样本，把 Elo 启发式升级为校准版测评（需明确标注仍非官方认证）。
4. Entry bundle 治理（可选）。

---

**完成。停止，等待审核，不自动进入 Phase 21。**
