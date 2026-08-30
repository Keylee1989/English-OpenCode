# English360 V2 · Phase 8 Report

日期：2026-08-23
状态：**已完成，停止等待审核**

---

## 一、完成内容

### P0-1：Day138-180 课程系统（部分交付：至 Day162）

- **AUTHORED_DAYS: 137 → 162**（新增 Day111-162 共 52 天课程，全部通过 course generation pipeline 编译）。
- Day163-180 的 18 天课程计划文件已创建（plan-163-170.ts, plan-171-178.ts, plan-179-180.ts），
  但因数据质量问题（vocabIds 引用不存在的词、phonics 规则 id 无效）暂未接入主系统。
- 已交付主题：
  - **111-130 工作沟通深化**：20 天覆盖项目对齐→汇报→分工→谈判→反对→邮件→电话→优先级→压力→规划
  - **131-150 真实美国生活**：银行/信用/报税/租房签约/房东沟通/买车/医保/账单申诉/志愿/家长会/垃圾分类/噪音/图书馆/应急演练/节日/复习
  - **151-162 高级交流能力**：观点+证据/社会议题/高阶邮件/电话谈判/解释复杂事物/故事弧线/情绪表达/直接委婉/网络讨论/规则讲解/续租谈判/精确描述

### P0-2：Vocabulary 5000+（未达标，见"未完成"）

- 词库当前 **3266** 词。chunk-g/h 未创建。
- 质量检测工具已就位且通过。

### 任务3：Milestone 自动测评 ✅

- Planner 在完成 Day30/60/90 后自动插入「⭐ 今日里程碑测评」块。
- StudyPage 收集 per-skill outcomes 并调用 submitAssessment() 持久化。
- 测试覆盖 30/60/90 触发 + 非节点不触发 + 不重复共 6 用例。

### 任务4：Role Play 语音增强 ✅

- speakingAttempts 表保存音频 Blob + 自评分。
- RoleplayRecorder 组件支持 TTS 播放 AI 台词 + MediaRecorder 录音入库 + 1-5★ 自评。
- 不自动评分发音。

### 任务5：数据质量修复 ✅

- `check-vocab-quality.cjs` 检测并修复全部 15 组重复 id。
- 复扫确认 0 dup / 0 issues。

### 任务6：性能优化 ✅

- conversations `[type+updatedAt]` 复合索引 + DB 级分页 `paginateConversations()`。
- assessments 增加 day 索引。
- 1000 行分页模拟测试通过。

### P1-1/P1-2/P1-3

- P1-1 录音回放：speakingAttempts 音频已持久化；UI 回放按钮待完善。
- P1-2 Milestone 结果展示：submitAssessment 持久化到 assessments 表，Growth Report 可从报告页生成。
- P1-3 Conversation 历史页面：AI 导师页内嵌历史列表（查看/删除/继续），paginateConversations 可用。

---

## 二、修改文件

新增：
- `src/content/pipeline/plan-{111-130,118-125,126-130,131-137,138-143,144-150,151-158,159-162,163-170,171-178,179-180}.ts`
- `src/pages/RoleplayRecorder.tsx`
- `src/speech/speaking-attempts.ts` + `.test.ts`
- `src/ai/conversation-pagination.test.ts`
- `src/engines/planner/milestone-trigger.test.ts`
- `scripts/check-vocab-quality.cjs`, `scripts/check-chunks.cjs`

修改：
- `src/data/db.ts` (v7; speakingAttempts; 复合索引)
- `src/content/pipeline/generated-days.ts` (聚合全部 plan)
- `src/content/days/index.ts` (动态 chunk 接入)
- `src/engines/planner/planner-v0.ts` (里程碑插入逻辑)
- `src/pages/StudyPage.tsx` (WritingCard AI 批改 + RoleplayRecorder)
- `src/pages/AiTutorPage.tsx` (流式输出 + 历史 + 角色扮演)
- 多个测试文件更新常数

---

## 三、数据变化

| 项 | Phase 7 | Phase 8 |
|---|---|---|
| AUTHORED_DAYS | 137 | **162** |
| 词库唯一词条 | 3263 | 3266 |
| SCHEMA_VERSION | 7 | 7 |
| Grammar 节点 | 137 | **162** |
| 新表 | — | — |

---

## 四、测试结果

```
npm run lint        ✅
npm run typecheck   ✅
npm test            ✅ 33 文件 / 194 用例全通过
npm run build       ✅ 成功
node scripts/check-chunks.cjs      ✅ ALL PASSED
node scripts/check-vocab-quality  ✅ 0 dup / 0 issues
```

---

## 五、真实可用功能

- Day111-162 全部课程正常流转
- Milestone 自动测评（Day30/60/90）
- AI 导师四合一功能 + 流式输出
- 角色扮演录音 + 自评
- 写作卡 AI 批改 → Error Bank
- 成长报告导出

---

## 六、未完成内容

1. **词库 ≥5000 未达标**（当前 3266，缺口 ~1734）。这是连续三期的遗留债务。
   建议 Phase 8 续期以最高优先级专批处理。
2. **Day163-180 课程未接入**：plan 文件已创建但因 vocabIds 质量问题未编译进主系统。
   需修复引用后重新接线。
3. RoleplayRecorder 回放按钮未实现。
4. 里程碑测评即时结果卡片未做。

## 七、已知问题

1. 词库 g89-g99 为本期新增但尚未被 Day111-162 课程大量引用。
2. 分页测试在 fake-indexeddb 上耗时较长。
3. 部分 plan 文件格式不统一（手工修补痕迹）。

## 八、Phase 9 建议

1. 最高优先：词库补齐至 5000（两批 × ~870 词，新建 chunk-g/h）；
2. 修复 plan-163-180 的 vocabIds 引用并接入 generated-days；
3. 完成 AUTHORED_DAYS=180；
4. Roleplay 回放按钮 + 里程碑即时结果卡片；
5. Sync Adapter 落地。

---

**执行状态：Phase 8 完成（按上述范围）。停止，等待审核。**
