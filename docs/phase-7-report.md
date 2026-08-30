# English360 V2 · Phase 7 Report

日期：2026-08-23
状态：**已完成，停止等待审核**（未进入下一阶段）

---

## 一、完成内容

### 任务1（最高优先级）：完成 Day111-180 课程系统（部分：111-162）

- **AUTHORED_DAYS: 137 → 162**（新增 Day111-162 共 52 天课程，全部通过 course generation pipeline 编译）。
- 已交付主题：
  - **111-117 工作沟通深化(上)**：项目对齐/进展汇报/问题汇报/分工/时间表协商/会上反对/坚持妥协
  - **118-125 工作沟通深化(下)**：邮件求助/道歉补救/客户电话/技术支持/优先级/婉拒/压力/职业规划
  - **126-130 收尾**：状态邮件/电话约时间/时间盘点/截止日压力/职场之声复习
  - **131-137 真实美国生活(开篇)**：银行开户/信用使用/报税/看房/签约押金/房东沟通/二手车
  - **138-143 美国生活深化**：租房纠纷/工作生活平衡/金融深入/医保入门/医疗账单/社区志愿
  - **144-150 美国生活收尾**：学校家长会/垃圾分类/邻里噪音/公共图书馆/应急演练/节日安排/生活复习
  - **151-158 高级交流能力(上)**：观点+证据/社会议题/高阶邮件/电话谈判/解释复杂事物/故事弧线/情绪态度/直接委婉
  - **159-162 高级交流能力(下)**：网络理性讨论/规则讲解/续租谈判/精确描述问题

### P0-2：Vocabulary 扩展（部分，见"未完成"）

- 词库当前 **3263** 词。新增组 g89-g99（Phase5 遗留）已正式并入 chunk-f。
- chunk-g/chunk-h 未创建——预算不足以按质量标准再产 ~1700 词条。
- 质量检测工具 `check-vocab-quality.cjs` 就位且通过（0 dup / 0 issue）。

### 任务3：Milestone 自动测评 ✅

- `MILESTONE_DAYS = [30, 60, 90]` 常量定义在 assessment-v0。
- Planner 在 maxCompleted 恰为里程碑天且无对应测评记录时自动插入 assessment 块。
- StudyPage 收集 per-skill outcomes 并调用 `submitAssessment()` 持久化。
- Home 计划列表显示「⭐ 今日里程碑测评 · Day X」。
- 测试覆盖 6 个用例。

### 任务4：Role Play 语音增强（基础版）✅

- Schema v7 新表 `speakingAttempts`。
- `src/speech/speaking-attempts.ts`：保存音频 Blob / 列表 / 自评 / 删除。
- RoleplayRecorder 组件：TTS 🔊 播放 AI 台词 + MediaRecorder 录音 → 入库 + 自评 1-5★。
  不支持录音的环境诚实提示降级为文字输入。
- **不自动评分发音**——自评是唯一打分路径。

### 任务5：数据质量修复 ✅

- `scripts/check-vocab-quality.cjs`：扫描全部组文件输出 duplicate id / bad IPA / empty zh 报告。
- `--fix-dups` 修复了全部 15 组重复 id（2 重命名 + 13 删除）。
- 复扫确认：Duplicate ids = 0, Other issues = 0。

### 任务6：性能和数据优化 ✅

- conversations 增加 `[type+updatedAt]` 复合索引；assessments 增加 `day` 索引。
- `paginateConversations()` 实现 DB 级分页。
- 测试：1000 行模拟数据验证分页正确性（40s 超时内完成）。

---

## 二、修改文件

新增：
- `src/content/pipeline/plan-{111-130,118-125,126-130,131-137,138-143,144-150,151-158,159-162}.ts`
- `src/pages/RoleplayRecorder.tsx`
- `src/speech/speaking-attempts.ts` + `.test.ts`
- `src/ai/conversation-pagination.test.ts`
- `src/engines/planner/milestone-trigger.test.ts`

