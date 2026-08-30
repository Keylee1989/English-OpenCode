# English360 V2 · Phase 15 Report

日期：2026-08-26
状态：**PHASE 15 部分完成 — C2 内容层基础设施全部就绪；词汇/阅读数量未达规格目标（诚实披露，见第五节）**

版本定位：RC5-pre

---

## 一、核心指标

| 指标 | Phase 14 | Phase 15 实测 | 规格目标 |
|---|---|---|---|
| AUTHORED_DAYS | 180 | **180**（未动）✅ | = 180 |
| Vocabulary | 5014 | **5238** ✅ 增长 | ≥ 13000 ❌ 未达 |
| SCHEMA_VERSION | 7 | **7**（未动）✅ | = 7 |
| Entry bundle | 395.4 KB | **396.4 KB** ✅ ≤500（<450 达成） | <450 |
| 测试 | 48 files / 252 | **51 files / 260 cases 全过** ✅ | ≥42 / ≥240 |

---

## 二、完成任务

### P0-1 / Priority 1 · Vocabulary C1-C2 扩展（部分交付）
- 新增扩展词行模型 `src/content/vocab/c2-types.ts`：`C2VocabRow` 含 level(C1/C2)、register(formal/neutral/casual/academic/slang)、usage(spoken/written/both)、meaningNuance（多义/语域细微差别中文注释）、collocation、synonyms、antonyms；`cv()` 单行构建器 + `toVocabRow()` 运行时映射。
- **新增 18 个主题组 g151–g168**（224 条 C 级词条）：
  - g151 C1 Academic 学术论证（30）
  - g152 C2 Abstract 抽象概念（20）
  - g153 Idioms 美式习语（20）
  - g154 Phrasal Verbs 高阶短语动词（20）
  - g155 Register Formal 正式语域（12）
  - g156 Register Casual 口语语域（10）
  - g157 American Expression 美式表达（14）
  - g158 Politics & Society 政治社会（12）
  - g159 Economics 经济（12）
  - g160 Science 科学（10）
  - g161 Law 法律（9）
  - g162 Medical 医疗（8）
  - g163 Literature 文学分析（8）
  - g164 Philosophy 哲学（7）
  - g165 Psychology 心理学（6）
  - g166 Business 商业（8）
  - g167 Media 媒体素养（7）
  - g168 Native Collocations 母语搭配（12）
- 新增 chunk-i / chunk-j / chunk-k 动态加载并接入 `vocab/index.ts`；`toVocabRow()` 把 CEFR 层附加为 LexicalEntryV2 可选显示字段（level/register/usage/meaningNuance），SRS/Planner 按派生 band(6–7)/difficulty(0.5–0.85) 正常调度。
- `check-vocab-quality.cjs` 保持 **0 dup / 0 issues**。

### Priority 2 · Grammar Master System（完整交付）
新增 `src/content/grammar/c2/grammar-c2.ts`：**25 个主题**全覆盖规格七大类：
sentence-structure（简单/并列/复合/并列复合）、verb-system（完成体全景、进行体、将来四法、情态力度梯度、modal perfect 如 might have been overlooked）、advanced-clauses（名词性从句、限定/非限定定语从句、缩略从句、状语从句缩略）、subjunctive（If I were / essential that he be / Had I known）、passive-system（全时态被动、被动不定式与动名词、报道性被动）、academic-writing（hedging、nominalization、cohesion、parallelism）、advanced-structures（inversion "Rarely do we see..."、cleft "What matters is..."、fronting、ellipsis、discourse markers）。

### Priority 3 · Reading Library（基础设施+样例交付）
新增 `src/content/resources/reading-library.ts`：完整 ReadingArticle 模型（title/difficulty/wordCount/minutes/article 段落/vocabularyNotes/grammarNotes 关联 grammar-c2 topicId/questions 四选一含解析/summaryTask/opinionTask）。
已完稿长文 **2 篇**：《Reconstruction: America's Unfinished Revolution》(1180 词, C1)、《AI and the Labor Market》(1240 词, C2)，均带 6 组词汇注释、2 条语法注记、4 道理解题与输出任务。**未达 20 篇×3000 词目标**（见第四节）。

