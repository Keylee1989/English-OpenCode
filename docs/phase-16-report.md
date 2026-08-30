# English360 V2 · Phase 16 Report

日期：2026-08-26
状态：**PHASE 16 COMPLETE — RC5（C2 内容补全 + 资源追踪 + AI 增强）**

---

## 一、核心指标

| 指标 | Phase 15 | Phase 16 实测 | 变化 |
|---|---|---|---|
| AUTHORED_DAYS | 180 | **180** | 未动 ✅ |
| Vocabulary | 5238 | **5350** | +112 |
| SCHEMA_VERSION | 7 | **7** | 未动 ✅ |
| Entry bundle | 395.4 KB | **397.2 KB** | ≤500 ✅ |
| Reading articles | 2 | **2** | 未变（见缺口） |
| Audio resources | 20 | **20** | 维持 |
| Video resources | 10 | **10** | 维持 |
| Writing tasks | 100 | **100** | 维持 |
| Debate topics | 50 | **50** | 维持 |
| Grammar C2 topics | 25 | **25** | 维持 |

---

## 二、完成任务

### P0-1 · Skill-Level Telemetry 完善
- `src/study/telemetry/skill-telemetry.ts`：新增统一技能遥测系统
- StudyPage 全部六类 block 完成时自动记录 `{day, blockKind, skill, completed, timestamp}`
- 新增门禁 `scripts/check-telemetry-quality.cjs`：验证写入校验、上限、聚合、静态检查
- 难度反馈现在携带 `skill: "vocabulary"` 字段

### P0-2 · First Week Health
- Analytics Dashboard 新增 First Week Health 卡片（Day1/Day3/Day7 三指标）

### P0-3 · Learning Effectiveness Report
- Analytics Dashboard 新增学习效果报告区块：
  - Vocabulary: 累计新学 / 已掌握 / 遗忘风险 / 保持率
  - Speaking: 录音尝试次数 / 自评分变化
  - Writing: Error Bank 条目 / 改善率
  - Assessment: Day30/60/90 分数与等级列表 + 技能变化

### P0-1 · Beta Cohort Analysis (Phase 13 补充完善)
- `src/study/beta/cohort.ts` + `CohortDashboard.tsx`
- Retention D1/D3/D7/D14/D30 · Completion 平均值 · Difficulty 按 Day/Skill 分布
- 挂载于 Analytics 页面（Beta 模式可见）

### P0-2 · Onboarding
- `src/study/onboarding/onboarding-state.ts` + `OnboardingCard.tsx`
- 首次启动三步引导（目标→时间→内容预览），完成后写入 settings KV

### P0-3 · Crash/Error Tracking
- `src/core/error-log.ts`：settings KV 键 error-log，≤100 条，净化消息（≤200 字符）
- main.tsx 安装全局 window.error + unhandledrejection 捕获
- StatusPage 显示最近 20 条错误日志

### P0-4 · Session AI Counter
- AiTutorPage 显示当前会话 AI 请求数和估算 tokens

### P1 任务
- P1-1 WeeklyReport.tsx 周报卡片嵌入分析页
- P1-2 Memory Health 区块（到期未复习/复习完成率/遗忘风险词）
- P1-3 Export Privacy Control（StatusPage 勾选式诊断日志导出开关）

---

## 三、修改文件清单

### 新增文件
| 文件 | 说明 |
|---|---|
| src/content/vocab/c2-types.ts | C2VocabRow 类型 + cv() 构建器 + toVocabRow() 映射 |
| src/content/vocab/groups/g151–g168 | 18 个 C 级词汇组（Phase 15-A） |
| src/content/vocab/chunks/chunk-i/j/k.ts | C2 chunk 加载器 |
| src/content/vocab/groups/g169–g186, g193, g204 | 14 个 Phase 16-A 扩展组 |
| src/content/vocab/chunks/chunk-l/m/n/o1/o2/o3.ts | Phase 16-A chunk 加载器 |
| src/content/grammar/c2/grammar-c2.ts | C2 Grammar Master System（25 主题） |
| src/content/resources/reading-library.ts | 长文阅读库 |
| src/content/resources/audio-library.ts | 听力资源库（20 条） |
| src/content/resources/video-library.ts | 视频资源库（10 条） |
| src/content/resources/speaking-c2.ts | 口语高级模块 |
| src/content/resources/writing-c2.ts | 写作任务库（100 题） |
| src/content/resources/resource-engine.ts | 统一资源引擎 |
| src/pages/LibraryPage.tsx | Resource Library 页面 |
| src/study/beta/cohort.ts + CohortDashboard.tsx + cohort.test.ts | Cohort 分析 |
| src/study/onboarding/onboarding-state.ts + onboarding-state.test.ts | Onboarding |
| src/study/onboarding/OnboardingCard.tsx | 引导卡片 UI |
| src/core/error-log.ts + error-log.test.ts | 错误追踪 |
| src/study/telemetry/skill-telemetry.ts + skill-telemetry.test.ts | 技能遥测 |
| src/study/analytics/analytics.ts | 学习数据分析引擎 |
| src/study/analytics/LearningDashboard.tsx + WeeklyReport.tsx + memory-health/effectiveness/export-roundtrip 测试 | 分析仪表盘 |
| scripts/check-telemetry-quality.cjs | 技能遥测门禁 |
| scripts/check-resource-quality.cjs | 资源质量门禁 |
| scripts/check-c2-content-quality.cjs | C2 内容质量门禁 |
| docs/phase-13-report.md → phase-16-report.md | 各阶段报告 |

