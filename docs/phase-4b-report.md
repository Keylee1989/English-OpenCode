# English360 V2 · Phase 4-B Report

日期：2026-08-23
状态：**已完成，停止等待审核**（未进入 Phase 5）

---

## 一、完成内容

### 1. AI Tutor UI 接入（新页面 `#/tutor`，HomePage/底栏均有入口）

`src/pages/AiTutorPage.tsx`，三个功能全部基于真实数据 + 真实 AI 调用：

1. **今日课程解释**：输入 = 当前课程（天号/标题/目标/句型/本课词汇）+ Student Context
   （能力/弱点/错误统计/知识阶段）。输出 = 中文讲解 + 英文例句（附中文翻译）。
   另支持自由提问框（走 `buildTutorSystemPrompt()` 完整 system prompt）。
2. **错题分析**：从错误银行读取最近 10 条记录供选择；输入 = 错误记录 + 知识上下文 +
   学生上下文；输出 = 错误原因（中文）+ 正确英文表达 + 练习建议（中文）。
   新增服务函数 `analyzeError()`（STRICT JSON 校验）。
3. **情景对话**：根据当前 Day 的主题与目标调用新增的 `generateDialogue()`
   （STRICT JSON：恰好 5 轮、A/B 交替、优先使用本课词汇），渲染对话气泡（英+中）。

**降级策略（强制）**：
- 未配置 AI → 页面顶部诚实提示 + 功能按钮禁用 + 指向「AI 设置」；
- AI 调用失败或 JSON 格式无效 → 显示具体失败原因（`ok:false, reasonZh`），
  **绝不显示编造的结果**；核心学习功能全程不依赖 AI。

### 2. AI 作文纠错接入（StudyPage · WritingCard）

- 配置好 AI 后，写作卡出现「AI 批改我的句子」按钮 → 调用 `evaluateWriting()`。
- 结果展示：AI 评分 /100、逐条 **原句 → 修改 + 中文解释**、整体改进建议。
- **错误写入 Error Bank**：每条被接受的修改通过 `storeEnrichedError()` 写入一条
  enriched 记录（skill=writing, category=writing-mistake, answerText=原文，
  descriptionZh="原句→修改：解释"），自动进入既有复习/补救闭环。
- 未配置或失败时：显示原因并明确"自评按钮始终可用"，不阻塞写作流程。

### 3. AI 设置页（新页面 `#/aisettings`）

- Provider 选择：OpenAI / DeepSeek / 通义千问(DashScope 兼容模式) / 豆包(火山方舟)，
  展示默认模型与 key 申请提示。
- API Key 输入（password 型，连接成功后立即从 DOM 清空）。
- **安全要求落实**：
  - Key 只保存在会话内存（`src/ai/runtime.ts` 模块变量）；**禁止且未写入 Dexie/localStorage**；
  - 仅非敏感偏好（providerId/modelId）存 localStorage；
  - 「清除本会话配置」一键销毁内存中的 Key。
- 连接状态展示：unconfigured / ready(厂商+模型) / error(原因)，并提供
  「发送测试请求」做真实小请求验证（成功/失败如实上报）。

### 4. 游戏化系统 v0（无动画，纯数值）

`src/engines/gamification/gamification-v0.ts` + Dexie schema v5 新表 `gamification`：

- **XP 规则**：lesson +50 / practice +30 / review +20 / drill +25 / assessment +40；
  连续第 2 天起每日首次获得 XP 额外 +10 延续奖励。
- **连续学习天数**：按自然日推进（同日重复不加、隔日 +1、断档重置为 1），
  同时维护 bestStreakDays 与 daysActive 计数。
- **等级**：每 300 XP 升 1 级（纯函数）。
- **勋章**（7 枚，纯函数判定）：第一课 / 十课之约 / 三十天里程碑 / 九十天里程碑 /
  七日坚持 / 三十日坚持 / 千点学者。
- **触发挂钩**（只绑定真实学习行为）：`markLessonDone()`→lesson XP；
  `markBlockDone("practice-/assessment-/review/drill")`→对应 XP；
  StudyPage 的复习块与专项训练块完成现在也正确记入。
- UI：HomePage 顶部状态条（XP/等级/连续天数/最佳/已获勋章名），纯文本无动画。

### 5. 性能优化：Day 内容动态 import

- `src/content/days/index.ts` 改为 top-level await 动态加载
  days31-50 / days51-70 / days71-90 三个 chunk。
- 构建产物：Day31-90 内容拆分为 3 个独立异步 chunk（26/27/28 KB），
  入口 bundle 897 KB → **846 KB**；PWA precache 自动包含全部 chunk，离线可用。
- 同步 API 不变（DAYS/getDayContent 等消费方零改动）。

