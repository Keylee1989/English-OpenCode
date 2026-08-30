# English360 V2 · Phase 14 Report

日期：2026-08-26
状态：**PHASE 14 COMPLETE — RC4 Stability + Real Beta Optimization**

---

## 一、核心指标（全部保持）

| 指标 | 要求 | 实测 |
|---|---|---|
| AUTHORED_DAYS | = 180 | **180** |
| Vocabulary | = 5014 | **5014** |
| SCHEMA_VERSION | = 7 | **7** |
| Entry bundle | < 450 KB（最佳 ≤400） | **395.4 KB** |

版本定位：**RC4**

---

## 二、完成任务

### P0-1 · Skill-Level Telemetry 完善
新增 `src/study/telemetry/skill-telemetry.ts`：
- 技能枚举 `TELEMETRY_SKILLS`（vocabulary/listening/speaking/reading/writing/grammar/phonics，pronunciation 归并隐藏）；写入时校验，未知技能直接拒绝。
- `recordBlockCompletion({day, blockKind, skills[], difficultyFeedback?, completed})` → settings KV 键 `skill-telemetry`，上限 500 条。
- StudyPage 全部六类 block 完成点已埋点：lesson→vocabulary（携带难度反馈）、reading→reading、writing→writing、review→vocabulary、drill→按 RemedialSpec 推导（items→vocabulary / phonics→phonics / grammar→grammar）、practice·assessment→按实际触发的 skill 集合逐条记录。
- 纯净度保障：读取时丢弃非法行；`getEmptyOrInvalidSkillRatio()` 输出空/非法占比。
- **新增门禁** `scripts/check-telemetry-quality.cjs`：运行时验证（写入校验/过滤/500 上限/聚合一致性）+ 静态检查（6/6 调用点显式传 skills）+ 存量脏数据比例 ≤5%。实测 **Failures: 0**。

### P0-2 · First Week Experience
- 新增 `getFirstWeekHealth()`（Day1 完成率、Day3/D7 留存率），Analytics Dashboard 新增 **First Week Health** 卡片。
- 数据源为真实 dayProgress；与既有 drop-off/cohort 视图互补，用于锁定首周退出点。未增加复杂 UI。

### P0-3 · Learning Effectiveness Report
新增 `getEffectivenessReport()` + Dashboard"学习效果报告"区块（只读，评分算法零改动）：
- **Vocabulary**：累计新学、已掌握词（产出级 stage）、遗忘风险词、保持率。
- **Speaking**：录音尝试次数、自评分近 7 天 vs 前 7 天变化。
- **Writing**：Error Bank 写作条目数 + 改善率（错后最近一次作答答对计改善）。
- **Assessment**：Day30/60/90 分数与等级列表 + 各技能分差（首次→最近）。

### P1-1 · AI Interaction Quality
- AiUsageRecord 扩展 `durationMs`（墙钟耗时）与 `retryCount`（当前恒 0，字段前瞻）；runtime wrapper 双路径（complete/completeStream）均记录耗时。
- 新增 `getAiFeatureStats()`：按 feature 聚合调用数、失败率、平均耗时——回答"哪些功能慢/哪些失败率高"。

### P1-2 · Export Privacy Control
- `exportAllData(options)` 支持 `{includeAiUsageLog, includeBetaLog, includeErrorLog}`；三类诊断日志**默认不导出**，显式勾选才包含（学习数据始终包含）。
- StatusPage 新增"数据导出（隐私控制）"卡片：三个勾选框 + 一键下载 JSON 备份，完成后提示未包含项。

### P1-3 · Bundle 治理
- 本轮全部新代码落在懒加载页/旁路模块；构建后入口 **395.4 KB**（≤400 最佳线，远低于 420 的 lazy 触发阈值），无需 HomePage lazy。

---

## 三、修改文件清单

新增：
- `src/study/telemetry/skill-telemetry.ts`、`src/study/telemetry/skill-telemetry.test.ts`
- `scripts/check-telemetry-quality.cjs`
- `src/study/analytics/WeeklyReport.tsx`（Phase 13 补登记，本轮挂载强化）
- `src/data/export-privacy.test.ts`
- `src/ai/usage-metadata.test.ts`
- `src/study/analytics/effectiveness.test.ts`
- `docs/phase-14-report.md`