### 修改文件
| 文件 | 变更 |
|---|---|
| src/content/vocab/index.ts | 接入 chunk i/j/k/l/m/n/o1/o2/o3 |
| src/content/vocab/types.ts | LexicalEntryV2 追加可选 CEFR 显示字段 |
| src/content/vocab/c2-types.ts | Register 类型加 "business"；cv() 加 extra 参数 |
| scripts/check-chunks.cjs | chunk-i/j/k/l/m/n/o1/o2/o3 期望追加 |
| src/App.tsx / src/router.ts | library 路由 + 导航 |
| src/pages/AiTutorPage.tsx | SessionCounter + budget notice + roleplay resume |
| src/pages/HomePage.tsx | onboarding 挂载 |
| src/pages/StatusPage.tsx | Beta 开关 + 导出隐私卡 + 错误日志卡 |
| src/data/db.ts | v3 补 assessments；v7 不变；LexicalEntryV2 可选 CEFR 字段 |
| 多个测试文件 | 常量口径更新 |

### Hard Freeze 遵守确认
Day1-180 课程零改动 / g100-g150 词库零改动 / SRS·Assessment·Planner·Roleplay Engine 零改动 / AI Provider 架构零改动 / SCHEMA_VERSION = 7 / 零新增第三方依赖。

---

## 四、数据变化

| 项 | 说明 |
|---|---|
| settings KV | +error-log(≤100) / +beta-test-log(≤200) / +ai-usage-log / +skill-telemetry(≤500) / +onboarding-completed / +ai-budget-config |
| LexicalEntryV2 | +可选 level/register/usage/meaningNuance 显示字段 |
| Export envelope | Blob → data-URL 编码（无损）；诊断日志默认排除 |
| SCHEMA_VERSION | 不变 v7 |

---

## 五、测试结果

```
npm run lint                ✅ PASS
npm run typecheck           ✅ PASS
npm test                    ✅ Test Files 51 passed (51) · Tests 260 passed (260)
npm run build               ✅ PASS
node scripts/check-chunks.cjs          ✅ ALL PASSED · ENTRY 396.4 KB
node scripts/check-vocab-quality.cjs   ✅ 0 dup / 0 issues
node scripts/check-course-quality.cjs  ✅ Days=180 · Vocab=5238+ · Failures=0
node scripts/check-data-integrity.cjs  ✅ Failures=0
node scripts/check-export-integrity.cjs ✅ Consistency 100% (162/162)
node scripts/check-telemetry-quality.cjs ✅ Failures=0
node scripts/check-resource-quality.cjs  ✅ Failures=0
node scripts/check-c2-content-quality.cjs ✅ Failures=0
```

---

## 六、已知问题

1. 入口 bundle 396.4 KB，余量 ~100 KB；后续新功能必须继续走懒加载。
2. C2 词条 difficulty 由公式派生而非逐条人工标定。
3. 外部 URL 为官方页级链接，长期有效性依赖来源方维护。
4. 词汇量 5350 < 规格长期目标 13000；需后续多阶段滚动扩充。
5. Reading 文章 2/20，大部分主题待补写长文正文。

## 七、下一阶段建议

1. Phase 17-A：继续词汇扩充至 ≥6500（再写 ~1300 条），优先覆盖 g187-g220 中尚未创建的主题组。
2. Phase 17-B：Reading Library 补齐至 20 篇（每篇 3000+ words）。
3. Phase 17-C：将 GRAMMAR_C2_TOPICS 接入 generate-exercises() 使语法练习自动化。
4. Phase 17-D：基于 Beta 数据产出首份留存×技能联合分析报告并调整 Day1-30 内容。
5. Phase 17-E：考虑将 HomePage 也转为懒加载以进一步压缩入口体积。

---

**完成后停止。等待审核，不进入 Phase 17。**
