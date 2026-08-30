# English360 GPT

长期自适应英语学习系统 —— 面向**零基础中文母语成年学习者**，目标是 American English 的 **Native-like Functional Proficiency**（真实可用的近母语能力），而不是"完成课程"。

> ✅ 当前状态：**Phase 2（教学能力底座）已完成**。
> Phase 1 学习闭环（学→练→测→复习→报告）+ Phase 2 四大引擎：
> ① 知识模型（300+ 词、同义/反义/词族/搭配/易混关系图谱、语法点常见错误）
> ② 错误分析（错误分类→原因→关联知识→针对性练习建议；重复错误检测）
> ③ 自然拼读系统（40 条拼读规则、拆音引擎、8 组最小对立听辨训练）
> ④ 词汇模型 v0（面向 12000 词的结构，当前 300+ 核心词全字段数据）
> Planner 已接入错误分析：同类错误重复出现 → 自动插入专项训练。

---

## 产品原则（摘要）

1. 学习效果 > 功能数量 > UI 炫技
2. 真实能力 > 课程完成率；主动使用 > 被动浏览
3. 长期记忆 > 短期正确率；真实迁移 > 原题正确
4. 自适应 > 固定播放列表；本地优先，AI 只是增强层（离线必须可用）
5. 所有关键功能必须真实可运行——做不到的功能明确标记 `NOT IMPLEMENTED`

完整需求见仓库主指令文档；架构设计见 [`docs/architecture.md`](docs/architecture.md)。

## 技术栈

| 层 | 选型 | 理由 |
| --- | --- | --- |
| UI | React 19 + TypeScript 5 | 类型化、生态成熟、移动端友好 |
| 构建 | Vite 7 | 快速 HMR、PWA 插件成熟 |
| PWA | vite-plugin-pwa (Workbox generateSW) | 可安装、离线预缓存、自动更新 |
| 存储 | Dexie 4（IndexedDB） | 本地优先、事务、schema 版本迁移 |
| AI | Provider 抽象接口（OpenAI-compatible） | 不绑定任何厂商；密钥永不进前端代码 |
| 测试 | Vitest 4 + happy-dom + fake-indexeddb + Testing Library | 单测覆盖真实逻辑 |
| 质量 | ESLint 9 (flat) + typescript-eslint + Prettier | 统一风格 |

目标运行环境：**iPhone / iOS Safari / standalone PWA**，部署目标 GitHub Pages（纯静态）。

## 快速开始

```bash
npm install          # 安装依赖
npm run dev          # 本地开发 http://localhost:5173
npm run test         # 运行单元测试
npm run lint         # ESLint
npm run format       # Prettier 格式化
npm run typecheck    # tsc 项目引用全量类型检查
npm run build        # 产出 dist/（含 manifest.webmanifest + sw.js）
npm run preview      # 本地预览生产构建（验证 PWA）
```

## 目录结构

```
src/
├── core/            # 共享领域类型与契约（掌握阶梯、学习事件、设置…）
├── engines/         # 学习引擎接口 + 诚实状态注册表（29 个模块）
│   ├── curriculum/ student/ knowledge/ memory/ adaptive/
│   ├── planner/ assessment/ skills/ phonics/ tutor/ errors/
│   └── index.ts     # ENGINE_REGISTRY：每个模块的真实实现状态
├── data/            # ✅ 已实现：Dexie schema v1、导入/导出（schemaVersion 信封）
├── ai/              # AI Provider 接口 + 可用性状态机（Phase 0 无任何网络调用）
├── sync/            # Sync Adapter 接缝（当前为 DisabledSyncAdapter）
├── styles/          # mobile-first 全局样式（iOS safe-area 支持）
├── App.tsx          # 诚实状态面板：存储 / PWA / AI / 引擎进度
└── main.tsx         # 入口 + Service Worker 注册
public/              # 图标（scripts/generate-icons.ps1 生成）、favicon
docs/                # architecture.md、phase-0-report.md
scripts/             # 图标生成脚本（PowerShell + GDI+）
tests/               # Vitest 全局 setup（fake-indexeddb 仅用于测试）
```

## 安全约定

- **任何真实 API Key 永远不进 Git、不进 `public/`、不硬编码进前端源码。**
- `.env.example` 只是模板；`VITE_*` 变量会被打进客户端 bundle，属于公开信息。
- 公网部署的正确姿势是服务端代理（或用户自带密钥且明确知晓风险），详见 `docs/architecture.md` 的 "AI Provider Layer" 一节。
- Phase 0 代码不读取、不存储任何 AI 凭证。

## 数据与迁移

- IndexedDB 库名 `english360-gpt`，当前 `schemaVersion = 1`
- 导出文件带 `{ schemaVersion, appVersion, exportedAt, tables, data }` 信封
- 更新版本的备份会被明确拒绝并提示升级应用（不做静默猜测）

## 路线图（高层）

- **Phase 0 ✅** 架构 / 工具链 / 数据层 / 接口契约
- **Phase 1 ✅** Student Model v0 + Memory/SRS v0 + Day 1–7 课程 + 学习闭环
- **Phase 2 ✅** Knowledge Model v0 + Error Analysis v0 + Phonics System v0 + Vocabulary Model v0（300+ 词）+ Planner 错误驱动升级
- 后续阶段（每阶段 implement → test → build → audit → report → 停止等待审核）：
  听说读写深度引擎 → 自适应引擎完整版 → Day 8+ 课程扩展 → AI 增强层 → 里程碑测评与真实迁移验证

> 诚实声明：360 天是第一个大里程碑，不是毕业期限；系统以真实能力而非日历决定路径。
