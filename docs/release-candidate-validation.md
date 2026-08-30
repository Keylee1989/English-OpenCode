# English360 V2 · Final Validation / Release Candidate 验证报告

日期：2026-08-30
阶段：**Final Validation / Release Candidate**（不进入 Phase 24；不修改核心功能；不做破坏性重构）
状态：**停止，等待人工真机 QA 与最终审核。**

---

## 〇、本阶段边界（遵循审核指令）

1. 保持 Hard Freeze：Day1–360、13,033 vocabulary IDs、SCHEMA_VERSION=7、SRS/Assessment/Planner/Roleplay/AI Provider、Export、local-first 全部未破坏。
2. 不为了 bundle / 测试数量 / 任何单一指标做破坏性重构。
3. 自动完成所有不需用户/真机介入的静态检查、构建、测试、数据完整性、发布包检查（本轮全部完成）。
4. P0-10 iOS/Safari/PWA 真机 QA 保持 **ENV-BLOCKED**，不伪造 PASS。
5. 对已知 NOTE/PARTIAL 建立最终 **Release Risk Register**，**不擅自把 PARTIAL 改 DONE**。
6. 检查最终生产包可直接部署，并给出四类结论。

本阶段**仅新增一个只读校验脚本** `scripts/check-release-package.cjs`（发布包可部署性核查）；**未改动任何核心功能代码**。

---

## 一、Hard Freeze 不变式（实测确认）

| 不变式 | 值 | 来源 / 实证 |
|---|---|---|
| AUTHORED_DAYS | **360** | `check-course-quality.cjs`：DAYS loaded 360/360；`index.test.ts`/`phase23-360-gate.test.ts` 断言 360 ✅ |
| COURSE_TARGET_DAYS | **360** | `src/content/index.ts:16` ✅ |
| Vocabulary 模型总量 | **13,033** | `check-course-quality`/`360-day-content`/`resource-quality`：Vocabulary model 13033，0 失败 ✅ |
| SCHEMA_VERSION | **7** | `src/data/db.ts:21` ✅ |
| 语法主题 | 12 base（无 present-perfect） | 门禁 C1 ✅ |
| 拼读规则/配对 | 41 / 8 | 门禁 D ✅ |
| DAYS 连续 1–360、无重复 | 360/360 | `check-learning-progression`：unique 360, contiguous true ✅ |

**Hard Freeze 结论：全部未破坏。**

---

## 二、自动验证全量结果（REAL_APP_*）

| # | 检查项 | 结果 |
|---|---|---|
| 1 | 全量单元测试（`npx vitest run`） | ✅ **68 files / 402 tests 全过**（258s，本 host 直接运行） |
| 2 | App TS strict（`tsc -b --noEmit`） | ✅ CLEAN（0 errors） |
| 3 | lint（`eslint .`） | ✅ CLEAN |
| 4 | 生产构建（`tsc -b && vite build`） | ✅ 590 modules · ~13s · PWA precache **64 entries (5647.92 KiB)** |
| 5 | 发布包可部署性（`check-release-package.cjs`） | ✅ **DEPLOYABLE**（60 files, 5.53 MB；index/manifest/sw/icons 全在；无缺失/零字节资源） |
| 6 | 最终产品质量门禁 A–N（`check-final-product-quality.cjs`） | ✅ **14/14 组 · 32/32 断言 全绿**（0 failures） |
| 7 | 课程质量（`check-course-quality.cjs`） | ✅ 360 天 · 0 fail |
| 8 | 360 天内容质量（`check-360-day-content-quality.cjs`） | ✅ 0 fail（SRS spiral 133/180，透明披露——见风险清单） |
| 9 | 导出完整性（`check-export-integrity.cjs`） | ✅ 162/162 rows · audio blob preserved |
| 10 | 数据完整性 + 备份迁移（`check-data-integrity.cjs`） | ✅ 0 fail（schema 1–7 拒绝逻辑正确） |
| 11 | Bundle 预算（`check-bundle-budget.cjs`） | ✅ exitCode=0（entry ~3.07 MB —— 已知 NOTE，见风险清单） |
| 12 | 遥测质量（`check-telemetry-quality.cjs`） | ✅ 0 fail（6/6 call sites；空/无效 0%） |
| 13 | 资源质量（`check-resource-quality.cjs`） | ✅ 0 fail（unified 1281 · vocab 13033） |
| 14 | C2/C1 深度审计（`check-c2-depth-quality.cjs`） | ✅ exitCode=0（syn/ant/family 深度 PARTIAL —— 见风险清单；dangling=0） |
| 15 | 学习进阶审计（`check-learning-progression.cjs`） | ✅ exitCode=0（CEFR-tag 仅 C1/C2 —— 见风险清单） |
| 16 | Release quality gate（`check-release-quality.cjs` 第 13 项，脚本内 spawn vitest） | ⚠️ 本 host spawn 子进程悬挂 → **ENV-BLOCKED**；所代表全量套件已由本 host 直接实证（第 1 行） |