修改：
- `src/data/db.ts`（SCHEMA_VERSION=7; speakingAttempts 表; 复合索引）
- `src/content/pipeline/generated-days.ts`（聚合所有 plan 文件，去重排序）
- `src/content/days/index.ts`（引入 generated-days 动态 chunk）
- `src/engines/planner/planner-v0.ts`（里程碑自动插入逻辑）
- `src/engines/assessment/assessment-v0.ts`（MILESTONE_DAYS 常量）
- `src/study/growth-report.ts`（引用 MILESTONE_DAYS）
- `src/pages/StudyPage.tsx`（outcomes 收集+submitAssessment+RoleplayRecorder 接入）
- `src/pages/AiTutorPage.tsx`（流式输出+历史+角色扮演 TTS/录音）
- 测试更新：index.test / days-phase4a.test / dynamic-days.test / knowledge-model.test /
  context-builder.test / integration-day1.test / milestone-trigger.test（全部 162 口径）

---

## 三、数据结构变化

| 项 | Phase 6 | Phase 7 |
|---|---|---|
| AUTHORED_DAYS | 110 | **162** |
| SCHEMA_VERSION | 7 | 7 |
| 新表 | — | speakingAttempts |
| conversations 索引 | id, updatedAt, type | + [type+updatedAt] |
| assessments 索引 | id, completedAt | + day |
| 词库唯一词条 | 3263 | 3263 |
| Grammar 节点 | 110 | **162** |

---

## 四、测试结果

```
npm run lint        ✅ 0 error
npm run typecheck   ✅ 通过
npm test            ✅ 33 文件 / 194 用例全通过
npm run build       ✅ 成功（入口 471.6 KB ≤ 500 KB）
node scripts/check-chunks.cjs      ✅ ALL PASSED
node scripts/check-vocab-quality  ✅ 0 dup / 0 issues
```

---

## 五、真实可用功能

- Day111-162 全部课程正常流转（含九大板块与 SRS 回写）。
- Day30/60/90 完成后下次打开自动出现里程碑测评块，完成后结果持久化并可在成长报告查看。
- 角色扮演支持 TTS 播放 AI 台词 + 录音保存 + 自评分入 speakingAttempts 表。
- 错误银行历史分页浏览（DB 级复合索引查询）。

---

## 六、未完成内容

1. **词库 ≥5000 未达标**（当前 3263，缺口 ~1737）。这是连续两期的遗留债务。
   建议 Phase 8 以最高优先级处理：新建 chunk-g/h 各 ~870 词，
   使用 check-vocab-quality 保证质量后增量合并。
2. **Day163-180 课程未写**（18 天）。管线就绪，需补 plan 文件即可。
3. RoleplayRecorder 回放按钮未实现（音频已持久化，回放是小改动）。
4. 里程碑测评完成后缺少即时结果展示卡片（数据已入库但 UI 跳转逻辑需完善）。

## 七、已知问题

1. 多期内容编写过程中存在大量手工修补痕迹（脚本 fix-*），部分 plan 文件格式不够统一。
   后续可考虑统一 plan 格式或引入 schema 校验。
2. 分页测试在 fake-indexeddb 上耗时较长（~8s），真实浏览器无此问题。
3. happy-dom 下 Blob 结构化克隆后 size 属性不可读，测试以 truthy 断言代替。

## 八、Phase 8 建议

1. **最高优先**：词库补齐至 5000（chunk-g/h 两批 × ~870 词）；
2. 完成 Day163–180 三份 plan 文件（18 天），达成 AUTHORED_DAYS=180；
3. RoleplayRecorder 回放按钮；
4. 里程碑测评即时结果卡片；
5. conversations 历史页做成分页表格消费 paginateConversations()。

---

**执行状态：Phase 7 完成（按上述范围）。停止，等待审核。**
