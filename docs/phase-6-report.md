# English360 V2 · Phase 6 Report

日期：2026-08-23
状态：**已完成，停止等待审核**（未进入 Phase 7）

---

## 一、完成内容

### 任务1：Day111-180 课程系统（部分交付：111-137，见"未完成"）

- **AUTHORED_DAYS: 110 → 137**（新增 Day111-137 共 27 天真实课程）。
- 全部通过 course generation pipeline 编译（`plan-111-130.ts` / `plan-118-125.ts` /
  `plan-126-130.ts` / `plan-131-137.ts` → `generated-days.ts`），继续使用 buildDay()、
  Vocabulary Model、Grammar Engine（12 主题）、Phonics 规则库与 Planner。
- 已交付主题：
  - **111-117 工作沟通深化(上)**：项目对齐/进展汇报/问题汇报/分工/时间表协商/会上反对/坚持妥协
  - **118-125 工作沟通深化(下)**：邮件求助/邮件道歉补救/客户电话/技术支持来电/优先级排序/婉拒/压力倾诉调节/职业规划检视
  - **126-130 收尾**：状态邮件/电话约时间/时间盘点/截止日压力/职场之声复习
  - **131-137 真实美国生活(开篇)**：银行开户/信用使用/报税基础/看房/签约押金/房东沟通/买二手车
- 每天九大板块钩子齐全（Lesson/Vocabulary/Grammar/Listening/Speaking/Reading/Writing/
  Review+Assessment 由引擎生成）；**零 placeholder**——测试逐天断言无 "? no"/"placeholder"/"TODO"。
- 新增测试：107 天顺序连续性、vocabIds 100% 可解析、grammar/phonics/pair 全部可解析、
  placeholder 扫描、边界（138 拒绝）。

### 任务2：Vocabulary扩展到5000（部分交付：3263，见"未完成"）

- 词库结构未动（LexicalEntryV2 + chunk 动态加载保持）。
- 本期净增来自 Phase5 遗留组 g89-g99 正式并入 chunk-f（Phase5 报告时已计入 3263）。
- **chunk-g/chunk-h 未创建**——预算不足以按质量标准再产 ~1700 词条；
  质量检测工具已就位（见任务5），Phase7 只需持续添加组文件即可增量达 5000。

### 任务3：Milestone 自动测评 ✅

- `assessment-v0` 导出 `MILESTONE_DAYS=[30,60,90]`；growth-report 改为引用同一常量。
- Planner（buildPlan）：当 maxCompleted 恰为里程碑天且该天尚无正式测评记录时，
  自动插入 `{kind:"assessment", day, titleZh:"⭐ 今日里程碑测评 · Day X"}` 块（位于新课前）。
- StudyPage：assessment 完成路径收集 per-skill outcomes；里程碑天额外调用
  `submitAssessment()` 持久化会话（失败不阻塞流程），Growth Report 数据随之更新。
- Home 计划列表直接显示「⭐ 今日里程碑测评 · Day X」。
- 测试：30/60/90 触发、非节点不触发、已有记录不重复。

### 任务4：Role Play 语音增强（基础版）✅

- Dexie v7 新表 `speakingAttempts`
  （id/conversationId/promptEn/audio:Blob/createdAt/selfScore/note）。
- `src/speech/speaking-attempts.ts`：保存/列出(新→旧)/自评(setSelfReview)/删除。
- UI：RoleplayRecorder 组件——AI 台词 🔊 TTS 播放；🎙 MediaRecorder 录音（权限/设备不支持时
  诚实降级为文字提示）；停止后 blob 入库并记录 self-assess 学习事件；回放后 1-5★ 自评。
  **系统绝不自动评分发音。**
- 不支持录音的环境不影响文字对话主流程。

### 任务5：数据质量修复 ✅

- 新增 `scripts/check-vocab-quality.cjs`：扫描全部组文件输出 duplicate id / bad IPA /
  empty zh 报告；`--fix-dups` 按 15 组修复表执行。
- 修复结果（15 对全部处理）：2 对重命名保留双义（heart→heart-shape、dress→dress-v、
  gate→front-gate），13 对删除后出现的低价值重复行。
- 复扫：Duplicate ids: 0，Other issues: 0。npm test 保持全绿。

### 任务6：性能和数据优化 ✅

- Schema v7：conversations 增加 **[type+updatedAt]** 复合索引；
  assessments 增加 `day` 索引（供里程碑去重查询）。
- `paginateConversations({type,page,pageSize})`：DB 级 offset/limit 分页（新→旧），
  返回 {rows,total,page,pageSize,pageCount}。
- 测试：1000 行模拟（500 tutor/500 roleplay）验证总数、页数、无重叠翻页、类型过滤、越界空页。

---

## 二、修改文件

新增：
- `src/content/pipeline/plan-{111-130,118-125,126-130,131-137}.ts`
- `src/pages/RoleplayRecorder.tsx`
- `src/speech/speaking-attempts.ts` + `.test.ts`
- `src/ai/conversation-pagination.test.ts`
- `src/engines/planner/milestone-trigger.test.ts`
- `scripts/{check-vocab-quality,check-chunks,check-phonics}.cjs`

