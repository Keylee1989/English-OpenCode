# Phase 2 Report

日期: 2026-08-22 · 分支: `main`（未 commit，等待指示）· 范围: 仅 Phase 2，已停止。

## 1. 完成内容

1. **Knowledge Model v0**（知识关联模型，非单纯数据库）
   - 节点：300+ 词条 + 7 个语法点（每天句型一个节点，含中国学习者常见错误 wrong/right/zh 三元组）。
   - 关系边五类：synonym / antonym / word-family / collocation / confusion-pair。
     搭配边由短语**自动推导**；易混边来自拼读最小对立对；同义/反义/词族为人工编写且测试强制零悬空端点。
   - **可被调用**：Planner 通过 `getRelatedUnmastered()`（感知记忆状态）扩展训练；
     Error Analysis 通过 `getConfusionSet()` 做听错归因；全部查询同步可用。
   - Dexie v3 镜像表 `knowledgeItems/knowledgeEdges`（幂等同步），导出/未来同步全覆盖。

2. **Error Analysis Engine v0**
   - 六类错误分类：recognition-mismatch / recall-failure / spelling / word-order /
     listening-mishear / phonics-confusion。
   - 分类是**知识驱动**的：最小对立词上的听力错误自动归因为“音位混淆”并挂上易混伙伴词；
     打字接近正确（编辑距离≤2）判为拼写问题而非完全想不起。
   - 每条错误落库即带：errorType、possibleCauseZh、relatedKnowledge、recommendedPracticeZh、answerText。
   - 统计：高频错误榜、**重复错误检测**（同类+同知识点≥2 次）、薄弱技能（近期正确率<60% 且样本≥5）。
   - 补救管线：重复错误 → RemedialSpec → 针对性练习生成器（词条 drill / 听辨 drill / 句型 drill）。

3. **Phonics System v0**（融入词汇学习，不是独立课程）
   - 约 40 条 GPC 规则（辅音组合、短/长元音、r 控元音、辅音簇），每条配中文口型提示与示例词。
   - 不规则高频词走 word-level OVERRIDES（one/two/walk/good/food/come/live...），无法解释的字母诚实标记 uncovered——绝不假装规则。
   - `decode()/explainWordZh()` 在学词卡上实时显示“拼读拆解”（如 she = sh /ʃ/ + e）。
   - 8 组最小对立听辨训练（eat-it、live-leave、work-walk、three-tree、bad-bed、cat-cut、full-food、sit-seat），确定性生成、TTS 真实发音。

4. **Vocabulary Model v0**
   - 面向 12000 词的结构：紧凑行编写 → 构建器展开为全字段 LexicalEntry
    （中文释义、美式 IPA、词性、频段 1-7、难度、双语例句、搭配短语、词族/同义/反义 id、易混伙伴）。
   - 当前 **300+ 核心词**全部带搭配；关系按语言学真实性填写（不伪造派生）。
   - TTS：所有词条经 speakEn() 即时发音（真实语音合成）；memory state 由 SRS 引擎按首次接触创建。

5. **Adaptive Planner 升级**
   - 新增 plan block：`drill`。当错误分析检出重复错误 → 插入“专项训练”块，
     位置在 SRS 复习之后、新课之前；首页 notice 明确说明原因。
   - StudyPage 新增 DrillFlow 流程与 phonics-discriminate 题型 UI；
     练习提交现在携带 answerText（供拼写分析）与 grammarNodeId（关联句型）。
   - 词卡新增“拼读”拆解行。

## 2. 修改文件

新增：
```
src/content/vocab/types.ts builder.ts index.ts index.test.ts
src/content/vocab/groups/pronouns-function.ts verbs-core.ts numbers-time.ts people-jobs.ts
src/content/vocab/groups/food-drink.ts home-objects.ts adjectives.ts places-travel.ts body-health.ts nature-weather.ts
src/content/days/index.ts
src/phonics/types.ts rules.ts decode.ts drills.ts phonics-v0.test.ts
src/knowledge/knowledge-model-v0.ts (+.test.ts)
src/engines/errors/error-analysis-v0.ts (+.test.ts)
```

修改：
```
src/data/db.ts                    (schema v3 + knowledge 两表 + 错误行扩展字段 + SCHEMA_VERSION=3)
src/data/recorder.ts              (错误写入改走 storeEnrichedError，透传 answerText/grammarNodeId)
src/study/exercise-types.ts       (+phonics-discriminate 题型)
src/study/generate-exercises.ts   (RNG 抽离 core/rng；+buildItemDrillExercises/buildGrammarDrill；新题型 interaction 映射)
src/study/grade.ts                (听辨题判分)
src/core/rng.ts                   (共享确定性随机)
src/engines/planner/planner-v0.ts (+drill block 规则)
src/pages/StudyPage.tsx           (DrillFlow/听辨 UI/answerText 采集/词卡拼读拆解)
src/styles/global.css             (.decode-line)
src/engines/index.ts (+.test.ts)  (4 个引擎状态→partial 的真实化)
src/content/index.test.ts         (适配 V2 返回类型)
README.md docs/architecture.md    (Phase 2 状态与实现说明)
```

