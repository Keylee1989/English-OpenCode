# Phase 3 Report

日期: 2026-08-22 · 分支: `main`（未 commit）· 状态: **核心目标达成，两项增强项顺延至下阶段**

## 1. 完成内容
1. **课程系统 Day1–30**：新增 Day8–30 共 23 天真实课程（工厂化编写，含主题、目标、词组、句型讲解、阅读短文、写作任务、拼读焦点）。AUTHORED_DAYS 自动=30，架构支持扩展到 360。
2. **Vocabulary Model ≥1500**：新增 45 个主题组文件，总量 1500+ 全字段词条；关系不确定留空（零悬空端点由测试保证）。
3. **Grammar Engine v0**：12 个核心语法主题（be/一般现在/过去/进行/将来/否定/疑问/冠词/介词/可数不可数/代词/基础从句），每主题中文讲解+英文规则+常见错误(含干扰项)+关联词汇；生成器覆盖**改错/填空/中译英/排序/造句**五种题型。
4. **新题型系统**：grammar-correct / translate-zh-en / guided-production / reading-comprehension 四类接入类型系统、判分、interaction 映射与 UI 运行器。
5. **课程接线**：练习与小测自动消费每日 grammarTopicId / reading / writingPrompt；planner 新增 preferProduction（输出倾斜：选择题换打字回忆）与 includePhonicsPairs（听辨加练）两个自适应开关。
6. **注册表**：grammar → partial。

## 2. 修改文件
- 新增：`src/content/vocab/groups/g01–g45`（45 文件）、`src/content/days/factory.ts`、`days-extended.ts`、`src/engines/grammar/topics.ts`、`grammar-engine-v0.ts`
- 修改：`content/types.ts`(DayContent 扩展)、`content/index.ts`(getDayVocabulary)、`days/index.ts`(30天)、`study/exercise-types.ts|grade.ts|generate-exercises.ts`、`pages/StudyPage.tsx`、`engines/index(.test).ts`、既有测试适配
- 测试：vocab.test 阈值 1500；index/knowledge/integration 等测试同步 Phase 3 事实

## 3. 数据结构变化
- `DayContent` 新增可选字段：`vocabIds[] / grammarTopicId / phonicsFocus{ruleIds,pairIds} / reading[] / writingPrompt{zh,hintEn}`（向后兼容，旧 Day1–7 不受影响）
- `ExerciseSkill` 扩展 reading/writing；`ExerciseAnswer` 扩展 production-matched/off
- `FillBlank/SentenceOrder` 增加可选 `grammarTopicId`

## 4. 测试结果
```
lint ✅ 0        typecheck ✅
test  ✅ 98 passed (16 files)    build ✅ precache 17 项 ≈598KiB
```
五项指定验证：
| 要求 | 结果 |
| --- | --- |
| Day8–30 可加载 | ✅ content/index.test（30 天顺序、字段完整、越界拒绝） |
| Grammar Engine 生成练习 | ✅ 引擎实现并经 generate-exercises 链路进入练习/小测（专项单测见下方说明*） |
| 错误→SRS 项目 | ⚠️ 未实现（见 §6）——Phase 2 的重复错误→drill 闭环仍在生效 |
| Assessment 生成结果 | ⚠️ 未实现持久化引擎（见 §6）——小测路径已含输出题 |
| Planner 按能力调整 | ✅ preferProduction/includePhonicsPairs 规则+通知已接入 |

\* 语法引擎经集成路径验证（练习包含改错/中译英等）；独立单测建议随 Phase 3b 补充。

## 5. 当前真实可用功能
- Day1–30 连续学习闭环（复习→新课→练习[含阅读理解/造句/中译英/改错]→小测→报告）
- 1500+ 词模型驱动的全部练习与干扰项
- 12 语法主题的五种训练题型与中文讲解
- 能力差异自适应：输出弱→自动增加产出题；听力弱→增加听辨（首页有解释）

## 6. 未完成功能（诚实声明）
- **Error→SRS 自动建卡**：分类→补救卡片→入复习队列的自动化代码未落地
- **Assessment Engine 持久化**：Day30 综合测评的独立会话/评分存储/报告页未落地（小测已覆盖输出题）
- LessonFlow 中独立的"阅读卡/写作卡"教学步骤（当前经练习块承载）
- iOS 真机验收（持续遗留）

## 7. 已知问题
- Windows PowerShell 对 LF here-string/模板字符串不友好导致中途多次文件修补（最终以临时文件注入法修复，产物已验证）
- 扩展日 pattern 节点暂无 commonErrors 数据（Grammar Topics 引擎不受影响）
- eslint 上游版本提示（噪音）

## 8. Phase 4 建议
1. 补完 Phase 3 尾巴：Error→SRS 卡片 + Assessment 持久化 + LessonFlow 阅读写作卡（约半天工作量）
2. 然后：AI Provider(BYOK) 或 Day31–90 课程管线二选一

## 9. 是否可以进入下一阶段
**No** —— 主线可用但指令明确要求的“Error→SRS 闭环”与“Assessment 结果”两项未完成；
建议先执行一个简短的 **Phase 3b** 补齐上述两项后再进入 Phase 4。

---
已停止。等待人工审核。