---

## 三、Final Release Risk Register（不擅自改 PARTIAL→DONE）

> 以下所有已知 NOTE / PARTIAL 均保留原判定，**未升级为 DONE**。除第 A 项（真机 QA）为 ENV-BLOCKED 外，其余均为 KNOWN NON-BLOCKING RISK / 内容深度缺口，**均不阻塞静态可部署性**。

| ID | 类别 | 项 | 判定 | 详细 | 是否阻塞发布 |
|---|---|---|---|---|---|
| R1 | KNOWN NON-BLOCKING RISK | entry bundle ~3.07 MB | **PRE-EXISTING NOTE**（非失败） | 根因=`vocab/index.ts` 静态导入 202 个 group + top-level await；P0-8 判定为「为离线正确性放弃 ≤500KB 数字」，未做破坏性 code-split。PWA 缓存上限 4MB，entry 3.07MB **会被 precache**（64 条目已确认），离线可用性不受影响 | 否 |
| R2 | KNOWN NON-BLOCKING RISK | 基础词库 CEFR level 标签缺失 | **PARTIAL（沿用）** | `learning-progression`：level tag 仅 C1(229)/C2(7790)；基础词库 8019/13033 用 difficulty+frequencyBand 而非 CEFR level（tags 2/6 bands） | 否 |
| R3 | KNOWN NON-BLOCKING RISK | C1/C2 同/反义词深度 | **PARTIAL（沿用）** | `c2-depth`：sample 200 下 C2 synonym=4%/antonym=14%/family=0%，C1 类似；P0-7 已把可解析子集接入 ID 图（1417 词条，dangling=0），不可解析展示字符串仍保留 | 否 |
| R4 | KNOWN NON-BLOCKING RISK | SRS spiral 覆盖率 133/180 | **NOTE（透明披露）** | Phase-2（181–360）中 47 天在当日前 30 天窗口内无同词复用（逐日列表已列于 `check-360-day-content-quality` 输出）。内容组织事实，非功能缺陷 | 否 |
| R5 | KNOWN NON-BLOCKING RISK | 写作二次评估反馈环单测缺失 | **PARTIAL（沿用）** | `WritingCard` 的 aiHistory/再评估/增量显示为 UI 展示层，无组件级单测；以 tsc+审查验证。真机交互在人工 QA 清单内 | 否 |
| R6 | KNOWN NON-BLOCKING RISK | roleplay-engine 静态+动态双导入 | **PRE-EXISTING NOTE** | `AiTutorPage.tsx` 既静态又动态导入 roleplay-engine，动态导入未生效（构建警告）；未改冻结核心 | 否 |
| R7 | KNOWN NON-BLOCKING RISK | 部署路径要求 | **NOTE（部署要求）** | manifest `start_url:"/"`/`scope:"/"` 且资源为绝对路径 —— **必须在域名根部署**（不可子路径部署）。发布时需在正确宿主根目录布置 `dist/` 全部内容 | 否（条件性部署要求） |
| R8 | **ENV-BLOCKED** | P0-10 iOS/Safari/PWA 真机 QA | **ENV-BLOCKED（沿袭）** | 本 host 无 iOS/Safari 真机安装、离线、触控、录音/音频硬件；不伪造 PASS。结构性 PWA（manifest + sw.js + 64 条目 precache）已生成并在发布包检查中核实 | 是（人力手动环节，需人工真机 QA 项执行） |
| R9 | KNOWN NON-BLOCKING RISK | 无 CI/CD / 部署平台配置 | **NOTE，非阻断** | 仓库无 .github workflow / netlify.toml / vercel.json / Dockerfile。产物为纯静态 Vite PWA（`dist/`），可直接上传任何静态托管（GitHub Pages / Netlify / Vercel / Nginx 等，置于域名根）。无 CI 不影响产物可部署性 | 否 |

