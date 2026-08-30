# English360 V2 · Phase 5 Report

日期：2026-08-23
状态：**已完成，停止等待审核**（未进入下一阶段）

---

## 一、完成内容

### 任务1（第一优先级）：Vocabulary 动态分包 ✅

- 98 个词库组文件重组为 **6 个动态 chunk**（`src/content/vocab/chunks/chunk-a..f`），
  `vocab/index.ts` 以 top-level await 并行加载。
- **公开 API 完全不变**（`findLexical / allLexical / lexicalCount / getDanglingRelations`
  保持同步），因此 Knowledge Model、SRS、Planner、Error Analysis、AI Context Builder
  **零改动、零影响**。
- 构建结果：入口 bundle **846 KB → 466.8 KB**（低于 500 KB 警告线，构建不再告警）；
  词库以 chunk-a(54KB)/b(39KB)/c(60KB)/d(121KB)/e(102KB)/f(41KB) 六个独立异步 chunk 分发，
  PWA precache 全部包含，离线可用。
- 新增 `scripts/check-chunks.cjs`：build 后校验 10 个内容 chunk 存在且入口 <500KB
  （运行结果：ALL CHUNK CHECKS PASSED，入口 466.8 KB）。

### 任务2：AI 会话历史 ✅

- Dexie schema v6 新表 `conversations`
  （字段：id/createdAt/updatedAt/type/messages[{role,content,noteZh}]/relatedDay/
  relatedKnowledgeIds/meta；type ∈ tutor | error-analysis | dialogue | writing-review | roleplay）。
- `DATA_TABLE_NAMES` 加入 `conversations` → 导出/导入自动覆盖。
- `src/ai/conversation-store.ts`：创建/追加消息/按类型列表(最新在前)/读取/删除/更新角色扮演状态。
  **不保存任何 API Key。**
- AI 导师页接入：课程解释与错题分析两个 Tab 显示「历史会话」列表，支持查看（展开消息）、
  删除；课程解释支持「继续」——把最近 6 条消息作为上下文续写新讲解。
- 每次真实调用都会先落库用户消息，再落库 AI 回复（失败也有据可查）。

### 任务3：AI 流式输出 ✅

- `OpenAiCompatibleProvider.completeStream()`：`stream:true` SSE 解析器——
  逐 delta yield、`[DONE]` 终止、AbortSignal 取消、HTTP 错误带 status 抛出、
  keep-alive 行诚实忽略。兼容 OpenAI / DeepSeek / DashScope 兼容模式 / 火山方舟（同一 SSE 协议）。
- `streamExplanation()`：流式生成讲解；Provider 不支持流式时自动回退 `complete()`，
  输出形态一致。
- UI：AI 导师「课程解释」改为边生成边显示，生成中出现「停止生成」（AbortController）；
  停止时保留已输出部分并如实提示；失败显示真实原因。
- 测试：deltas 顺序、[DONE]、请求体 stream:true、401 错误透出、回退路径。

### 任务4：Interactive Role Play Engine ✅

- `src/engines/tutor/roleplay-engine.ts`：3 个内置场景（餐厅=顾客/服务员、
  机场=旅客/地勤、工作=员工/同事），难度 easy/normal/hard 影响 AI 句长与复杂度。
- 流程：AI 先开场（JSON）→ 每回合用户英文输入 → AI 返回 STRICT JSON
  `{corrections[], replyEn, replyZh}`（至多修正最关键的一处错误）→ 保持角色继续推进剧情。
- 集成（全部真实）：
  - **Error Bank**：每条被接受的 correction 经 `storeEnrichedError()` 写入
    （category=roleplay-mistake, skill=speaking）；
  - **SRS/Student Model**：每回合经 `track(interaction:"conversation")` 写入学习证据；
  - **Knowledge Model**：会话的 relatedKnowledgeIds 由词库真实命中解析写入。
- 会话状态（scenario/userRole/aiRole/turn/difficulty）持久化于 conversations.meta，
  刷新后可恢复；AI 失败或格式无效 → 该回合不计入并显示原因。
- UI：AI 导师页新增「角色扮演」Tab（选场景→开始→逐轮输入→气泡展示+纠错清单+轮次计数）。

### 任务5（第四优先级）：Day91-180 课程系统（部分交付，见"未完成"）

- 建立 **course generation pipeline**：
  - `src/content/pipeline/generate-days.ts`（CourseDayPlan → buildDay 编译器）
  - `src/content/pipeline/plan-91-120.ts`、`plan-101-110.ts`（紧凑计划）
  - `src/content/pipeline/generated-days.ts`（编译产物聚合，动态 chunk 22.9KB）