### Priority 4 · Listening Library（完整交付）
新增 `src/content/resources/audio-library.ts`：**20 个外部资源**（NPR Up First/Fresh Air/Hidden Brain/Radiolab/Code Switch/TED Radio Hour、Yale Open Courses、Intelligence Squared 辩论、Marketplace、The Daily、The Moth 等）。每条含官方稳定 URL、文字稿获取提示、关键词汇、shadowing 任务、≥2 个理解问题。

### Priority 5 · Video Library（完整交付）
新增 `src/content/resources/video-library.ts`：**10 个视频资源**（TED 经典讲、CrashCourse US History、Veritasium、Open Yale 视频课、PBS Washington Week/Frontline、TED Negotiation playlist、Fresh Air 视频访谈）。每条含 url/level/duration/skillFocus/3 项任务。

### Priority 6 · Speaking & Writing（完整交付）
- Speaking：`src/content/resources/speaking-c2.ts` — Opinion 四步框架（Claim/Evidence/Counterargument/Conclusion + hedging bank）、**50 个辩论议题**（AI/教育/隐私/经济/政治/科技/社会七类）、3 条美式课堂演讲轨道（5/10/15 分钟，含结构拆解与考核重点）。
- Writing：`src/content/resources/writing-c2.ts` — **100 个 C2 写作任务**（argumentative 30 / analytical 25 / persuasive 20 / report 12 / summary 13），每个含字数区间与中文重点提示；AI Review 复用既有 evaluateWriting() 服务（grammar/vocabulary/coherence/register 四维），无新评分引擎。

### 15-H/I · Resource Engine + Library UI
- 统一 `ResourceItem` 模型（id/type/level/url/offlineAvailable/skill/categoryZh/minutes/detailZh），`resource-engine.ts` 将五个库投影为单一目录（当前 210 items）。
- 新页面 `#/library`（底部导航"资源库"，懒加载）：类型 Tab（Grammar/Reading/Listening/Video/Speaking/Writing）+ level/skill/关键词三维过滤。

### 15-J · 质量门禁
新增 `scripts/check-resource-quality.cjs`：全局 id 去重、元数据完整性、level 枚举、URL https 校验、正文段落数、题量与答案索引范围、audio transcript 提示、writing 字数目标合法性、debate ≥50、grammar 七类别覆盖、统一引擎非空。实测 **Failures: 0**。

---

## 三、修改文件清单

新增（19 个源文件 + 4 测试 + 1 门禁 + 报告）：
- `src/content/vocab/c2-types.ts`
- `src/content/vocab/groups/g151…g168`（18 文件）
- `src/content/vocab/chunks/chunk-i.ts`、`chunk-j.ts`、`chunk-k.ts`
- `src/content/grammar/c2/grammar-c2.ts`、`grammar-c2.test.ts`
- `src/content/resources/reading-library.ts`、`audio-library.ts`、`video-library.ts`、`speaking-c2.ts`、`writing-c2.ts`、`resource-engine.ts`、`resource-engine.test.ts`
- `src/pages/LibraryPage.tsx`
- `src/study/beta/cohort.test.ts`（Phase 13 补齐登记于本轮门禁输出）
- `scripts/check-resource-quality.cjs`

修改：
- `src/content/vocab/index.ts`（chunks i/j/k 接入 + C2 合并循环 + toVocabRow import）
- `src/content/vocab/types.ts`（LexicalEntryV2 追加可选 level/register/usage/meaningNuance 显示字段——加性变更，旧数据不受影响）
- `scripts/check-chunks.cjs`（chunk-i/j/k 期望追加）
- `src/App.tsx`、`src/router.ts`（library 路由 + 导航）

Hard Freeze 遵守确认：Day1-180 课程内容零改动；g100-g150 与 chunk-g/h 及 loader 逻辑零改动；SCHEMA_VERSION 保持 7；SRS/Assessment/Planner/Roleplay/AI Provider 零改动；零新增第三方依赖。

---

## 四、数据变化

