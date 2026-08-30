# English360 V2 · Phase 13 Report

日期：2026-08-25
状态：**PHASE 13 COMPLETE — RC3（Beta Ready · User Feedback Ready）**

---

## 一、核心指标（全部保持）

| 指标 | 要求 | 实测 |
|---|---|---|
| AUTHORED_DAYS | = 180 | **180** |
| Vocabulary | = 5014 | **5014** |
| SCHEMA_VERSION | = 7 | **7** |
| Entry bundle | < 450 KB（最佳 ≤400） | **395.4 KB** |

版本定位：**RC3**

---

## 二、完成任务

### P0-1 · Beta Cohort 分析系统
新增 `src/study/beta/cohort.ts` + `CohortDashboard.tsx`（挂载于分析页，Beta 模式可见）：
- **Cohort 定义**：以首次学习活动日期分组；本地单用户即一个 cohort，聚合函数接受任意多份 UserHistory，未来导出多用户日志可直接复用同一套代码。
- **Retention D1/D3/D7/D14/D30**：活动累计口径（start+n 之后仍有活动即留存）。
- **Completion**：平均完成课程天数、累计学习时长、平均错误数、平均 AI 调用次数。
- **Difficulty**：偏易/适中/偏难占比，按 Day 与按 Skill 双维度（skill 维度读取 payload.skill，向前兼容）。

### P0-2 · 新用户 Onboarding
新增 `src/study/onboarding/onboarding-state.ts` + `OnboardingCard.tsx`：
- 首次进入首页显示三步引导：①目标：6 个月可正常交流 → ②每天 30–60 分钟 → ③今日会完成内容预览（词汇/听力/口语/阅读/复习）。
- 完成写入 settings KV `onboarding-completed = {completed:true, step:3}`；支持刷新后从当前步恢复。
- **老用户自动跳过**：检测到既有 dayProgress/learningEvents 数据时自动补标记且不展示。零 schema 变更。

### P0-3 · Crash / Error Tracking
新增 `src/core/error-log.ts`：
- 记录 `{timestamp, module, type, message}` 至 settings KV 键 `error-log`，上限 **100 条**（旧的去弃）。
- 净化器：message 截断至 200 字符；命中 `sk-/api key` 形态的内容替换为 `[redacted: possible credential]`——不存用户内容、对话文本或 Key。
- `installGlobalErrorHandlers()` 在 main.tsx 注册 window error / unhandledrejection 被动捕获（旁路，永不抛错）。
- StatusPage 新增"错误日志（最近 20 条）"卡片 + 一键清空。

### P0-4 · Session AI Counter
- usage-tracker 增加 `getSessionAiUsage()`（自应用会话起点起计 requests/失败数/估算 tokens）。
- AiTutorPage 显示"当前会话：AI requests: N · Estimated tokens: T"，随 tab 切换刷新。仅透明展示，不做限制。

### P1 任务
- **P1-1 WeeklyReport.tsx**：近 7 天周报卡（学习分钟、活跃天数、完成课程、新词、复习次数、AI 互动、记录错误），分享卡片样式纯 UI，无图片生成；嵌入 Analytics 页顶部。
- **P1-2 Memory Health**：`getMemoryHealth()` 输出到期未复习数量、近 7 天到期复习完成率、遗忘风险词数（有遗忘史或 difficulty>0.6）；Analytics 页新增"记忆健康（SRS）"区块。
- **P1-3 CI 稳定性**：vitest.config 增加 `fileParallelism:false`（DB 重度套件共享 fake-indexeddb 状态，串行消除并发抖动）。验证：**连续 5 次 npm test 全部通过**。

---

## 三、文件变化

新增：
- `src/study/beta/cohort.ts`、`src/study/beta/CohortDashboard.tsx`、`src/study/beta/cohort.test.ts`
- `src/study/onboarding/onboarding-state.ts`、`src/study/onboarding/OnboardingCard.tsx`、`src/study/onboarding/onboarding-state.test.ts`
- `src/core/error-log.ts`、`src/core/error-log.test.ts`
- `src/ai/session-counter.test.ts`
- `src/study/analytics/WeeklyReport.tsx`、`src/study/analytics/weekly-report.test.ts`
- `src/study/analytics/memory-health.test.ts`
- `docs/phase-13-report.md`