- 本期已交付 **Day 91–110 共 20 天**真实课程（生活高级表达：委婉表达/得体投诉/建议/
  习惯/变化/计划预测/借还/复诊/澄清误会/百日复盘 + 银行/车辆/社区安全/维修/聊新闻/
  天气寒暄/得体描述他人/结伴旅行/延误应对/阶段复习），全部九大板块钩子齐全，
  AUTHORED_DAYS 自动变为 **110**。
- 词库新增 11 组（g89–g99：高级动词×2、高级形容词、社会名词组、习语组、家庭财务、
  美国文化机构、商务邮件、会议谈判、职业软技能），**当前总量 3263 词**。
- Day111–180 的三套主题（工作沟通深化/真实美国生活交流）计划沿用本管线，
  只需继续添加 plan 文件即可（见"未完成内容"）。

### 任务6（第五优先级）：Assessment 增强 ✅

- `MILESTONE_DAYS = [30, 60, 90]` 常量导出（assessment-v0 保持向后兼容默认值）。
- 新增 `src/study/growth-report.ts`：
  - `computeGrowthReport()`：首次 vs 最近里程碑总体分、五技能分差、
    里程碑完成情况、能力模型趋势、学习天数——全部来自真实测评记录；
  - `formatGrowthReportText()` 中文文本（▲/▼ 标注提升/下降），无测评时如实说明"尚无"。
- ReportPage 新增「成长报告（里程碑对比）」卡片：一键生成 + 导出 TXT 下载。
- 测试：无测评/单次测评/两次测评三种情形（含 +25 分等具体断言）。

### Gamification v1（第六优先级）✅

- GamificationRow 扩展：weeklyGoalXp / weekStartISO / xpAtWeekStart /
  dailyXp[]（真实每日 XP 曲线，90 天环形缓冲）。
- 纯函数 `weekStartOf()`（ISO 周）与 `computeWeeklyProgress()`（目标/已得/百分比）；
  跨周自动重置快照；`setWeeklyGoal()` 支持调整目标（50–5000 XP 夹取）。
- HomePage 状态条新增「本周目标：X / Y XP（Z%）」。
- 错误减少趋势与技能成长已在成长报告/能力模型中体现（真实数据源）。

---

## 二、修改文件

新增：
- `src/content/vocab/chunks/chunk-a..f.ts`（6 个词库动态 chunk）
- `src/content/pipeline/{generate-days, plan-91-120, plan-101-110, generated-days}.ts`
- `src/content/vocab/groups/g89…g99`（11 个新词库组，约 260 词条）
- `src/ai/conversation-store.ts` + `.test.ts`
- `src/ai/streaming.test.ts`、`src/ai/writing-review-flow.test.ts`（Phase4B 补测并入本期全量）
- `src/engines/tutor/roleplay-engine.ts` + `.test.ts`
- `src/study/growth-report.ts` + `.test.ts`
- `src/content/dynamic-days.test.ts`
- `scripts/check-chunks.cjs`

修改：
- `src/data/db.ts`（SCHEMA_VERSION=6；conversations 表；GamificationRow 周目标/每日XP字段；DATA_TABLE_NAMES）
- `src/content/vocab/index.ts`（chunk 化 + ensureVocabularyLoaded 接缝，API 不变）
- `src/content/days/index.ts`（并入 generated-days 动态 chunk）
- `src/ai/openai-compatible.ts`（completeStream + isStreamingProvider）
- `src/ai/tutor-service.ts`（streamExplanation / analyzeError / generateDialogue 及解析器）
- `src/pages/AiTutorPage.tsx`（流式+停止、历史会话、角色扮演 Tab、会话落库）
- `src/pages/HomePage.tsx`（本周目标行）
- `src/pages/ReportPage.tsx`（成长报告卡片 + TXT 导出）
- `src/study/session.ts` 无改动确认（Phase4B 已挂钩 XP）
- 测试更新：index.test / days-phase4a.test / dynamic-days.test / knowledge-model-v0.test /
  context-builder.test（110 天口径）

清理：Phase4B/5 过程性修复脚本已删除，保留 `check-chunks.cjs` 作为长期构建体检工具。

---

## 三、数据结构变化

