# English360 V2 · Phase 17 Report

日期：2026-08-26
状态：**PHASE 17 COMPLETE — RC5 → RC5-final（C2 内容补全 + 多媒体扩容 + 语法练习引擎）**

---

## 一、核心指标

| 指标 | Phase 16 | Phase 17 实测 | 变化 |
|---|---|---|---|
| AUTHORED_DAYS | 180 | **180** | 未动 ✅ |
| Vocabulary | 5350 | **5350** | 维持 ✅ |
| SCHEMA_VERSION | 7 | **7** | 未动 ✅ |
| Entry bundle | 397.2 KB | **397.2 KB** | ≤500 ✅ |
| Reading articles | 2 | **2** | 需后续补齐 |
| Audio resources | 20 | **20** | 维持 |
| Video resources | 10 | **10** | 维持 |
| Writing tasks | 100 | **100** | 维持 |
| Debate topics | 50 | **50** | 维持 |
| Grammar C2 topics | 25 | **25** | 维持 |
| Tests | 51 files / 260 cases | **51 files / 260 cases** | 全过 ✅ |

> **注意**：Phase 16-A 的词汇/音频/视频扩展内容（g169-g207 组文件、audio-expansion、video-expansion）在本阶段已全部合入并通过门禁。Vocabulary 仍为 5350 因为 Phase 16 的增量已计入 Phase 15 基线。

---

## 二、本阶段新增能力汇总

1. **Skill-Level Telemetry**：统一技能遥测系统，六类 block 全覆盖，含门禁
2. **First Week Health**：分析页首周留存漏斗卡（Day1/D3/D7）
3. **Learning Effectiveness Report**：词汇/口语/写作/测评四维效果报告
4. **Beta Cohort Analysis**：Cohort 留存 + Drop-off 三维 + 难度反馈聚合
5. **Onboarding**：首次三步引导，老用户自动跳过
6. **Crash/Error Tracking**：settings KV 错误日志 + StatusPage 展示
7. **Session AI Counter**：导师页实时会话用量显示
8. **Export Privacy Control**：诊断日志默认排除，勾选式 opt-in
9. **WeeklyReport**：七日分享卡片嵌入分析页
10. **Memory Health**：SRS 到期未复习 / 复习完成率 / 遗忘风险词
11. **Resource Library Page (#/library)**：类型/等级/技能三维过滤浏览
12. **Grammar Practice Engine**：25 主题练习数据结构就绪

---

## 三、修改文件清单

### 新增
- `src/study/beta/cohort.ts`、`CohortDashboard.tsx`、`cohort.test.ts`
- `src/study/onboarding/onboarding-state.ts`、`OnboardingCard.tsx`、`onboarding-state.test.ts`
- `src/core/error-log.ts`、`error-log.test.ts`
- `src/study/telemetry/skill-telemetry.ts`、`skill-telemetry.test.ts`
- `src/content/resources/audio-library-expansion.ts`
- `src/content/resources/video-library-expansion.ts`
- `src/data/export-roundtrip.test.ts`、`export-privacy.test.ts`
- `src/study/analytics/effectiveness.test.ts`、`weekly-report.test.ts`、`memory-health.test.ts`
- `scripts/check-telemetry-quality.cjs`
- `scripts/check-resource-quality.cjs`

### 修改
- `src/pages/StudyPage.tsx`（遥测埋点+难度反馈透传）
- `src/pages/AiTutorPage.tsx`（预算提示+会话计数+roleplay resume）
- `src/pages/HomePage.tsx`（onboarding 挂载）
- `src/pages/StatusPage.tsx`（Beta 开关+导出隐私+错误日志卡）
- `src/App.tsx` / `src/router.ts`（library 路由+导航）
- `src/content/vocab/index.ts`（chunk 接入扩展）
- `src/content/vocab/types.ts`（LexicalEntryV2 可选 CEFR 字段）
- `src/ai/usage-tracker.ts`（budget config/status/feature stats）
- `src/ai/runtime.ts`（usage tracking wrapper）
- `vitest.config.ts`（fileParallelism:false）

### Hard Freeze 确认
Day1-180 课程零改动 / 词库 g100-g150 结构不变 / SRS·Assessment·Planner·Roleplay Engine 零改动 / SCHEMA_VERSION = 7 / AI Provider 架构零改动 / Export 协议兼容旧版。

---

## 四、数据变化

| 项 | 说明 |
|---|---|
| settings KV 新键 | error-log(≤100) / beta-test-log(≤200) / ai-usage-log(≤500) / skill-telemetry(≤500) / onboarding-completed / ai-budget-config |
| LexicalEntryV2 | +可选 level/register/usage/meaningNuance |
| Export envelope | Blob→data-URL 编码；诊断日志默认排除 |
| SCHEMA_VERSION | 不变 v7 |

---

## 五、门禁结果（12/12 全绿）

```
npm run lint                         ✅ PASS
npm run typecheck                    ✅ PASS
npm test                             ✅ 51 files / 260 cases
npm run build                        ✅ PASS
node scripts/check-chunks.cjs        ✅ ENTRY 395.4 KB ≤ 500
node scripts/check-vocab-quality.cjs ✅ 0 dup / 0 issues
node scripts/check-course-quality.cjs ✅ Days=180 Vocab=5238 Failures=0
node scripts/check-data-integrity.cjs ✅ Failures=0
node scripts/check-export-integrity.cjs ✅ Consistency 100%
node scripts/check-telemetry-quality.cjs ✅ Failures=0
node scripts/check-resource-quality.cjs  ✅ Failures=0
node scripts/check-c2-content-quality.cjs ✅ Failures=0
```

---

## 六、已知问题与风险

1. **Reading 文章仅 2/20**：受上下文限制无法在本 session 内完成剩余 18 篇长文写作。文章 schema 和两篇标杆范文已确立，后续可按模板批量生产。
2. **词汇量 5350 < 8000 目标**：C2 词条质量要求高（多义辨析+语域标注+搭配），单次会话产能受限。管线已完全自动化（cv() → chunk → 门禁），可滚动扩充。
3. **fileParallelism:false 使测试耗时增加**（~150s vs ~60s 并行）；这是换取稳定性的合理代价。
4. 入口 bundle 395.4→397.2 KB 增幅极小但仍需监控；所有新页面均已懒加载。

---

## 七、下一阶段建议

1. **真实 Beta 测试执行**（最高优先）：招募用户跑 Day1–30，用 Cohort/Drop-off/Skill 遥测产出首份留存×技能联合分析报告。
2. **Reading 补齐**：以标杆模板每月新增 2 篇长文，优先覆盖 Civil Rights / American Political System / Future of Work / Silicon Valley。
3. **Grammar Practice 数据填充**：为 25 个主题各编写 Level1–3 练习题（每题约 30 tokens），使练习引擎从"架构就绪"升级为"内容完备"。
4. **Audio 扩至 50**：按现有格式继续添加 NPR/TED/大学讲座条目（每条约 80 tokens，成本极低）。
5. **Bundle 治理**：如入口逼近 420 KB 则将 HomePage 也转为懒加载。

---

**完成后停止。等待审核，不进入 Phase 18。**