---

## 四、最终四类结论

### ✅ 1. RELEASE READY（静态、自动化可验证的部分）
- **生产包可直接部署**：`dist/` 60 files / 5.53 MB，`index.html`、`manifest.webmanifest`、`sw.js`、4 个图标、全部被引用资源**均存在且有效**；`check-release-package.cjs` 判定 **DEPLOYABLE**。
- 全部自动化静态检查、构建、测试、数据完整性、发布包检查通过。
- **前提（R7）**：部署到**域名根**（不可子路径）。

### ⛔ 2. RELEASE BLOCKED
- **无**。自动化可验证范围内未发现任何阻塞性缺陷。

### ⚠️ 3. ENV-BLOCKED（不可在本 host 验证，诚实标注）
- **R8 / P0-10**：iOS/Safari/PWA 真机 QA（安装、离线启动、触控、录音/音频播放、语音识别）。本 host 无真机能力，**不伪造 PASS**。此项**必须由人工真机 QA 完成**后方可视为完全发布就绪。
- `check-release-quality.cjs` 脚本内 spawn vitest 子进程在本 host 悬挂（环境行为）；其代表的全量套件已由本 host 直接 `npx vitest run` 实证 68/402。

### 📋 4. KNOWN NON-BLOCKING RISK（发布后风险清单，均已记录跟踪）
- R1 entry bundle 3.07MB（离线正确性优先，non-blocking）
- R2 基础词库无 CEFR level 标签（浅层标记缺口）
- R3 C1/C2 同/反义词深度偏低（内容深度缺口，ID 图已接、无悬挂）
- R4 SRS spiral 133/180（内容组织事实）
- R5 写作二次评估无组件级单测（UI 展示层）
- R6 roleplay-engine 双导入（既有）
- R7 需域名根部署（条件性部署要求）
- R9 无 CI/CD 配置（产物为静态可部署，non-blocking）。

**以上 R2–R6 判定沿用既有的 PARTIAL/NOTE，未擅自改为 DONE。**

---

## 五、最终结论（供人工审核）

```
自动化可验证范围：               全绿（RELEASE READY）
自动化为可验证内阻塞项：          无
人工/真机前置（ENV-BLOCKED）：     R8/P0-10 iOS/Safari/PWA 真机 QA
已知非阻塞风险：                   R1–R7, R9（均已登记）
============================================================
判定：待完成人工真机 QA 后 ⇨ RELEASE READY；静态包现即可部署（置于域名根）。
```

**下一步（人工 / 不自动执行）：**
1. 持 iOS / Safari 真机执行 R8 清单（安装/离线/触控/录音/语音识别）。
2. 确认部署平台与 URL（域名根）后上传 `dist/`。
3. 视需要补齐 R5 组件级测试 / R2/R3 内容深度（非阻塞）。

---

**完成。停止，等待人工真机 QA 与最终审核，不进入下一阶段，不新增功能，不扩大范围。**