| 项 | Phase 4-B | Phase 5 |
|---|---|---|
| SCHEMA_VERSION | 5 | **6** |
| 新表 | — | conversations（id/updatedAt/type 索引） |
| GamificationRow | xp/streak/badges/counters | + weeklyGoalXp/weekStartISO/xpAtWeekStart/**dailyXp[90]** |
| AUTHORED_DAYS | 90 | **110** |
| 词库唯一词条 | 3015 | **3263** |
| Knowledge Model 语法节点 | 90 | **110**（每天一个 pattern 节点） |
| 构建 chunk | 1 主包+3天包 | **1 主包(466.8KB)+4 天包+6 词库 chunk** |

导出/导入：`tables` 数组含 conversations，旧备份（v≤5）导入会因版本检查被拒——
符合既有迁移策略（尚未实现降级迁移）。

---

## 四、测试结果

```
npm run lint        ✅ 0 error
npm run typecheck   ✅ 通过
npm test            ✅ 30 个测试文件 / 182 个测试全通过
npm run build       ✅ 成功
node scripts/check-chunks.cjs ✅ ALL CHUNK CHECKS PASSED（入口 466.8 KB ≤ 500 KB）
```

新增测试覆盖对照：
| 要求 | 对应测试 |
|---|---|
| 动态词库加载 | vocab.test（chunk 合并后 ≥3000 校验链路）、dynamic-days.test、check-chunks.cjs |
| 未加载词组不能误访问 | findLexical 未命中返回 null（vocab.test lookup 用例）；ensureVocabularyLoaded 接缝测试（加载后计数一致） |
| 当前 Day vocabulary 正确解析 | days-phase4a.test「every vocab id resolves」对全部 31–110 天逐一断言 resolved==declared |
| build 后 chunk 检查 | scripts/check-chunks.cjs（10 内容 chunk + 入口体积阈值） |
| 创建/保存/查询/删除/导出恢复会话 | conversation-store.test 5 例（含 DATA_TABLE_NAMES 覆盖断言） |
| 流式输出 | streaming.test（delta 顺序/stream:true/SSE 错误/回退） |
| 角色切换/错误记录/状态保存/AI 失败降级 | roleplay-engine.test 7 例 |
| 作文纠错流程 | writing-review-flow.test 3 例（含上限 5 条、无效响应零写入） |
| XP 计算 | gamification-v0.test 10 例（周窗口重置/每日曲线/延续奖励） |
| 成长报告 | growth-report.test 4 例 |

---

## 五、真实可用功能

- 启动即并行拉取 11 个内容 chunk，主包减半；离线 PWA 全量预缓存。
- AI 导师四合一：解释（流式可停）、错题分析、情景对话、交互式角色扮演；
  所有会话自动存档、可查看/删除/续聊。
- 写作卡 AI 批改结果自动沉淀到错误银行并进入复习闭环。
- 角色扮演每轮纠错入银行、对话证据入学生模型、词汇命中关联知识图谱。
- 报告页可生成并导出里程碑成长报告 TXT。
- 首页实时展示 XP/等级/连续天数/勋章/本周目标进度。

---

## 六、未完成内容

1. **词库 5000 目标未达**：当前 3263。管线与校验体系已就绪（新增组文件即自动并入），
   剩余约 1700 词建议在 Phase 6 以同等质量标准分两批补齐（Day111–150 与 151–180 各一批）。
2. **Day 111–180 课程计划未写**：pipeline 就绪，但为保证每课真实内容质量，
   本期仅交付 91–110；111–180 需按同格式继续编写（预计 3 个 plan 文件）。
3. 里程碑测评（Day30/60/90）尚无学习流程内的自动触发 UI（Growth Report 已可手动查看/导出）。

## 七、已知问题

1. 旧 g01–g45 组存在少量跨文件重复 id（15 对，如 heart/talent/prison 等），
   由合并器静默去重，不影响测试与运行；如需彻底清洗属数据修缮任务。
2. 流式输出目前仅用于「课程解释」；错题分析/出题/批改仍为整体 JSON 响应
   （流式渲染 JSON 会暴露中间态，故保持原样）。
3. conversations 表按 updatedAt 倒序列出后内存过滤类型；数据量极大时可考虑复合索引。
4. 角色扮演的 SRS 证据以 conversation 事件计入 speaking 能力，不直接为纠错词建卡
   （避免把 AI 临时造句误当词库条目）；是否为高频错误词自动建卡留待讨论。

## 八、Phase 6 建议

1. 词库补齐至 5000（两批次 × ~850 词，沿用 chunk-f 后追加 chunk-g/h）；
2. 编写 plan-111-140 / plan-141-180，完成 Day111–180（工作沟通深化 + 真实美国生活）；
3. 里程碑自动触发：完成 Day30/60/90 当日由 Planner 插入正式测评块并联动 Growth Report；
4. 角色扮演语音化：接 TTS 播放 AI 台词、录音自评（speaking 引擎缺口）；
5. conversations 复合索引（type+updatedAt）与分页；
6. 旧词库重复 id 清洗脚本一次性合并同义词目；
7. Sync Adapter（Supabase）落地，先同步 conversations 与 assessments 两表。

---

**执行状态：Phase 5 完成（按上述范围）。停止，等待审核。**