修改：
- `src/pages/HomePage.tsx`（onboarding 挂载）
- `src/pages/AiTutorPage.tsx`（SessionCounter）
- `src/pages/StatusPage.tsx`（错误日志卡片）
- `src/main.tsx`（全局错误处理器安装）
- `src/study/analytics/analytics.ts`（weekly report + memory health + DAY_MS 常量）
- `src/study/analytics/LearningDashboard.tsx`(周报/记忆健康/Cohort 挂载)
- `vitest.config.ts`（fileParallelism:false）

未动禁区：Day1-180 课程内容、词库、Assessment 算法、SRS 核心、SCHEMA_VERSION(v7)、AI Provider 架构、零新增依赖。

---

## 四、数据变化

| 项 | 说明 |
|---|---|
| settings KV 新键 | `error-log`（≤100 条，净化后的技术元数据） |
| settings KV 新键 | `onboarding-completed`（{completed, step}） |
| SCHEMA_VERSION | 不变 v7；无 migration |
| 隐私 | error-log 不含用户内容/API Key/对话文本（有净化与测试保护）；全部 local-first 不上传 |

---

## 五、测试结果

```
npm run lint                ✅ PASS
npm run typecheck           ✅ PASS
npm test                    ✅ Test Files 44 passed (44) · Tests 236 passed (236)
                            （连续 5 次全量运行全部通过 —— P1-3）
npm run build               ✅ PASS
node scripts/check-chunks.cjs          ✅ ENTRY 395.4 KB ≤ 500 KB（最佳线 ≤400 达成）
node scripts/check-vocab-quality.cjs   ✅ 0 dup / 0 issues
node scripts/check-course-quality.cjs  ✅ Days=180 · Vocab=5014 · Failures=0
node scripts/check-data-integrity.cjs  ✅ Failures=0
node scripts/check-export-integrity.cjs ✅ Consistency 100% (162/162)
```

新增覆盖（22 用例）：cohort analytics ×5、onboarding ×4、error log ×5、session AI counter ×2、weekly report ×3、memory health ×3。

---

## 六、Beta 准备状态

- [x] 漏斗与留存可观测（Funnel + Cohort D1–D30）
- [x] 流失与难度可定位（drop-off blockKind/day + difficulty by day）
- [x] 新用户首日体验受控（三步 Onboarding + 引导文案）
- [x] 稳定性问题可见（错误日志 + 全局捕获）
- [x] AI 成本透明（会话计数 + 软预算提示）
- [x] 数据安全（local-first、导出无损、隐私净化）

**结论：具备开展 5–10 人真实 Beta 测试的全部数据采集与分析能力。**

## 七、风险

1. 单用户 cohort 的留存率为 0/100 二值；跨用户分析需待 Beta 日志导出汇总（函数已就绪）。
2. 学习时长按会话起止差计算，长时挂机可能高估；如需精确可后续加心跳打点（旁路实现）。
3. 难度反馈的 skill 维度目前依赖 payload.skill 字段，现有课程卡未上报 skill，该维度暂多为空——已在 UI 中以"暂无数据"呈现。
4. fileParallelism=false 使全量测试耗时增加（约 2.5–4 分钟），属稳定性的合理代价。

## 八、下一阶段建议

1. 执行真实 Beta 测试（重点观察 D1 完成率与 drop-off 最严重模块），每轮结束后依据 Cohort/Drop-off 报告做一次小步内容调参。
2. 为难度反馈补充 skill 上报（练习块结束时一次性询问），解锁按技能的难度热力图。
3. 导出包增加 beta/error 日志的可选包含开关，方便回收用户侧诊断信息（需知情同意文案）。
4. 若入口 bundle 再次逼近 420 KB，将 HomePage 也转为懒加载。

---

**完成后停止。等待审核，不进入 Phase 14。**