修改：
- `src/pages/StudyPage.tsx`（6 类 block 遥测埋点 + 难度反馈透传）
- `src/pages/AiTutorPage.tsx`（SessionCounter watch 刷新）
- `src/pages/StatusPage.tsx`（导出隐私卡）
- `src/study/analytics/analytics.ts`（firstWeekHealth/effectivenessReport/memoryHealth 常量 DAY_MS）
- `src/study/analytics/LearningDashboard.tsx`（FirstWeek Health / 效果报告 / 记忆健康区块）
- `src/ai/usage-tracker.ts`（durationMs/retryCount/getAiFeatureStats/getSessionAiUsage）
- `src/ai/runtime.ts`（wrapper 记录耗时与重试计数）
- `src/data/export-import.ts`（ExportOptions 隐私过滤）
- `scripts/check-export-integrity.cjs`（诊断日志保真改走显式 opt-in 路径）

未动禁区：Day1-180 课程内容、词库 g100-g150 与 chunk loader、SRS 核心、Assessment/Planner/Roleplay 引擎逻辑、SCHEMA_VERSION(v7)、零新增依赖。

---

## 四、数据变化

| 项 | 说明 |
|---|---|
| settings KV 新键 | `skill-telemetry`（≤500 条 block×skill 完成记录） |
| ai-usage-log 行结构 | +`durationMs?`、+`retryCount`（默认 0）；旧记录向后兼容 |
| Export 默认行为 | 三类诊断日志默认排除（隐私默认关闭） |
| SCHEMA_VERSION | 不变 v7，无 migration |

---

## 五、测试结果

```
npm run lint                ✅ PASS
npm run typecheck           ✅ PASS
npm test                    ✅ Test Files 48 passed (48) · Tests 252 passed (252)
npm run build               ✅ PASS
node scripts/check-chunks.cjs          ✅ ENTRY 395.4 KB ≤ 500 KB（≤400 最佳线）
node scripts/check-vocab-quality.cjs   ✅ 0 dup / 0 issues
node scripts/check-course-quality.cjs  ✅ Days=180 · Vocab=5014 · Failures=0
node scripts/check-data-integrity.cjs  ✅ Failures=0
node scripts/check-export-integrity.cjs ✅ Consistency 100% (162/162)
node scripts/check-telemetry-quality.cjs ✅ Failures=0（新增）
```

新增覆盖 16 用例：telemetry 写入校验/上限/聚合/脏比例 ×6、AI metadata 字段与 feature stats ×4、export privacy 默认排除与 opt-in ×3、effectiveness report 与 first-week health ×3。

---

## 六、Bundle 变化

入口保持 **395.4 KB**（Phase 13 为 395.4 KB）：本轮新增的 telemetry/analytics 扩展主要进入懒加载页面与 Node 门禁脚本，主包增量 ≈0。

## 七、新增能力汇总

1. 每个 block×skill 的完成遥测（含难度反馈关联），配独立质量门禁。
2. 首周健康度漏斗直接呈现在分析页。
3. 四维学习效果报告（词汇掌握/口语自评趋势/写作改善率/测评技能变化）。
4. AI 功能质量分析数据基础（耗时/失败率 per feature）。
5. 导出隐私控制（诊断日志默认不出门）。

---

## 八、风险

1. skill-telemetry 恒开（非 Beta 限定），KV 上限 500 条可控体积；若未来需要全量历史应改为独立表（需 schema 决策）。
2. practice/assessment 的 touched-skills 来自练习题型映射，"pronunciation" 型题目会被折叠进相邻技能维度（当前枚举无该维度的展示位）。
3. retryCount 目前恒为 0——Provider 层尚无重试实现，字段为前瞻预留。
4. 导出文件格式新增 `__e360blob__` 标记对象；旧版本应用导入新版备份会看到未知字段（validateEnvelope 只拦 schemaVersion，字段级向前兼容依赖"跳过未知键"，符合既有约定但需在文档中说明）。

## 九、下一阶段建议

1. 用 Beta Cohort + Skill 遥测跑首轮 5–10 人测试两周，产出首份《留存×技能难度》联合分析。
2. 基于 getAiFeatureStats 设定每 feature 的耗时基线，超基线自动在状态页提示降级建议。
3. 若决定支持多设备同步，先解决 Blob 的跨端编码统一（本阶段 data-URL 方案可直接复用）。
4. 评估把 error-log/beta 日志接入远程回收（需用户同意流程，超出 local-first 当前边界）。

---

**完成后停止。等待审核，不进入 Phase 15。**
