# English360 V2 · Phase 4-A Report

日期：2026-08-23
状态：**已完成，停止等待审核**（未进入 Phase 4-B）

---

## 一、完成内容

### 1. Day 31-90 真实课程（+60 天）

- 新增 60 天真实课程内容（`days31-50.ts` / `days51-70.ts` / `days71-90.ts`），全部沿用 Phase 3 的 `buildDay()` 工厂模式，**无任何 placeholder 天**。
- 每一天都包含九大板块钩子（与现有引擎架构一致）：
  - Lesson（标题/目标/句型课）
  - Vocabulary（5-6 个词表引用，全部可解析）
  - Grammar（grammarTopicId 引用 Grammar Engine 的 12 个主题之一）
  - Listening/Speaking（pattern.practiceSentences 驱动听力排序/跟读练习）
  - Reading（3 句分级短文）
  - Writing（中文提示 + 英文句型脚手架）
  - Review/Assessment（由 Planner 与 Assessment Engine 从上述钩子自动生成每日小测/复习块）
- 主题覆盖严格按指令执行：
  - **Day 31-35 购物**：超市、买衣服、网购、退换售后、省钱
  - **Day 36-40 旅行**：计划旅行、机场、酒店、城市交通问路、旅行见闻
  - **Day 41-45 工作**：求职、入职第一天、会议邮件、电话信息、职业成长
  - **Day 46-50 社交**：结识朋友、邀请做客、恋爱关系、道歉和好、庆祝时刻
  - **Day 51-55 健康**：看病就医、健康习惯、心理健康、紧急情况、医院康复
  - **Day 56-60 兴趣**：音乐影视、体育运动、游戏收藏、户外自然 + **第 60 天阶段大复习**
  - **Day 61-66 观点表达**：喜好、同意不同意、比较选择、原因结果、建议说服、观点复习
  - **Day 67-72 描述经历**：上周末、难忘旅行、童年回忆、讲好故事、成就教训、时代变化
  - **Day 73-78 新闻基础**：新闻标题、天气预报、社区新闻、数据数字、采访引述、真假消息
  - **Day 79-84 职场交流**：线上会议、工作谈判、失误补救、简短汇报、职场闲聊、饮食健康讨论
  - **Day 85-89 日常讨论**：城乡对比、科技生活、环保行动、教育选择、金钱消费观
  - **Day 90 里程碑：九十天总复习**（含"过去不会→现在会→下一步"成长句型）

### 2. Vocabulary 扩展至 3000 核心词

- **最终词库：3015 个唯一词条**（测试断言 ≥3000），保持既有 `LexicalEntryV2` 模型不变。
- 新增 43 个词汇组文件（g46–g88），每词包含：word、meaningZh(zh)、IPA(ipa)、pos、frequencyBand(1-7)、difficulty(0-1)、example(en+zh)、collocation；部分词含 wordFamily(fam) 关系。
- confusion（易混淆词）继续由 Phonics System 的 MINIMAL_PAIRS 自动双向注入。
- 补齐了大量 A1-B2 关键缺口词（原词库缺失的高频词）：bring、build、enjoy、end、develop、fail、fight、mean、solve、collect、communicate、challenge、life 相关（sea/ocean/mountain/forest）、die/death/dead、follow、enter、carry、lead、lie、hide、join、kill、expect、fill、miss、guess 等，以及 phrasal verbs 44 条（give-up、find-out、figure-out 等）和话语连接语（however、therefore、although、on-the-other-hand 等）。

### 3. AI Provider 接口基础（不绑定厂商）

- 实现 OpenAI 兼容 Provider：`src/ai/openai-compatible.ts`
  - `IAiProvider.complete()` 完整实现：Bearer 认证、`/chat/completions` 请求、temperature/max_tokens、AbortSignal 取消、finish_reason 映射、HTTP 错误→`AiProviderError`（带 status，不回显密钥）、网络错误包装、malformed JSON 诚实报错。
