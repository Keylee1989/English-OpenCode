# English360 V2 · Phase 12 Report

日期：2026-08-25
状态：**PHASE 12 COMPLETE — RC1 → RC2（真实用户验证 / 稳定性 / 数据质量 / 性能治理）**

---

## 一、核心指标（全部保持）

| 指标 | 要求 | 实测 |
|---|---|---|
| AUTHORED_DAYS | = 180 | **180** |
| Vocabulary | = 5014 | **5014** |
| SCHEMA_VERSION | = 7 | **7** |
| Entry bundle | < 450 KB（底线 ≤500） | **391.7 KB** |

---

## 二、完成任务

### P0-1 · Beta 数据闭环完善
新增 `src/study/beta/beta-analytics.ts` + `BetaDashboard.tsx`（挂载于分析页，仅 Beta 模式可见）：
- **漏斗**：Day1 完成率、Day3/Day7 留存率、Day30 完成率（源自 dayProgress；单用户本地为 0/100，多用户导出后同一函数可聚合）。
- **Drop-off 分析**：按课程天 / 模块类型（lesson·practice·review·reading·writing）/ 会话步骤 三维分组，自动输出"最严重流失位置"（如 `Day 5 · listening（2 次退出）`）。
- **难度反馈分析**：偏易/适中/偏难计数与占比、"偏难"按天排行。
- StudyPage 的 drop-off 遥测增强为 `step/total/blockKind/day/titleZh`，流失可定位到具体模块。只读，不改学习流程。

### P0-2 · AI Usage 成本控制
- settings KV 新键 `ai-budget-config`，默认 `{ dailySoftLimit: 100000, monthlySoftLimit: 2000000 }`。
- `getAiBudgetStatus()` 按日/月窗口汇总 tokens，三级：ok / warn80 / over100。
- UI：导师页 ≥80% 显示"今日AI使用量达到80%，建议减少重复请求"；≥100% 仅升级文案，**不阻断调用**；AI 设置页新增上限编辑卡片。

### P0-3 · Export/Import Round Trip 门禁
新增 `scripts/check-export-integrity.cjs`：随机生成全表 162 行 → export → 清库 → import → re-export → 规范化逐行比对。
结果：**Consistency 100%（162/162）**；覆盖 conversations / assessments / speakingAttempts（含 Blob 音频）/ memoryStates / settings（含 ai-usage-log、beta-test-log）/ 其余全部表。

**顺带修复的真实缺陷**：export 原样输出 Blob——走 JSON 文件路径时录音会静默丢失。现 export 将 Blob 编码为 `{__e360blob__:true, dataUrl}`、import 解码还原，envelope 在内存与文件两条路径均无损。Blob 探测用鸭子类型（兼容 IndexedDB 返回的同形对象）。

### P0-4 · Bundle 治理
App.tsx 路由级代码分割：StudyPage / ReportPage / StatusPage / AiTutorPage / AiSettingsPage / AiHistoryPage / LearningDashboard 全部 lazy()，HomePage 保持静态。
入口：481.3 KB → **391.7 KB**（-18.6%，优于 <450KB 目标），未删除任何功能。

### P1-1 · Analytics 增强
- 课程完成率曲线 `getCompletionCurve()`：按 Day 输出 100%（完成）/50%（学完课未测评）/0%，Dashboard 显示最近 30 天条形曲线。
- Error Bank 改善率 `errorImprovementRatePercent`：错误关联词条在其后最近一次判分作答答对即计改善；Dashboard 展示百分比与样本数。

### P1-2 · Continue Conversation 扩展（评估结论）
- **Roleplay：已支持**。历史页 roleplay 会话出现"继续对话"，经 sessionStorage 移交后由既有 `resumeRoleplay()` 恢复场景/角色/轮次/最近对话并可直接续聊；conversation schema 未变。
- Writing-review：暂不支持——一次性批改产物无会话状态机，保持只读查看+删除。

---

## 三、修改文件清单

