# English360 V2 · Phase 10-A Report

日期：2026-08-24
状态：**PHASE 10-A COMPLETE — 词库达标 ≥5000**

---

## 一、本阶段唯一目标与结果

| 指标 | Phase 9 实测 | Phase 10-A 实测 | 目标 |
|---|---|---|---|
| 词库唯一词条 | 3266 | **5014** | ≥ 5000 ✅ |
| AUTHORED_DAYS | 150 | 150（未动） | 保持不变 ✅ |
| SCHEMA_VERSION | 7 | 7（未动） | 保持不变 ✅ |

净增词条：**+1748**（4954 组文件条目 + Day1–7 课程词，去重后合并为 5014）。

---

## 二、实现方式

1. 新建 `src/content/vocab/groups/` 下 **38 个新组文件**（gNN-主题.ts 格式，编号从 g100 起，避开现有 g01–g99）：
   - **chunk-g**（13 个组，科学/世界知识）：g100-science-lab、g101-astronomy-space、g103-geography-terrain、g104-environment-climate、g106-physics-energy、g107-chemistry-materials、g108-biology-genetics、g109-math-concepts、g110-medicine-treatment、g111-ocean-marine、g112-history-civilizations、g113-government-politics、g114-law-crime
   - **chunk-h**（25 个组，文化/社会/职场/语言技能）：g115-economics-trade、g116-media-journalism、g117-literature-books、g119-music-performance、g121-philosophy-religion、g123-psychology-mind、g124-academic-research、g126-business-strategy、g127-marketing-startup、g128-industry-logistics、g130-city-infrastructure、g131-food-cuisine、g132-sports-adventure、g134-fashion-beauty、g135-emotions-character、g136-language-discourse、g137-travel-abroad、g138-modern-life、g140-idioms-expressions、g141-tech-digital、g142-descriptive-precision、g144-verbs-nuance、g146-essentials-mixed、g148-hobbies-crafts、g150-social-situations
2. 新建 `src/content/vocab/chunks/chunk-g.ts` 与 `chunks/chunk-h.ts`，保持动态 import。
3. `src/content/vocab/index.ts` 的 `Promise.all` 追加 chunk-g/chunk-h，公共 API 不变。
4. 每个词条均含完整字段：word / zh / ipa / pos / band(1–7) / diff(0–1) / 例句英中 / collocation。
5. 未新增任何 UI 功能；未修改课程系统与数据库 schema。

## 三、质量保障

- 编写过程中反复运行 `scripts/check-vocab-quality.cjs`，全部新组 0 dup / 0 issues。
- 所有 id 匹配测试正则 `/^w:[a-z0-9'-]+$/`（修复了 2 处含句点的 id：a.m. → am）。
- IPA 全部以 "/" 包裹；band ∈ [1,7]；diff ∈ (0,1)；例句与搭配均非空。
- 未复用任何既有词 id（含 g89–g99 与 Day1–7 课程词）。

---

## 四、门禁结果（全绿）

```
node scripts/check-vocab-quality.cjs  ✅ Duplicate ids: 0 / Other issues: 0
npm run lint                          ✅ 通过
npm run typecheck                     ✅ 通过
npm test                              ✅ 33 文件 / 192 用例 全通过
npm run build                         ✅ 成功（PWA 生成正常）
node scripts/check-chunks.cjs         ✅ ALL CHUNK CHECKS PASSED（含 chunk-g/h）
lexicalCount()                        ✅ = 5014（≥ 5000）
```

Chunk 体积（动态加载，入口不受影响）：

```
chunk-a 54.2 KB   chunk-e 102.1 KB
chunk-b 38.7 KB   chunk-f  41.4 KB
chunk-c 59.4 KB   chunk-g 114.8 KB（新增）
chunk-d 121.1 KB  chunk-h 228.0 KB（新增）
ENTRY index-*.js 471.8 KB ≤ 500 KB 门禁 ✅
```

---

## 五、变更清单

新增：
- `src/content/vocab/groups/g100…g150`（38 个组文件）
- `src/content/vocab/chunks/chunk-g.ts`
- `src/content/vocab/chunks/chunk-h.ts`
- `docs/phase-10-report.md`

修改：
- `src/content/vocab/index.ts`（仅 Promise.all 追加两个 chunk 及展开行）
- `scripts/check-chunks.cjs`（期望列表追加 chunk-g-/chunk-h-）

未动：
- 课程系统（DAYS/AUTHORED_DAYS=150）、数据库 schema（v=7）、UI 组件、AI/引擎模块。

---

## 六、遗留事项（供下一阶段参考）

1. AUTHORED_DAYS 仍为 150：Day151–180 plan 文件待编写并接入（Phase 10-B 候选目标）。
2. 入口 bundle 471.8 KB，距 500 KB 门禁余量 ~28 KB，后续新增内容必须继续走动态 chunk。
3. RoleplayRecorder 回放按钮、Milestone 即时结果卡、Conversation 独立历史页仍未实现。
4. 后续扩词建议优先补齐主题内空缺编号（g96/g102/g105 等），保持命名连续性。

---

**PHASE 10-A GATE RESULT**

P0 VOCAB ≥ 5000: **PASS**（5014）
QUALITY 0 dup / 0 issues: **PASS**
REGRESSION lint/typecheck/test/build: **PASS**
CHUNK CHECKS（含 g/h 动态加载）: **PASS**
课程系统与 DB Schema 未被改动: **PASS**

**PHASE 10-A COMPLETE**