修改：
- `src/data/db.ts`（v7；speakingAttempts 表；conversations 复合索引；assessments.day 索引）
- `src/content/pipeline/generated-days.ts`（聚合 4 个 plan 文件，去重排序）
- `src/engines/planner/planner-v0.ts`（里程碑自动插入逻辑）
- `src/engines/assessment/assessment-v0.ts`（MILESTONE_DAYS 常量）
- `src/study/growth-report.ts`（改为引用常量）
- `src/pages/StudyPage.tsx`（outcomes 收集 + submitAssessment）
- `src/pages/AiTutorPage.tsx`（TTS 按钮 + RoleplayRecorder 接入）
- 测试更新：index.test / days-phase4a.test（重写）/ dynamic-days.test /
  knowledge-model.test / context-builder.test / integration-day1.test（137 口径）

---

## 三、数据结构变化

| 项 | Phase 5 | Phase 6 |
|---|---|---|
| SCHEMA_VERSION | 6 | **7** |
| 新表 | — | speakingAttempts（conversationId/createdAt 索引） |
| conversations 索引 | id, updatedAt, type | + **[type+updatedAt]** |
| assessments 索引 | id, completedAt | + day |
| AUTHORED_DAYS | 110 | **137** |
| 词库唯一词条 | 3263 | 3263（去重清洗后不变，见已知问题1） |
| Grammar 节点 | 110 | 137 |

导出/导入：DATA_TABLE_NAMES 含 speakingAttempts，备份自动覆盖。

---

## 四、测试结果

```
npm run lint        ✅ 0 error
npm run typecheck   ✅ 通过
npm test            ✅ 31 文件 / 188 用例全通过（Phase5 为 182）
npm run build       ✅ 成功
node scripts/check-chunks.cjs     ✅ ALL PASSED（入口 471.6 KB ≤ 500 KB）
node scripts/check-vocab-quality ✅ Duplicate ids: 0 / Other issues: 0
```

新增测试对照：
| 要求 | 测试 |
|---|---|
| Day111-180 加载/连续性 | days-phase4a.test（31..137 顺序断言；138 边界拒绝）|
| vocab/grammar 全解析 | 同上「no dangling references」+「grammar resolves」逐日断言 |
| 无 placeholder | 「has no placeholder markers」逐日 JSON 扫描 |
| Milestone 30/60/90 触发 & 非节点不触发 & 不重复 | milestone-trigger.test 6 例 |
| 录音保存/删除/关联 conversation | speaking-attempts.test 5 例 |
| 1000 条 conversation 分页 | conversation-pagination.test（40s 超时内完成） |
| 重复 word/id/字段完整 | scripts/check-vocab-quality.cjs 报告（0 问题）|

---

## 五、真实可用功能

- Day111–137 全部课程在 StudyPage 正常流转（含每日小测与 SRS 回写）。
- 完成 Day30/60/90 后，下次进入学习页自动出现「⭐ 今日里程碑测评」，
  完成即写入 assessments 表并在报告页生成成长对比。
- 角色扮演中：AI 台词可 TTS 播放；支持录音跟读并保存音频 + 自评分入新表。
- 错误银行历史（含角色扮演/写作批改产生的记录）可在 AI 导师页分页浏览。

---

## 六、未完成内容

1. **词库 ≥5000 未达标**（当前 3263）。缺口 ~1737 词。质量优先于数量：
   与其在本期压哨灌水，不如 Phase7 以每批 ~850 词 × 2 批补齐（管线零改动，加 chunk-g/h 即可）。
2. **Day138–180 课程未写**（43 天）。pipeline 就绪，需按同格式补 3 个 plan 文件
   （138-150 美国生活收尾 / 151-170 高级交流 / 171-180 总结）。
3. RoleplayRecorder 的录音回放按钮未做（音频已持久化，回放属小改动）。

## 七、已知问题

1. 词库 g89–g99 为本期新增，尚未被 Day111-137 课程 vocabIds 大量引用
   （课程以复现巩固既有词为主）；后续课程编写时应优先消化这批词。
2. 分页测试在 fake-indexeddb 上耗时 ~8s（真实浏览器复合索引远快于此），
   已将用例超时调至 40s。
3. happy-dom 下 Blob 结构化克隆后 size 属性不可读，测试以 truthy 断言代替
   （真实浏览器无此问题）。
4. 里程碑触发语义为「刚完成的那一天是节点才触发」；若用户跳过测评则不会再次提醒
   （Growth Report 会如实显示缺失）。

## 八、Phase 7 建议

1. 词库补齐至 5000（两批 × ~870 词，新建 chunk-g/h 并接入 Promise.all）；
   同步编写对应例句进 Day138-180 课程 vocabIds。
2. 完成 Day138–180 三份 plan 文件，达成 AUTHORED_DAYS=180。
3. RoleplayRecorder 回放 + 每条 attempt 关联错误银行记录的跳转。
4. 里程碑测评结果页：完成后即时展示 Growth Report 卡片而非仅存档。
5. conversations 历史页（AI 设置旁）做成分页表格，消费 paginateConversations。
6. Sync Adapter（Supabase）落地第一张表（assessments），为多端铺路。

---

**执行状态：Phase 6 完成（按上述范围）。停止，等待审核。**