- 四个厂商预置（仅端点 URL + 默认模型，不含任何密钥）：`src/ai/providers.ts`
  - OpenAI / DeepSeek / 通义千问(DashScope 兼容模式) / 豆包(火山方舟)
  - `createProvider({providerId, modelId?, apiKey})` 工厂，运行时注入 key，**密钥不落盘、不入 Dexie、不写入代码**。
- 高层服务层：`src/ai/tutor-service.ts`
  - `chat()` 多轮对话
  - `generateExplanation()` 中文脚手架讲解（支持 chinese-dominant/balanced/english-first 三档）
  - `generateExercise()` 练习生成（STRICT JSON 约定 + 解析校验 + 失败诚实返回 `{ok:false, reasonZh}`）
  - `evaluateWriting()` 作文评分（score/corrections[]/feedbackZh，JSON 校验）
- 所有函数显式接收 `IAiProvider` 参数——无全局单例、核心学习系统零 AI 依赖（离线优先不变）。

### 4. AI Tutor Context Layer（Student Context Builder）

- `src/engines/tutor/context-builder.ts`：
  - 输入聚合：Student Model（各技能 ability 分数/趋势/证据数 + 疲劳指标）、Error Bank（总数/重复类别/弱技能）、Knowledge Model（词库规模 + memoryStates 掌握阶段分布）、当前课程（天号/标题/目标/句型/词表）、近 7 天学习历史。
  - 输出类型化快照 `TutorStudentContext`。
- `src/engines/tutor/context-format.ts`：
  - `formatContextForAi()` → 紧凑文本块（<2000 字符守卫，prompt 友好）
  - `buildTutorSystemPrompt()` → 按 scaffoldLevel 自适应的完整 system prompt
- **按要求未实现聊天 UI**；本层为纯引擎层，供 Phase 4-B 接入。

---

## 二、修改文件

新增（源码）：
- `src/content/days/days31-50.ts`、`days51-70.ts`、`days71-90.ts`（60 天课程）
- `src/content/vocab/groups/g46…g85`（40 个主题组文件）
- `src/content/vocab/groups/g86-topup-adjectives.ts`、`g87-topup2.ts`、`g88-topup3.ts`（补漏组）
- `src/content/days-phase4a.test.ts`（Phase 4-A 课程完整性测试）
- `src/ai/openai-compatible.ts`、`src/ai/providers.ts`、`src/ai/tutor-service.ts`
- `src/ai/openai-compatible.test.ts`、`src/ai/tutor-service.test.ts`
- `src/engines/tutor/context-builder.ts`、`context-format.ts`、`context-builder.test.ts`

修改：
- `src/content/days/index.ts`（合并三个新天数组，DAYS=90）
- `src/content/vocab/index.ts`（注册 43 个新组）
- `src/content/index.test.ts`（30→90 断言更新）
- `src/content/vocab.test.ts`（1500→3000 阈值更新）
- `src/study/integration-day1.test.ts`（DAY_CONTENT 长度 30→90）
- `src/knowledge/knowledge-model-v0.test.ts`（words≥3000、grammar nodes=90）
- `src/engines/index.ts`（registry：ai-provider、ai-tutor → "partial"，附注释说明理由）
- `src/engines/index.test.ts`（同步 registry 诚实性断言）

清理：一次性脚手架脚本已删除，`scripts/` 目录恢复原有内容。

---

## 三、数据变化

| 指标 | Phase 3b | Phase 4-A |
|---|---|---|
| AUTHORED_DAYS | 30 | **90** |
| 词库唯一词条 | 1500 | **3015** |
| 词汇组文件 | 55 | **98**（55+43） |
| Knowledge Model 语法节点 | 30 | **90**（每天一个 pattern 节点） |
| AI 层可用实现 | 仅接口缝 | OpenAI 兼容 Provider + 4 厂商预设 + 服务层 + Context Builder |
| Registry ai-provider / ai-tutor | not-implemented | partial |

---

## 四、测试结果（全部通过）

