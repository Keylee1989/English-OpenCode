# English360 V2 · Phase 11 Report

日期：2026-08-25
状态：**PHASE 11 COMPLETE — 进入 RC 稳定化与真实学习验证阶段**

版本定位：**RC1**（Phase 10-B 完成时为 RC0）

---

## 一、最终门禁（全绿）

| 门禁 | 结果 |
|---|---|
| npm run lint | ✅ PASS |
| npm run typecheck | ✅ PASS |
| npm test | ✅ **35 文件 / 203 用例** 全通过 |
| npm run build | ✅ PASS（PWA 正常） |
| node scripts/check-chunks.cjs | ✅ PASS（入口 481.3 KB ≤ 500 KB） |
| node scripts/check-vocab-quality.cjs | ✅ 0 dup / 0 issues |
| node scripts/check-course-quality.cjs | ✅ Days=180 / Failures=0 / Vocabulary model=5014 |
| node scripts/check-data-integrity.cjs（新增） | ✅ Failures=0 |

核心指标保持：**AUTHORED_DAYS = 180 · Vocabulary = 5014 · SCHEMA_VERSION = 7**（均未破坏）。

---

## 二、新增功能

### Phase 11-A：用户体验稳定化（P0）

**Task 1 · Milestone 即时结果卡**
- Day30/60/90 测评提交后，学习流程暂停并立即展示：
  ⭐ Milestone Completed · 当前水平(levelForScore) · 五项技能分（词汇/听力/口语/阅读/写作，附上次分数）· 相比上一次 ±xx%（首次显示"已建立基准"）· 提升项列表 · 下一阶段建议（来自 recommendationsZh）。
- 实现：`StudyPage.tsx` 新增 `MilestoneResultCard` + `onMilestone` 回调；`submitAssessment()` 返回值被捕获后经 `getAssessmentHistory()` 取上次成绩计算差值。
- **未改 assessment schema**，纯 UI 展示层；评分逻辑零改动。

**Task 2 · RoleplayRecorder 录音回放**
- 录音保存后出现 ▶ 播放录音 / ⏸ 暂停 / ↻ 重新播放 三键，基于本地 `<audio>` + objectURL。
- 不自动评分、不改 speakingAttempts schema、保留用户自评（1–5★）模型。

**Task 3 · Conversation 独立历史页面**
- 新页面 `#/aihistory`（底部导航"历史"）：日期、类型（5 类中文标签）、关联课程 Day、消息数量。
- 支持类型筛选 + 分页（每页 10 条，上一页/下一页）+ 查看（展开全部消息含 noteZh）+ 删除 + 继续对话（tutor 类型经 sessionStorage 移交至导师页自动载入最近 6 轮上下文）。
- **必须项达成**：所有查询均调用 `paginateConversations()`，未重新实现任何查询。为支持"全部类型"视图，将该函数的 `type` 参数改为可选（无 type 时按 updatedAt 主索引分页），原调用行为不变。

### Phase 11-B：学习数据分析（P1）

**Task 4 · Learning Analytics**
- 新增 `src/study/analytics/analytics.ts`（只读聚合）+ `LearningDashboard.tsx`（`#/analytics`，导航"分析"，懒加载）。
- 行为统计（近30天每日）：学习时长条形图、完成 block 数、XP、连续/最佳天数、活跃天数、活跃日均时长。
- 效果统计：词汇保持率（memoryStates success/failure）、错误频次 Top5 分类、口语尝试次数、里程碑测评成长曲线与阶段成长分。

**Task 5 · AI 成本统计**
- 新增 `src/ai/usage-tracker.ts`：记录每次 AI 调用的 provider/model/timestamp/feature/tokens(估算)/ok，存于 settings KV 单键（上限 500 条），提供 `getAiUsageSummary()`。
- `runtime.activateAi()` 现以透明 wrapper 包裹 `complete()` 与 `completeStream()`——失败也记录后原样抛出。
- 隐私契约：**不存 API Key、不存任何用户内容**（仅 feature 标签等元数据），测试中有断言保护。
- `AiCompletionRequest` 增加可选 `feature?: string` 标签字段；tutor-service 各功能（explanation/exercise-gen/writing-review/error-analysis/dialogue）与 roleplay-engine（roleplay）已打标。

### Phase 11-C：真实学习测试准备（P0）

**Task 6 · Beta Test Mode**
- `AppSettings.studyMode: "normal" | "beta-test"`（默认 normal；settings KV 自动合并默认值，**无需 schema 升级**）。
- Beta 模式额外记录（settings KV 单键，上限 200 条）：session-start / session-end / lesson-complete(day) / drop-off(step/total) / difficulty-feedback(day, 偏易|适中|偏难)。
- 埋点位置：StudyPage 会话生命周期、课程完成、首页退出按钮（中途退出即记 drop-off）；课程开场卡的难度反馈按钮仅 Beta 可见。
- StatusPage 新增开关卡片 + 最近 12 条记录查看 + 一键清空。Normal 模式行为与评分完全不受影响。

**Task 7 · Day1-30 新用户流程优化**
- Day1–30 课程开场卡新增固定引导行："学什么 / 怎么学 / 为什么这样学"（记忆科学一句话），直接回应零基础用户前三问。
- Day7 习惯形成与 Day30 提升感知：由既有机制保障并在报告中说明——Day7 复习队列（SRS 到期复习）+ Day30 里程碑测评即时结果卡（本次新增）给出可感知提升证据；Beta 模式的 drop-off/difficulty 数据将用于后续针对性调优。
- 未改动任何课程内容与天数。