新增：`src/study/beta/beta-analytics.ts`、`src/study/beta/BetaDashboard.tsx`、`src/study/beta/beta-analytics.test.ts`、`scripts/check-export-integrity.cjs`、`src/data/export-roundtrip.test.ts`、`src/ai/usage-budget.test.ts`、`docs/phase-12-report.md`

修改：`src/pages/StudyPage.tsx`（drop-off 遥测增强）、`src/pages/AiTutorPage.tsx`（预算横幅/tab 移交/roleplay resume）、`src/pages/AiHistoryPage.tsx`（roleplay 继续对话）、`src/pages/AiSettingsPage.tsx`(用量上限卡)、`src/App.tsx`（全路由懒加载）、`src/study/analytics/analytics.ts`（两项新指标）、`src/study/analytics/LearningDashboard.tsx`（新指标展示+Beta 区块）、`src/ai/usage-tracker.ts`（budget config/status）、`src/data/export-import.ts`（Blob 无损编码/解码）

未动禁区：Day1-180 课程内容、词库结构 g100-g150 与 chunk loader、Assessment Engine 算法、SRS 核心逻辑、DB schema version(v7)、零新增第三方依赖。

---

## 四、数据结构变化

| 项 | 变化 | 说明 |
|---|---|---|
| settings KV 新键 | `ai-budget-config` | 软上限仅提示不阻断 |
| Export envelope | Blob → tagged data-URL 编码 | 导入解码还原；JSON 文件路径无损 |
| SCHEMA_VERSION | 不变 v7 | 新数据均在 settings KV 内 |
| 学习流程/评分逻辑 | 零改动 | Analytics/Budget 只读或旁路遥测 |

---

## 五、测试结果

```
npm run lint                ✅ PASS
npm run typecheck           ✅ PASS
npm test                    ✅ Test Files 38 passed (38) · Tests 214 passed (214)
npm run build               ✅ PASS
node scripts/check-chunks.cjs         ✅ ENTRY 391.7 KB ≤ 500 KB（目标 <450 达成）
node scripts/check-vocab-quality.cjs  ✅ 0 dup / 0 issues
node scripts/check-course-quality.cjs ✅ DAYS=180 · Vocab=5014 · Failures=0
node scripts/check-data-integrity.cjs ✅ Failures=0
node scripts/check-export-integrity.cjs ✅ Consistency 100% (162/162)
```

新增测试覆盖：beta analytics（漏斗/分组/难度聚合）、usage budget（默认值/持久化/80%与100%分级/失败不计费/日月窗口）、export roundtrip（JSON 安全编码/清库还原一致性）。连续 4 次全量套件 214/214 通过。

---

## 六、已知问题

1. 全量并行跑测试时曾观察到一次偶发失败（随后连续 4 次完整重跑均 214/214）；疑为资源竞争下的时序抖动，建议 CI 中对 DB 类测试启用串行分片观察。
2. tokens 为字符估算（~4 chars/token），非计费精确值，仅用于趋势与阈值提示。
3. vitest/happy-dom 环境下 fake-indexeddb 的 structured clone 不识别环境 Blob，DB 读回即降级为普通对象——生产浏览器不受影响；二进制保真由 Node 环境 .cjs 门禁断言。
4. 入口 bundle 391.7 KB 后仍有余量，但 HomePage（静态首屏）若继续增重需考虑一并懒加载。

---

## 七、下一阶段建议

1. 用 Beta 模式执行 5–10 人真实新用户测试（重点 Day1–30），以 drop-off 曲线与难度反馈驱动内容微调。
2. Dashboard 增加"按周留存队列"视图；将 beta 日志纳入导出包文档说明。
3. AI 成本控制下一步：基于 usage log 的会话内调用次数提示（先提示后限制的可选开关）。
4. 若未来导出为压缩文件格式，可将 data-URL 还原为原始二进制附件存储以减小体积。

---

**完成后停止。等待审核，不进入 Phase 13。**