```
npm run lint        ✅ 0 error / 0 warning
npm run typecheck   ✅ 通过（tsc -b --noEmit）
npm test            ✅ 21 个测试文件 / 133 个测试全通过
npm run build       ✅ 构建成功（PWA precache 17 entries, 905 KiB < 4 MiB 上限；
                       bundle 897 KB 触发 chunk-size 提示，非阻断，见"未完成内容"）
```

新增专项测试覆盖（指令要求的四项）：
1. **Day31-90 加载**：顺序连续性、九大板块钩子齐全、grammarTopicId/phonicsRuleIds/pairId 全部可解析、vocabIds 全部可解析、主题关键词全覆盖、91 天越界拒绝。
2. **Vocabulary 数量**：≥3000 唯一词条、id/IPA/band/difficulty/collocation 字段级校验、零悬空关系。
3. **AI Provider 接口**：请求形态（URL/auth/model/messages）、响应解析、错误映射、取消、无 key 拒绝、4 厂商预设、工厂构建。
4. **Context Builder 输出**：能力排序与最弱项、错误统计、知识阶段分布、当前课程、近 7 天历史、紧凑格式化、三档脚手架 prompt。

---

## 五、真实功能（能跑的 vs 只是接口的）

**真实可用（有实现 + 有测试）：**
- Day 1-90 全部课程的加载、练习生成（识别→回忆→输出）、每日小测、SRS 复习调度——Planner 自动延伸到第 90 天，不再出现"内容已完成"提示。
- 3015 词词库查询、搭配/同义反义/词族关系、最小对立对听辨。
- OpenAI 兼容调用链：给定运行时 key 即可真实请求四家厂商端点完成 chat/讲解/出题/作文评分（JSON 校验失败时诚实降级，不出假分）。
- Student Context Builder：从本地数据库聚合学习者真实状态并产出 AI 可读上下文。

**只是接口/尚未接通：**
- 应用内没有任何地方让用户输入 key 或发起 AI 请求（刻意留待 4-B）；默认状态仍为 `unconfigured`，核心功能完全离线可用。

---

## 六、未完成内容 / 已知问题

1. **AI 设置 UI 未做**（本阶段指令明确不做聊天 UI）：key 输入、厂商选择、代理模式切换属于 4-B。
2. `buildMilestoneExercises()` 默认参数仍是 `min(30, …)`；接受 day 参数因此可直接用于 60/90 里程碑，但里程碑触发时机与 UI 尚未接入。
3. 打包体积警告：主 bundle 897 KB（>500 KB 提示）。内容随天数增长，建议 4-B 做 days 内容动态 import 分包。
4. 部分 Phase 2 早期词条存在 collocation 文本粘连的历史质量问题（如 "ring bellsbells"），本次未批量清洗（超出最小改动范围）。
5. Grammar Engine 仍为 12 个主题；61-90 天的观点/经历表达复用现有主题（如 basic-clauses），未新增 present-perfect 等进阶主题。

## 七、Phase 4-B 建议

1. **AI 设置页 + BYOK 流程**：厂商选择（读 PROVIDER_PRESETS）、key 会话内存保存（可选 localStorage 明示开关）、availability 状态接入 HomePage/StatusPage。
2. **AI Tutor 聊天 UI**：基于 `buildTutorSystemPrompt()` + `generateExplanation()` 接入 StudyPage 的"问导师"入口；离线自动降级。
3. **AI 出题落库**：将 `generateExercise()` 草稿经现有 Exercise 类型适配后进入 practice 流（保留确定性生成器为主、AI 为增强）。
4. **作文评分接入 Writing Card**：`evaluateWriting()` 结果展示 corrections 列表并写入 Error Bank。
5. **里程碑体系**：milestone 触发于 Day 30/60/90，替换默认参数并加历史对比。
6. **代码分割**：days 内容 dynamic import，消除 chunk 警告。
7. （可选）历史数据清洗脚本：修复 g01-g45 中粘连的 collocation 文本。

---

**执行状态：Phase 4-A 完成。按要求停止，等待审核。**
