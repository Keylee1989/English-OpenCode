# English360 V2 · Phase 10-B Report

日期：2026-08-25
状态：**PHASE 10-B COMPLETE — Day 1-180 全部可学习，AUTHORED_DAYS = 180**

---

## 一、最终数据

| 指标 | Phase 10-A | Phase 10-B 实测 | 目标 |
|---|---|---|---|
| AUTHORED_DAYS | 150 | **180** | = 180 ✅ |
| Vocabulary | 5014 | **5014**（未动） | ≥ 5000 ✅ |
| SCHEMA_VERSION | 7 | 7（未动） | 保持 v7 ✅ |
| 课程引用解析 | — | **100%**（vocab/grammar/phonics） | 100% ✅ |

---

## 二、完成内容

### Task 1 · Day 151-160「Advanced Communication I」
新增 `src/content/pipeline/plan-151-160.ts`（10 天，每条均走 buildDay() pipeline）：

| Day | 主题 |
|---|---|
| 151 | 表达个人观点（观点+理由框架） |
| 152 | 提供理由和证据（For example / According to / That's why） |
| 153 | 同意与不同意（先接后转、礼貌反对） |
| 154 | 澄清误解（Just to clarify / What I meant was） |
| 155 | 解释复杂事情（类比+三步法） |
| 156 | 描述变化趋势（方向动词+程度副词） |
| 157 | 表达情绪和态度（命名情绪、专业态度） |
| 158 | 正式与非正式表达转换（语域切换） |
| 159 | 社会话题讨论（两面呈现 It depends on） |
| 160 | 综合交流训练（复习：沟通工具箱） |

重点消耗词库：g136 language-discourse、g142 descriptive-precision、g144 verbs-nuance、g140 idioms-expressions ✅

### Task 1 续 · Day 161-170「Real American Life Advanced」
新增 `src/content/pipeline/plan-161-170.ts`（10 天）：
医疗保险沟通(161)、医院账单问题(162)、政府服务沟通(163)、税务基础(164)、银行账户问题(165)、租房纠纷(166)、工作反馈会议(167)、职业发展讨论(168)、正式投诉与解决(169)、美国生活综合模拟(170 复习)。
重点消耗：g110 medicine-treatment、g113 government-politics、g114 law-crime、g115 economics-trade、g126 business-strategy，并复用 g94/g65/g22 财务词库 ✅

### Task 2 · Day 171-180「Phase 1 Final Assessment」
新增 `src/content/pipeline/plan-171-180.ts`（10 天结业测评带）：
Listening Final(171) → Speaking Final(172) → Writing Final(173) → Reading Final(174) → Daily Life Simulation(175) → Workplace Simulation(176) → Free Conversation(177) → Error Bank Review(178) → Comprehensive Assessment(179) → **Final Growth Report + Graduation Lesson(180)**。

### Task 3 · 接入 generated-days
`generated-days.ts` 追加 PLAN_151_160 / PLAN_161_170 / PLAN_171_180。经 Map 去重排序后输出 Day91-180；与 Day1-90 手写内容拼合后 **AUTHORED_DAYS = DAYS.length = 180，无重复、无缺失、无乱序**（由测试断言）。

### Task 4 · 课程质量门禁
新增 `scripts/check-course-quality.cjs`：用 esbuild 将内容图打包后在运行时校验——
- Day 1..180 存在、连续、唯一、有序；
- 每日结构九项映射校验：lesson(title/goal)、vocabulary(≥5 且全部 findLexical 解析)、grammar(Grammar Engine 12 主题内)、listening(pattern.practiceSentences ≥2)、speaking(examples ≥3)、reading(≥1 行)、writing(zh+hintEn)、review(阶段收束课：30/60/90/100/110/130/150/160/170/180 必须含 review/synthesis 标记)、assessment(每日练习引擎输入完备 + 里程碑日存在)；
- grammarRuleIds / phonicsRuleIds / pairIds 全量解析；
- Placeholder 扫描（TODO/placeholder/???/mock/temp/fix later）覆盖标题、目标、句型、阅读、写作全部字符串。

### Task 5 · 测试更新
- 新增 `src/content/course-quality.test.ts`（8 用例）：Day151 存在、Day180 存在、180 天连续、vocab 全解析、grammar 全解析、phonics 全解析、无 placeholder、阶段收束课齐全。
- 常量口径同步（150→180）：content/index.test.ts（含边界 getDayContent(181)=null）、tutor/context-builder.test.ts、knowledge/knowledge-model-v0.test.ts、study/integration-day1.test.ts。

---

## 三、顺带修复的存量缺陷（课程内容层，未触碰禁区）

1. **Day28 days-extended.ts**：phonicsRuleIds 含不存在的 `"tch"` → 改为 `"sh"`（此前各期门禁漏检）。
2. **Day132 plan-131-137.ts**：vocabIds 中 `w:rate` 重复导致仅 4 个有效引用 → 替换为 `w:credit-score-three-digit-adulthood-report-card`。

按规范处理：修正引用而非放宽检查。

---

## 四、最终门禁结果（全绿）

```
npm run lint               ✅ PASS
npm run typecheck          ✅ PASS
npm test                   ✅ 34 文件 / 200 用例 全通过（含新增 course-quality.test.ts）
npm run build              ✅ 成功（PWA 正常）
node scripts/check-chunks.cjs        ✅ ALL CHUNK CHECKS PASSED（入口 471.8 KB ≤ 500 KB）
node scripts/check-vocab-quality.cjs ✅ 0 dup / 0 issues
node scripts/check-course-quality.cjs ✅ Days=180, Failures=0
```

运行时实测：`DAYS loaded: 180 (expected 180)`、`Vocabulary model: 5014 entries`。

---

## 五、变更清单

新增：
- `src/content/pipeline/plan-151-160.ts`
- `src/content/pipeline/plan-161-170.ts`
- `src/content/pipeline/plan-171-180.ts`
- `scripts/check-course-quality.cjs`
- `src/content/course-quality.test.ts`
- `docs/phase-10B-report.md`

修改：
- `src/content/pipeline/generated-days.ts`（追加三个 plan 的接入）
- `src/content/index.test.ts` 等 4 个测试文件的常量口径（150→180）
- `src/content/days/days-extended.ts`（Day28 phonics 引用修复）
- `src/content/pipeline/plan-131-137.ts`（Day132 vocab 引用修复）

未动（遵守禁区）：db.ts / SCHEMA_VERSION / AI Provider / Conversation schema / Roleplay Engine / SRS Engine / Assessment Engine / Vocabulary chunk loader / 词库数据 g100-g150。

---

## 六、Phase 10-B 完成定义核对

- [x] Vocabulary ≥ 5000（5014）
- [x] AUTHORED_DAYS = 180
- [x] Day 1-180 全部可学习（结构完整、引用全解析、无 placeholder）
- [x] 所有引用 100% 解析
- [x] 所有测试通过（lint/typecheck/test/build/chunks/vocab/course-quality）

**等待审核，不进入 Phase 11。**