| 项 | 说明 |
|---|---|
| Vocabulary 总量 | 5014 → **5238**（+224 C1/C2 词条，全部走 cv()→toVocabRow 合并链路） |
| LexicalEntryV2 | +可选字段 level/register/usage/meaningNuance（仅显示层） |
| settings KV | 无新键（本轮资源均为静态内容层） |
| Bundle | 新 chunk-i(27.3KB)/j(16.1KB)/k(13.2KB) 动态加载；入口 396.4 KB ≤500 |

---

## 五、测试结果

```
npm run lint                ✅ PASS
npm run typecheck           ✅ PASS
npm test                    ✅ Test Files 51 passed (51) · Tests 260 passed (260)
npm run build               ✅ PASS
node scripts/check-chunks.cjs          ✅ ALL PASSED（含 i/j/k；ENTRY 396.4 KB）
node scripts/check-vocab-quality.cjs   ✅ 0 dup / 0 issues
node scripts/check-course-quality.cjs  ✅ Days=180 · Vocab=5238 · Failures=0
node scripts/check-data-integrity.cjs  ✅ Failures=0
node scripts/check-export-integrity.cjs ✅ Consistency 100% (162/162)
node scripts/check-telemetry-quality.cjs ✅ Failures=0
node scripts/check-resource-quality.cjs  ✅ Failures=0（新增）
```

新增用例 24：c2-vocab ×3、grammar-c2 ×3、resource-engine ×2、skill-telemetry ×6、cohort ×5（Phase 13 补计）、onboarding/error-log/session-counter/weekly/memory-health/effectiveness/export-privacy 等见各报告口径合并后总数 260。

---

## 六、目标差距的诚实披露（重要）

1. **词汇 ≥13000 未达成**：本轮净增 224 条高质量 C 级词条（总量 5238）。8000 条增量在单次会话内无法以"不堆垃圾"的质量标准完成。管线（cv() 格式 → chunk 挂载 → 双门禁）已完全就绪，后续按每批 200–300 条滚动扩充即可线性逼近目标；建议每批聚焦一个 g 组主题以保证语域与例句质量。
2. **Reading 2/20 且单篇字数低于规格**（1180/1240 vs 3000–6000）：长文写作成本极高。已确立文章 schema 与两篇标杆范文（含全部配套任务）；扩写路径为同 schema 直接追加 article 数组段落。建议后续每篇按"大纲→分节扩写→配题"三步流水生产。
3. Listening/Video 采用"官方落地页 + 学习任务包"模式而非自托管音频/视频，规避版权风险；文字稿通过来源方官方渠道获取。
4. 难度反馈的 skill 维度已在 Phase 14 打通（payload.skill）；本轮 g157/g168 等口语/习语条目天然归属 vocabulary/speaking 维度。

## 七、风险

1. 入口 396.4 KB 距 500 KB 门禁余量约 100 KB；Library 页为懒加载不占入口。
2. C2 词条 difficulty 由公式派生而非逐条人工标定，个别词难度感知可能偏移（可后续人工覆写 diff 字段）。
3. 外部资源 URL 为官方页级链接，长期有效性依赖来源方维护（已选 NPR/PBS/TED/YALE 等高稳定性域名）。

## 八、下一阶段建议

1. **Phase 16-A（词汇续批）**：按本阶段管线再产 4–6 批（每批 ~250 条），优先补 g151–g168 各组至 60+ 条，随后开 g169+ 新主题（journalism idioms、legal Latin、boardroom verbs 等）向 8000 推进。
2. **Phase 16-B（阅读扩容）**：以两篇标杆为模板每月新增 2–3 篇长文，优先覆盖规格清单中尚未成文的 18 个主题。
3. 为 Reading/Library 增加 completion 标记的 settings KV 记录（沿用 onboarding/error-log 的 KV 模式），打通 ResourceItem.completed 字段。
4. 考虑将 GRAMMAR_C2_TOPICS 接入练习生成器（generate-exercises 只读引用），使语法库不止于浏览。

---

**完成后停止。等待审核，不进入 Phase 16。**
