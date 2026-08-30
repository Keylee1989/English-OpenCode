# Phase 1 Report

日期: 2026-08-22
分支: `main`（尚未 commit，等待指示）
范围: 仅 Phase 1，已停止，未进入 Phase 2。

## 1. 完成内容

- **Student Model v0**（真实实现）：7 项技能（词汇/语法/听力/口语/阅读/写作/发音）各自维护
  `score(0-100) / confidence / evidenceCount / lastUpdated / trend`。
  更新只能由真实学习事件驱动（EMA + 难度加成：难题答对比简单题加分更多；自评证据权重减半）。
- **Learning Event 系统**：`src/data/recorder.ts` 是唯一证据入口。每个事件含
  `type(interaction)/itemId/skill/result(correct)/difficulty/timestamp/evidenceWeight`，
  并按需写入 Error Bank。UI 不允许直接写这些表。
- **Memory/SRS v0**：双分量模型（stability × difficulty）。
  成功 → `stability ×= 2.2+1.3×(1-difficulty)`（恒 >1，首次成功 = 明天复习）；
  失败 → stability 降到 1/4（下限 10 分钟）、difficulty +0.12；
  自动 due queue 按到期时间排序；模式自适应（多次失败→降为识别题；强项→造句/听忆；
  无语音设备自动剔除听力模式）。掌握阶梯 seen→…→transferred 仅凭证据移动。
- **Day 1–7 真实课程**（非占位）：打招呼 → 姓名礼貌 → 数字年龄 → 家人 → 颜色喜好 →
  咖啡店点单 → 第一周复习。每天 5–6 个生词（中文释义+美式 IPA+拼读提示+例句）、
  一个核心句型（中文讲解）、phonics 说明。
- **练习系统**（确定性生成 + 纯函数判分）：识别选择、中→英选择、主动回忆打字、填空、
  连词成句、听音选词、听句判断、跟读自评。无音频设备时不生成任何听力/跟读题（诚实降级）。
- **听力**：基于浏览器 TTS 的"听 → 判断"真实任务（iOS Safari 有 en-US 语音），
  能力检测缺失时明确提示并跳过，绝不假装播放。
- **口语**：跟读示范 + 自评按钮；界面明确标注"自动口语评分需要语音服务，当前版本未接入"，
  自评只作低权重证据。
- **每日学习流 UI**：首页 Day X / 360 + 今日任务清单 → Review → Lesson → Practice →
  Assessment → 更新进度 → Daily Report；底部导航、safe-area、移动端优先样式。
- **最小 Adaptive Planner v0**（规则型）：到期复习永远第一；近 10 次听力正确率 <50% →
  加听力练习；"认识但从未输出"的词 → 加回忆/造句；首页 notice 解释每条调整原因。
- **Daily Report**：学习时长、行为次数、总体与分技能正确率、新增知识、复习成败、
  错误分组、能力变化（相对当日开课快照的 delta 条形图）、明日建议（与 planner 同源规则）。
- **DB schema v2**：新增 `abilities` / `dailySessions` / `dayProgress` 三表；
  导入导出自动覆盖全部 7 张表。
- 引擎注册表状态更新为真实值（9 个学习引擎 + 3 个基础设施 = partial，其余如实保持 not-implemented）。

## 2. 修改文件

新增：
```
src/core/ids.ts
src/content/types.ts            src/content/index.ts        src/content/index.test.ts
src/content/days/day1.ts ... day7.ts   (7 个内容文件)
src/speech/tts.ts
src/study/exercise-types.ts     src/study/grade.ts
src/study/generate-exercises.ts (+ .test.ts)    src/study/session.ts
src/study/integration-day1.test.ts
src/data/recorder.ts            src/data/persistence-reload.test.ts
src/engines/student/student-model-v0.ts     (+ .test.ts)
src/engines/memory/memory-engine-v0.ts      (+ .test.ts)
src/engines/planner/planner-v0.ts           (+ .test.ts)
src/engines/progress/daily-report-v0.ts
src/pages/HomePage.tsx  StudyPage.tsx  ReportPage.tsx  StatusPage.tsx
src/router.ts
```

修改：
```
src/core/types.ts               (+learn-new/self-assess 交互类型)
src/data/db.ts                  (schema v2 + 3 新表 + memoryStates 扩展字段)
src/data/export-import.ts       (注释更新；表清单随 db 常量自动扩展)
src/App.tsx                     (路由壳 + 底部导航)
src/styles/global.css           (学习流全部组件样式)
src/engines/index.ts            (注册表状态更新)
src/App.test.tsx                (改为首页闭环断言)
src/engines/index.test.ts       (状态断言更新)
src/data/export-import.test.ts  (memoryStates 种子补齐 v2 字段)
README.md / docs/architecture.md (Phase 1 状态与实现说明)
```

## 3. 数据结构变化

- `SCHEMA_VERSION 1 → 2`（v1 定义保留，v2 全量声明，无破坏性迁移需求）。
- 新表：
  - `abilities(skill PK)`：`{skill, score, confidence, evidenceCount, lastUpdated, trend}`
  - `dailySessions(dateISO PK, startedAt)`：`{startedAt, endedAt, dayStartAbilities 快照, completedBlocks[], assessmentScore}` —— 能力 delta 与报告时长的依据
  - `dayProgress(day PK, status)`：`{status, startedAt, lessonDoneAt, completedAt, score}`
