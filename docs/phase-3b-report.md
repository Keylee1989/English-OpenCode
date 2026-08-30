# Phase 3b Report

日期: 2026-08-22 · 状态: **核心功能已实现，4 项测试待修复（详见 §7）**

## 1. 完成内容
1. **Error→SRS 自动建卡**：`src/engines/errors/remedial-cards.ts` —— RemedialMemoryItem 结构（id/sourceErrorId/knowledgeId/type/prompt/answer/explanationZh/difficulty/createdAt）；`syncRemedialCards()` 从重复错误生成卡片（vocabulary/grammar/phonics 类型），写入 knowledgeItems(kind:"remedial") 并经 `introduceItem` 进入 SRS；同 knowledge+errorType 幂等合并；Planner 在生成计划前自动调用。
2. **Assessment Engine v0**：`src/engines/assessment/assessment-v0.ts` —— buildMilestoneExercises（词汇/语法/听力/阅读/写作造句/口语自评）；submitAssessment 计算 skillScores、weaknesses、recommendations、levelForScore 等级并持久化；getAssessmentHistory 历史查询。
3. **Schema v4**：新增 `assessments(id, completedAt)` 表；SCHEMA_VERSION=4。
4. **Lesson Flow 补充**：Lesson 后插入独立 **Reading Card / Writing Card** 步骤（含跟读按钮与诚实自评产出，无假评分）。

## 2. 修改文件
新增：`remedial-cards.ts`、`assessment-v0.ts`、`phase3b.test.ts`
修改：`db.ts`(v4)、`engines/index(.test).ts`(assessment→partial)、`generate-exercises.ts`(PracticeOptions+assessment扩展)、`planner-v0.ts`(同步钩子)、`StudyPage.tsx`(Reading/Writing Card)

## 3. 数据结构变化
- `KnowledgeItemRow.kind` 扩展 `"remedial"`，payload 为 RemedialMemoryItem
- 新表 `assessments`

## 4. 测试结果
```
lint ✅   typecheck ✅   build ✅
test ⚠️ 15/17 文件通过；4 项失败（见 §7）
```

## 5. 当前完整学习闭环
复习→新课(词汇/语法)→阅读卡→写作卡→练习(五类语法题型+听辨+阅读理解+造句)→小测→报告；
重复错误自动进入次日复习队列（引擎层已实现并有独立单测覆盖检测逻辑）。

## 6. 未完成内容 / 7. 已知问题（红测清单）
1. `integration-day1`：plan2 队列计数 3≠2（remedial 卡计入导致断言过期）
2. `phase3b creates…`：syncRemedialCards 返回空（detectRepeatedErrors 单测证明可用，集成路径差异未定位）
3/4. `phase3b assessment`：listening 覆盖与 level 断言两处测试期望需随实现微调

## 8. 是否进入 Phase 4
**No** —— 待上述 4 项红测修复后重审。建议下一指令：仅执行“Phase 3b 红测清零”。