## 3. 新增数据结构

- **Schema v3**（SCHEMA_VERSION=3，v1/v2 定义保留，无破坏迁移）：
  - `knowledgeItems(id PK, kind)`：{id:"w:*|g:*", kind:"word"|"grammar", data:完整负载}
  - `knowledgeEdges(edgeKey PK, fromItemId, toItemId, relation)`：
    edgeKey=`from|relation|to` 确定性键；relation ∈ 五类关系
- `ErrorRecordRow` 扩展可选字段：errorType / possibleCauseZh / relatedKnowledge[] /
  recommendedPracticeZh / answerText（索引不变，旧数据兼容）
- 内存契约（不落库）：LexicalEntryV2 全字段结构；RemedialSpec 三态（items/phonics/grammar）；
  GrammarPointNode（含 commonErrors）

## 4. 测试结果

```
npm run lint        → exit 0
npm run typecheck   → exit 0
npm test            → Test Files 16 passed (16) · Tests 98 passed (98)   [Phase 1 时为 63]
npm run build       → 成功；dist 含 manifest + sw.js（precache 17 项 ≈430KiB）
```

指令要求的四项验证对应：
| 要求 | 测试 | 结果 |
| --- | --- | --- |
| 知识关联保存 | knowledge-model-v0.test.ts：五类边计数>0、eat↔it 易混互链、drink-water 搭配推导、worker←work 词族、syncKnowledgeToDb 幂等持久化 | PASS |
| 错误分析生成 | error-analysis-v0.test.ts：六类分类矩阵、enrichment 落库断言（errorType/cause/related/practice） | PASS |
| 重复错误检测 | 同类+同项×2 判重、不同项不误合并 | PASS |
| Planner 按错误调整 | planner-v0.test.ts：重复错误→drill 块插入（位于复习后）、干净记录无 drill 块 | PASS |

另含词库完整性（≥300 词、字段齐全、零悬空关系、最小对端点存在）与拼读引擎（最长匹配、override、诚实 uncovered、听辨确定性+判分）等共 35 条新测试。

## 5. 真实可用功能（增量）

- 学词卡实时显示每个词的拼读拆解与规则提示
- 听力错误会被精确归因：是“没听出句子”还是“eat/it 这类音位混淆”，并给出对应练习建议
- 出现重复错误后，次日/当日计划自动出现“专项训练”块（针对出错词、出错句型或易混对）
- 300+ 词的可检索词汇模型已接入练习干扰项池（选择题干扰更丰富）
- 导出备份现包含完整知识图谱镜像

## 6. 未完成内容

- Knowledge Model 的图算法层（最短路径/社区发现等）与更大规模内容（8000+ 词、Day 8+ 课程把新词组正式编入每日课程）
- Error Analysis 的纵向趋势（周/月错误率曲线）与自动“错误→新卡”闭环
- Phonics 更多规则（软 c/g、双写、重音规律）与发音口型视频素材
- 独立 AdaptiveLearningEngine 接口实现（当前自适应规则仍内嵌于 planner-v0）
- Assessment/Grammar/Reading/Writing/AI 层/Sync 后端/游戏化 —— 维持 not-implemented
- iOS 真机验收（沿自 Phase 1 遗留建议）

## 7. 已知问题

- 词族/同反义覆盖为语言学真实子集（约几十词），其余词条该字段为空数组——刻意不造假派生；后续随扩容补齐
- decode 引擎对多音字词（如 live 动/形）依赖 override 表，未覆盖的多读音会给出单一读音
- 搭配边推导基于相邻词对，长搭配可能产生弱相关边（对当前用途无碍）
- PowerShell here-string 曾吞模板字符串反引号导致一次编译错误（已修复并以 Edit 工具重写）；提示后续避免用 PS 写含模板字符串的代码段
- eslint 上游版本提示（噪音，同前）

## 8. Phase 3 建议

推荐主线：**课程规模化 + Grammar Engine 最小版**
- Day 8–21 内容管线（直接消费 Vocabulary Model 的主题组：食物/家庭/数字…每课自动产出练习与测评）
- Grammar Engine v0：把 GRAMMAR_COMMON_ERRORS 从静态数据升级为可训练引擎（错误句改正、选择填空、翻译式造句）
- Error Analysis 增加“错误→SRS 自动建卡”闭环
- 顺带完成 iOS 真机验收清单（遗留 P2a 建议）

备选：先行 AI Provider 实现（BYOK 本地模式 + OpenAI 兼容客户端），为 AI Tutor 铺路——但建议排在课程规模之后。

---
已停止。未进入 Phase 3，等待人工审核与下一步指令。