---

## 二、修改文件

新增：
- `src/ai/runtime.ts`（会话级密钥管理/连接测试/非敏感偏好）
- `src/ai/runtime.test.ts`（key 安全 9 测）
- `src/ai/tutor-service-4b.test.ts`（情景对话/错题分析 6 测）
- `src/ai/writing-review-flow.test.ts`(作文纠错→Error Bank 流程 3 测)
- `src/pages/AiTutorPage.tsx`、`src/pages/AiSettingsPage.tsx`
- `src/engines/gamification/gamification-v0.ts` + `.test.ts`（XP 计算 10 测）
- `src/content/dynamic-days.test.ts`（动态加载 2 测）

修改：
- `src/ai/tutor-service.ts`（新增 analyzeError / generateDialogue 及解析器）
- `src/data/db.ts`（SCHEMA_VERSION 5；gamification 表 + DATA_TABLE_NAMES）
- `src/study/session.ts`（markLessonDone/markBlockDone 挂 XP）
- `src/pages/StudyPage.tsx`（WritingCard AI 批改；review/drill 完成计入 XP）
- `src/pages/HomePage.tsx`（游戏化状态条 + AI 导师入口）
- `src/router.ts`、`src/App.tsx`（tutor / aisettings 路由 + 底栏导航）
- `src/content/days/index.ts`（动态 import 拆 chunk）
- `src/engines/index.ts` + `index.test.ts`（gamification → partial）

---

## 三、测试结果（全部通过）

```
npm run lint        ✅ 0 error
npm run typecheck   ✅ 通过
npm test            ✅ 26 个测试文件 / 163 个测试全通过（Phase 4-A 时为 133）
npm run build       ✅ 成功；Day31-90 拆分为独立 chunk；precache 21 entries
```

新增测试覆盖（指令要求的五项）：
| 要求 | 对应测试 |
|---|---|
| AI Tutor 调用 | tutor-service-4b.test（对话 5 轮校验/交替校验/失败降级）、runtime.test（真实 round-trip） |
| 作文纠错流程 | writing-review-flow.test（评分解析→Error Bank 写入条数/字段/上限5条/无效响应零写入） |
| API key 安全 | runtime.test（localStorage 全量扫描不含 key、失败不留痕、deactivate 即清、错误信息不回显 key） |
| XP 计算 | gamification-v0.test（等级曲线、连击转移、勋章阈值、同日去重、跨日+1 与断档重置、+10 延续奖励、300 XP 升级） |
| 动态加载 | dynamic-days.test（三 chunk 动态 import 解析、20×3 天数、同步注册表 90 天） |

---

## 四、真实功能

**可用：**
- 底栏「导师」进入 AI 页：课程解释 / 错题分析 / 情景对话三条链路均走真实 Provider 调用；
- 「AI 设置」选厂商→输入 key→连接→可发送真实测试请求验证连通性；
- 写作卡「AI 批改」：真实评分 + 逐句修改展示 + 自动入错误银行；
- XP/等级/连续天数/勋章随真实学习行为即时累计并持久化（schema v5）；
- Day31-90 内容以独立 chunk 分发。

**边界（诚实声明）：**
- AI 不可用时以上功能显示不可用原因，绝不伪造输出；
- 刷新页面需重新输入 Key（设计如此，会话内存）。

---

## 五、未完成内容 / 已知问题

1. 主 bundle 仍有 846 KB——大头是 2978 行词库组文件（静态导入）。本期指令范围为
   "Day 内容动态 import"（已完成）；词库拆分建议 Phase 5 处理。
2. AI 导师页暂无流式输出与历史会话持久化（每次生成为一次性结果）。
3. 情景对话仅展示文本（含 TTS 可后续复用 SpeakButton 模式接入）。
4. 勋章解锁目前无主动弹窗提醒，只在首页状态条体现（符合"不要复杂动画"）。
5. export/import 已含 gamification 表（通用遍历 DATA_TABLE_NAMES），但尚无针对它的专项备份用例。

---

## 六、下一阶段建议（Phase 5 方向）

1. 词库内容按主题组动态分包 + manualChunks，进一步压缩入口体积；
2. AI 会话历史与流式输出（SSE）；
3. 情景对话升级为交互式 role-play（用户扮演 A，AI 回 B，接 ai-conversation 引擎）;
4. 游戏化 v1：周目标、XP 曲线调优、报告页可视化（仍无动画）；
5. 备份/恢复补齐 gamification 专项测试与旧版备份迁移策略；
6. 里程碑测评（Day 30/60/90）UI 触发接入 assessment-v0.buildMilestoneExercises(day)。

---

**执行状态：Phase 4-B 完成。按要求停止，等待审核。**