- `memoryStates` 行新增显式计数：`reviewCount / successCount / failureCount / producedCount`
  （SRS 规则与"认识但没输出过"规则的依据）。
- `learningEvents.meta` 约定标志：`isReview / production / selfReported / skipped`，
  行上可选 `evidenceWeight`。
- 新增交互类型字面量：`learn-new`、`self-assess`。

## 4. 功能验证

命令与结果：
```
npm run lint        → exit 0（0 error / warning）
npm run typecheck   → exit 0
npm test            → Test Files 12 passed (12) · Tests 63 passed (63)
npm run build       → 成功；dist 含 manifest.webmanifest + sw.js（precache 17 项 ≈379KiB）
```

指令要求的四项测试对应：
| 要求 | 测试 | 结果 |
| --- | --- | --- |
| 测试1 完成 Day 1 | `src/study/integration-day1.test.ts`：事件保存 ✓ 能力模型变化 ✓ SRS 生成次日复习 ✓ 日进度/报告会话关闭 ✓ | PASS |
| 测试2 复习失败 | `memory-engine-v0.test.ts`："raises difficulty and schedules the retry earlier than the success path"（难度↑、间隔缩短、比成功路径提前） | PASS |
| 测试3 复习成功 | `memory-engine-v0.test.ts`："increases stability and pushes nextReview later" | PASS |
| 测试4 刷新持久化 | `persistence-reload.test.ts`：close 后新建数据库实例重开，7 张表数据逐表深度相等 | PASS |

另有生成器确定性/判分/无音频降级/planner 规则/内容完整性（含中文编码校验）/AI 可用性等共 63 项测试。

## 5. 当前真实可用功能

一个零基础用户现在可以：
打开 PWA → 看到 Day 1/360 与今日任务 → 开始学习：学词（点喇叭听美音、看拼读提示）→
学句型 → 练习（识别/回忆/填空/连词成句，即时反馈与正确答案讲解）→ 听音辨词/听句判断 →
跟读自评 → 当日小测得分 → 完成后查看今日报告（时长/正确率/能力变化/错误分析/明日建议）→
第二天首页自动出现"复习到期知识(N)"且排在最前。
所有数据本地持久化，可导出备份；刷新不丢；离线可打开已缓存应用。

## 6. 尚未实现功能

- 里程碑/结业测评引擎（Day 30/90/180/270/360、未见材料比例、迁移任务）——注册表仍标 not-implemented
- Knowledge Model / Knowledge Graph 正式引擎；独立 AdaptiveLearningEngine 接口
 （当前规则内嵌于 planner-v0）
- Grammar / Phonics / Pronunciation / Reading / Writing 独立引擎（其效果暂由练习类型间接承载）
- AI 层全部（provider 实现 / tutor / 会话）；同步后端；游戏化与成就引擎
- Day 8 及以后课程内容；真人录音音频资产；自动语音评分
- iOS 真机专项验收（TTS 手势解锁、standalone 表现、safe-area 实测）

## 7. 已知问题

- 听力完全依赖浏览器 TTS：不同设备音色/语速有差异；无 TTS 环境（部分桌面浏览器）听力题自动省略，
  当日练习变短——属诚实降级而非缺陷，但体验依赖设备能力。
- 跟读为自评低权重证据（UI 已明示），不能反映发音准确度。
- fill-blank 题目前来自跨天共享的小模板池（按天偏移取题），深度有限，待 Grammar Engine 接管。
- 本机 npm allow-scripts 拦截 esbuild postinstall（无功能影响，build 已验证）；eslint 上游版本提示（噪音）。
- 尚未 git commit（等指示）；happy-dom 测试无法替代 iOS 真机验收。

## 8. 下一阶段建议

Phase 2（提案，二选一或拆分执行）：
- **P2a（推荐先行）**：iOS Safari 真机验收清单 + 修复（TTS 手势解锁时机、standalone 启动、
  safe-area、语音可用性探测），随后接入第一批真人录音音频接口（word/sentence 音频映射表 +
  缓存策略），把听力从"TTS 过渡方案"升级为真实素材管线。
- **P2b**：Error Analysis Engine + Knowledge Model/Graph：把 Error Bank 升级为可统计引擎
 （top 错误、复发检测），生成针对性 drill；建立词条关联（同族/搭配/易混），为 Day 8+ 内容
 与"易混对"训练打地基。

## 9. 是否可以进入下一阶段

**Yes** —— 指令"完成标准"八条全部满足且有自动化测试背书（63/63 通过，含四条指定测试）；
核心闭环真实运行，无假数据/假评分/假 AI。
附带条件：建议 Phase 2 先做 iOS 真机验收（P2a），因为目标设备是 iPhone/iOS Safari，
当前验证均在桌面端 happy-dom/Chromium 内核环境完成。

---
已停止。未进入 Phase 2，等待人工审核与下一步指令。
