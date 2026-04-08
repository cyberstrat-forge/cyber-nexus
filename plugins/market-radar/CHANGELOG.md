# 更新日志

本文件记录 market-radar 插件的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [1.9.5] - 2026-04-08

### 变更

- **WikiLink 别名格式**：所有 WikiLink 输出使用 `[[path|alias]]` 格式
  - `toWikiLink` 函数支持可选别名参数，默认使用文件名
  - Obsidian 显示更友好的别名而非完整路径
  - `fromWikiLink` 支持解析带别名的 WikiLink 格式

### 文档更新

- 更新命令和 Agent 文档中的 WikiLink 示例
- 更新 JSON Schema 描述

### 测试

- 新增 4 个 `toWikiLink` 测试用例（别名、嵌套路径）
- 新增 3 个 `fromWikiLink` 测试用例（带别名解析）

## [1.9.4] - 2026-04-08

### 变更

- **转换文件 Frontmatter 统一**：本地文件和 cyber-pulse 文件使用相同字段结构
  - 新增 `item_id`、`item_title`、`fetched_at` 字段
  - `archived_file` 使用 WikiLink 格式，支持 Obsidian 跳转
  - 字段名统一为 snake_case（`sourceHash` → `source_hash`，`archivedAt` → `archived_at`）
  - 移除 `originalPath`（不再需要）

### 修复

- **cyber-pulse 文件字段映射**：`title` → `item_title`，`url` → `original_url`
- **intel-pull-guide.md 文档**：修复严重过时的 frontmatter 示例
- **Agent 文档示例**：修正 cyber-pulse 文件的 `archived_file` 路径
- **fromWikiLink 输入验证**：对非 WikiLink 格式返回 null，防止解析畸形输入
- **loadPending 错误处理**：改进 JSON 解析失败时的错误日志，提示可能的文件损坏
- **main() 错误处理**：添加 try-catch 包装器，捕获未预期的致命错误

### 测试

- 新增 `frontmatter.test.ts`，覆盖工具函数测试（13 个测试用例）
- 新增畸形 WikiLink 格式测试用例

## [1.9.3] - 2026-04-08

### 修复

- **预处理脚本**：修复嵌套 inbox 目录问题，支持多层目录结构
- **PDF 转换**：支持使用 uv 运行 marker_single 进行 PDF 转换

## [1.9.2] - 2026-04-08

### 优化

- **报告工作流上下文优化**：`scan-cards.ts` 新增 `--format agent` 输出格式，输出轻量元数据（无正文摘要），由 Agent 按需读取卡片内容，保护主会话上下文空间
- **代码重构**：提取 `scanCardsBase<T>()` 泛型函数，消除 `scanCards`、`scanCardsFull`、`scanCardsAgent` 三个函数的重复代码

### 修复

- **Obsidian 链接格式**：修复报告模板和 Agent 文件中的 Obsidian 链接格式，统一使用 `[[intelligence/{完整路径}|标题]]` 格式，确保链接在 Obsidian 中可跳转
- **Agent 临时文件管理**：为 `intelligence-analyzer`、`intelligence-cluster`、`theme-analyzer` 三个 Agent 添加临时文件管理指导，防止残留临时文件

## [1.9.1] - 2026-04-07

### Fixed

- 修正 scan-queue.ts 哈希语义：使用 body 哈希（排除 frontmatter）与预处理脚本一致
- scan-queue.ts 新增 auto_fix 和 pending_review 文本输出，显示状态警告和审核队列
- 同步 intelligence-analyzer Agent 返回示例中的 ID 格式为文件名模式
- 修正 intel-distill.md 转换文件格式文档错误
- intel-distill 命令新增中断恢复机制文档

### Added

- scan-queue.ts 新增中断恢复自动检测，自动识别状态不一致的文件
- ScanQueueResult 新增 auto_fix 可选字段，记录状态修复建议

### Changed

- 明确 archived_source 的数据来源（从内存 queue 获取）
- 改进 scan-queue.ts 类型定义：auto_fix.current_status 使用 ProcessedStatus

## [1.9.0] - 2026-04-07

### 新增

- **四层情报报告体系**：层级聚合模型，高级别报告从低级别报告聚合生成
  - 日报（信号导向）：指导情报分析人员关注特定情报
  - 周报（主题导向）：通过语义分析发现跨日主题模式
  - 月报（变化导向）：识别态势变化，支持跨月追踪
  - 年报（趋势导向）：回答行业演进方向、竞争格局变化、战略机会

- **变化类型系统**：6 种变化类型支撑周报主题标注和月报聚合
  - 新威胁出现、市场格局变化、技术突破与应用
  - 客户需求演变、合规压力变化、资本动向

- **态势追踪机制**：
  - 态势 ID 规则：`S-{年份}-{月份}-{序号}`
  - 态势状态：新态势（🆕）、持续、减弱（⬇️）、消退（⏹️）
  - 支持跨月追踪，为年报提供趋势分析基础

- **新增组件**：
  - `scripts/reporting/types/`：类型定义（change-type, situation, report）
  - `scripts/reporting/scan-reports.ts`：报告扫描脚本
  - `agents/intelligence-weekly-writer.md`：周报撰写 Agent
  - `agents/intelligence-monthly-writer.md`：月报撰写 Agent
  - `agents/intelligence-annual-writer.md`：年报撰写 Agent
  - `references/weekly-report-template.md`：周报模板
  - `references/monthly-report-template.md`：月报模板
  - `references/annual-report-template.md`：年报模板

### 变更

- **intel-distill 命令**：区分四种报告类型的数据源和 Agent 调用
- **intelligence-briefing-writer Agent**：标记为 legacy，建议使用新的专用 Agent

## [1.8.2] - 2026-04-07

### 修复

- **字段名一致性**：修复 `review.pending` → `review.items` 字段名不一致问题，统一 Schema、类型定义、脚本和文档
- **参数语义清晰化**：
  - intel-pull：`--source` 重命名为 `--from`（API 源名称），避免与目录参数混淆
  - scan-queue.ts：`--source` 重命名为 `--root`（项目根目录）
  - update-state.ts：`--output` 重命名为 `--root`（项目根目录）
- **文档更新**：重写审核批准流程（步骤 A2），更新所有遗留字段引用
- **错误处理增强**：update-state.ts 区分 `rejected` 和 `passed` 状态的文件缺失处理