---

## 三、修改文件清单

新增：
- `scripts/check-data-integrity.cjs`
- `src/pages/AiHistoryPage.tsx`
- `src/study/analytics/analytics.ts`
- `src/study/analytics/LearningDashboard.tsx`
- `src/study/beta-mode.ts`
- `src/ai/usage-tracker.ts`
- `src/ai/usage-tracker.test.ts`
- `docs/phase-11-report.md`

修改：
- `src/pages/StudyPage.tsx`（MilestoneResultCard、onMilestone、beta 埋点、Day≤30 引导行）
- `src/pages/RoleplayRecorder.tsx`（回放控件）
- `src/pages/AiTutorPage.tsx`(继续对话移交接收)
- `src/pages/StatusPage.tsx`（Beta 开关 + 日志）
- `src/App.tsx` / `src/router.ts`（新路由 aihistory/analytics；新页懒加载）
- `src/ai/conversation-store.ts`（paginateConversations type 参数改为可选）
- `src/ai/provider.ts`（请求增加可选 feature 字段）
- `src/ai/runtime.ts`（usage-tracking wrapper）
- `src/ai/tutor-service.ts` / `src/engines/tutor/roleplay-engine.ts`（feature 打标）
- `src/core/types.ts`（studyMode 设置项）
- `src/data/db.ts`（v3 声明补回 assessments，见"数据结构变化"）

未动禁区：词库数据 g100-g150 与 chunk loader、Day1-180 内容、SCHEMA_VERSION(=7)、Assessment Engine 评分逻辑、Roleplay Engine、SRS Engine、AI Provider 具体实现。

---

## 四、数据结构变化

| 项 | 变化 | 说明 |
|---|---|---|
| SCHEMA_VERSION | **不变（v7）** | 所有新存储复用现有表 |
| settings KV 新键 | `ai-usage-log`（≤500 条） | AI 调用元数据，仅 provider/model/ts/feature/tokens/ok |
| settings KV 新键 | `beta-test-log`（≤200 条） | Beta 会话遥测，仅时间戳/kind/payload 计数类字段 |
| AppSettings | +`studyMode` 字段 | loadSettings 浅合并默认值，旧数据自动兼容 |
| Dexie v3 声明 | 补回 `assessments` 索引声明 | 使 v2→v3 迁移恢复"纯增量"；最终 v7 结构完全不变 |

Export/import 完整性：新数据都在 settings 表内，随既有导出通道自动备份；`check-data-integrity.cjs` 已把 DATA_TABLE_NAMES ↔ 最终 schema ↔ exportAllData 三者一致性纳入门禁。

---

## 五、测试结果

```
npm test → Test Files 35 passed (35) · Tests 203 passed (203)
新增用例：usage-tracker.test.ts（记录隐私契约 / 聚合正确性 / studyMode 默认与持久化）
既有 33 文件全部保持通过；course-quality.test.ts（8 用例）继续守护 Day1-180。
入口 bundle：481.3 KB ≤ 500 KB 门禁（新页面懒加载后回落 ~9 KB）。
```

---

## 六、已知问题

1. 入口 bundle 余量收窄至 ~19 KB：本轮 StudyPage/路由增量进入主包。下一阶段新增页面一律沿用 lazy() 模式；若再逼近 500 KB，应把 ReportPage/StatusPage 也转懒加载。
2. AI usage 的 tokens 为按字符估算（~4 chars/token），非 API 返回的真实计费数；当前仅作趋势参考。
3. 继续对话目前仅支持 tutor 类型（其余类型为只读归档，符合其一次性产物属性）；跨类型统一"继续"需要各引擎支持会话恢复，留待下阶段评估。
4. Beta 遥测仅本地存储；未来若需上传汇总，需另行设计知情同意与脱敏方案。
5. 学习时长按 dailySession start/end 差计算，中途长时间挂机会高估单日时长（会话结束才封口）。

---

## 七、下一阶段建议

1. **真实 Beta 测试执行**：招募 5–10 名零基础用户开启 Beta 模式跑完 Day1–30；用 drop-off 曲线定位放弃点，用 difficulty-feedback 定位最难模块，验证 Day1 引导与 Day30 成就感是否达标。
2. **Analytics 增强（小步）**：给 Learning Dashboard 增加"按天完成率"与"错误→复习后改善率"两个衍生指标；仍保持只读。
3. **成本控制落地**：基于 usage log 设定每会话调用上限提示（先提示不阻断），为多模型选择提供依据。
4. **Bundle 治理**：ReportPage/StatusPage 懒加载化；监控入口尺寸趋势并入 CI 报告。
5. **数据安全演练**：export/import 加入随机 round-trip 抽查到常规测试，防止未来 schema 演进破坏备份兼容。

---

## 八、Phase 11 完成定义核对

- [x] 180 天课程稳定运行（check-course-quality Failures=0；203 测试全绿）
- [x] 5014 词库稳定运行（check-vocab-quality 0 dup/0 issues；词库文件未动）
- [x] 用户学习行为可观察（Behavior Summary + Dashboard）
- [x] 学习效果可衡量（词汇保持率 / 错误频次 / 口语尝试 / 测评成长曲线 + Milestone 即时反馈）
- [x] 产品具备 Beta 测试条件（Beta Test Mode + 数据完整性门禁）

**完成后停止。等待审核，不进入 Phase 12。**
