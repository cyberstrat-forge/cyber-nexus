# 更新日志

本文件记录 market-radar 插件的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [1.2.5] - 2026-03-15

### 变更

- **Obsidian 链接格式支持**
  - `archived_source` 和 `converted_file` 字段改用 `[[]]` 格式
  - 支持在 Obsidian 中建立文件链接，便于追溯和管理

## [1.2.4] - 2026-03-15

### 变更

- **元数据存储架构重构**
  - 从 `.meta` 文件迁移到 Markdown frontmatter 存储
  - 元数据字段：`sourceHash`、`originalPath`、`archivedAt`、`archivedSource`
  - 简化存储结构，元数据与内容一体化

- **错误处理优化**
  - 转换失败时生成用户友好的 `.error.md` 错误日志
  - 错误日志包含错误原因和建议操作清单
  - 错误日志输出到 `inbox/` 目录，便于用户查看

- **Agent 参数精简**
  - 从 5 个参数减少到 3 个（`source`、`output`、`session_id`）
  - 移除 `archive_dir` 和 `converted_dir` 参数
  - 参数自动推导，简化命令调用

- **跨平台兼容性**
  - 支持 CRLF 和 LF 行尾格式
  - YAML 字符串正确转义反斜杠和双引号

### 修复

- 修复预处理归档顺序问题，确保原子性（先写转换文件再归档源文件）
- 修复未使用的 `getMimeType` 函数（死代码移除）
- 增强 `fs.readdirSync` 错误处理

## [1.2.3] - 2026-03-15

### 变更

- **情报卡片数量限制移除**
  - 移除所有文件中的"0-3 条"硬性限制（命令、Agent、Schema）
  - 情报数量完全根据源文档实际内容和情报价值决定

- **情报卡片写作原则规范化**
  - 在 `intelligence-output-templates` skill 中新增"写作原则"章节
  - 明确"提炼而非摘抄"原则
  - 规范关键数据呈现格式

- **数据呈现格式优化**
  - 将"数据支撑"章节重命名为"关键数据"
  - 改用表格格式呈现数据，数值自动加粗
  - 7 个领域模板统一更新

## [1.2.2] - 2026-03-15

### 变更

- **情报提取方法论优化**
  - 移除情报提取数量上限（原0-3条），改为根据源文档实际内容和情报价值灵活判断
  - 强调原子化原则：一个洞察点=一张情报卡片，有多少有价值洞察就提取多少

- **新增 AI 行业重塑关注点**
  - 开发模式：AI 辅助代码生成、自动化测试、智能漏洞挖掘
  - 架构演进：AI-native 安全架构、实时自适应防护、边缘智能
  - 产品形态：从工具到平台、从规则到智能、从被动到主动
  - 商业模式：SaaS 化、按效果付费、AI Agent 即服务
  - 竞争格局：新进入者、传统厂商转型、技术壁垒变化

- **输出模板优化**
  - 移除"核心事实"章节下的原文引用，统一放置到"原文关键引用"章节
  - 为7个领域设计差异化核心事实描述，采用"聚焦xxx: 结构化要素"格式

## [1.2.1] - 2026-03-15

### 修复

- **Agent tools 字段格式优化**
  - 将所有 agent 的 `tools` 字段从字符串格式改为数组格式
  - 提高与不同解析器的兼容性，确保工具权限被正确读取
  - 受影响文件：`intelligence-analyzer.md`, `intelligence-cluster.md`, `theme-analyzer.md`, `panorama-synthesizer.md`, `intelligence-briefing-writer.md`

- **intel-distill 命令文档增强**
  - 在 Agent 调用说明中明确列出所需工具权限
  - 确保评测和执行时工具分配正确

- **Skill 目录重命名**
  - 统一 skill 目录名与 SKILL.md 中的 name 字段
  - `domain-knowledge/` → `cybersecurity-domain-knowledge/`
  - `analysis-methodology/` → `intelligence-analysis-methodology/`
  - `output-templates/` → `intelligence-output-templates/`
  - 更新所有相关文件中的引用路径

- **geo_scope 字段必填强化**
  - 在 output-templates 模板中标注 geo_scope 为必填字段
  - 在 intelligence-analyzer 最终检查清单中强调不可省略
  - 无法判断时必须使用 `unknown` 值

### 相关 Issue

- [#29](https://github.com/cyberstrat-forge/cyber-nexus/issues/29) P0 Agent 工具权限配置问题
- [#29](https://github.com/cyberstrat-forge/cyber-nexus/issues/29) P1 geo_scope 字段缺失率高

## [1.2.0] - 2026-03-13

### 新增

- **intel-distill 工作流重构**
  - 新增 `inbox/` 目录作为待处理文档推荐入口
  - 源文件归档到 `archive/YYYY/MM/`，按年月组织
  - 转换文件输出到 `converted/YYYY/MM/`
  - 元数据文件保存在 archive/ 目录 (`{filename}.meta`)
  - 基于源文件哈希实现去重机制

- **情报卡片持久化支持**
  - 卡片包含 `source_hash`、`archived_source`、`converted_file` 等元数据
  - 支持删除源文件后卡片仍可追溯
  - 审核机制：待审核不生成卡片，批准后才生成，拒绝后不生成

- **审核模式**
  - `--review list`：列出所有待审核任务
  - `--review approve <id>`：批准待审核项
  - `--review reject <id>`：拒绝待审核项

- **scan-queue.ts 扫描队列脚本**
  - 批量扫描 converted 目录
  - 自动选择处理策略（< 50 文件用 Glob，>= 50 文件用脚本）
  - 支持 object 和 array 两种 state 格式

### 变更

- **统一 Schema 和文档格式**
  - `processed` 类型统一为 object（键值对映射）
  - 字段命名统一：`stats`、`updated_at`
  - `intelligence_id` 正则放宽支持多单词前缀
  - 添加 Domain 映射关系文档

- **改进错误处理**
  - 为依赖检测添加错误日志
  - 为元数据解析添加错误日志

### 修复

- 修复 Schema 与文档不一致问题
- 修复静默失败问题（catch 块添加日志）

### 相关 Issue

- [#21](https://github.com/cyberstrat-forge/cyber-nexus/issues/21) 审核机制与处理逻辑优化
- [#22](https://github.com/cyberstrat-forge/cyber-nexus/issues/22) 情报卡片持久化
- [#25](https://github.com/cyberstrat-forge/cyber-nexus/issues/25) 重构 inbox 目录结构

## [1.1.0] - 2026-03-13

### 新增

- **情报报告功能**：从现有情报卡片生成结构化周报/月报
  - 支持 `--report weekly` 生成周报（周一至周日）
  - 支持 `--report monthly` 生成月报（1日至月末）
  - 支持指定周期参数：`2026-W10` 或 `2026-03`
  - 报告包含：执行摘要、情报综述、情报目录三部分

- **新增组件**：
  - `scripts/reporting/scan-cards.ts`：扫描情报卡片脚本
  - `agents/intelligence-briefing-writer.md`：情报简报撰写 Agent

### 变更

- **命令扩展**：`intel-distill` 命令添加 `--report` 参数
- **目录结构**：新增 `reports/weekly/` 和 `reports/monthly/` 目录
- **依赖更新**：添加 `commander` 命令行解析库

### 相关 Issue

- [#23](https://github.com/cyberstrat-forge/cyber-nexus/issues/23) 增加情报提取报告功能：周报/月报

## [1.0.4] - 2026-03-11

### 新增

- **地域范围字段**：新增 `geo_scope` 字段，用于标识情报的地域范围
  - 值域：`global`, `china`, `china-primary`, `overseas`, `overseas-primary`, `unknown`
  - 适用于所有情报领域
  - 严格模式判断：仅依据文档明确提及的地域信息

- **业务模式标签**：新增 `business_model_tags` 字段，用于识别网络安全行业业务模式
  - 仅适用于 Industry-Analysis 领域
  - 标签体系覆盖 6 大类共 27 个标签值
  - 交付模式：MSSP、SECaaS、On-Premise、Hybrid-Delivery、Embedded-Security
  - 收费模式：Subscription、Usage-Based、Outcome-Based、Freemium、License-Based
  - 运营模式：MDR、MSS、vCISO、Security-Operations-Outsourcing、In-House-Operations
  - 合作生态：Platform-Ecosystem、Channel-Partner、OEM-Partnership、Technology-Alliance、Co-Development
  - 创新模式：Crowdsourced-Security、Security-Insurance、Bug-Bounty-Platform、Cyber-Risk-Quantification、Security-Financing、Data-Sharing-Alliance
  - 特殊标签：New-Business-Model、Business-Model-Shift

### 变更

- **Schema 更新**：`intelligence-output.schema.json` 添加 `geo_scope` 和 `business_model_tags` 字段定义
- **模板更新**：所有领域 frontmatter 添加 `geo_scope` 字段；Industry-Analysis 添加 `business_model_tags` 和业务模式观察章节
- **Agent 增强**：添加地域判断逻辑和业务模式标签提取步骤

### 相关 Issue

- [#7](https://github.com/cyberstrat-forge/cyber-nexus/issues/7) 情报领域增强

## [1.0.3] - 2026-03-11

### 新增

- **预处理管道**：在调用 Agent 前统一处理源文件
  - 格式转换：PDF/DOCX → Markdown
  - 噪声清洗：删除图片链接、社交媒体元数据、连续空行
  - 输出目录：`{source_dir}/converted/`（用户可见）
  - 元数据管理：`.meta/` 目录跟踪处理状态

### 变更

- **架构优化**：预处理移至命令层，Agent 专注推理
- **Agent 简化**：移除格式转换逻辑，直接读取干净的 Markdown
- **变更检测**：基于转换后文件的 content hash

### 目录结构

```
{source_dir}/
└── converted/
    ├── .meta/               # 元数据（隐藏）
    ├── report.md            # 转换后的 Markdown
    └── ...
```

## [1.0.2] - 2026-03-10

### 变更

- **变更检测优化**：使用 content hash (MD5) 替代 mtime，解决 `git checkout`、`git pull`、`git clone` 操作导致的误判问题 ([#3](https://github.com/cyberstrat-forge/cyber-nexus/issues/2))
- **去重规则明确**：定义三要素匹配规则
  - `intelligence_date`：精确字符串匹配
  - `primary_domain`：精确字符串匹配
  - 标题：相似度 > 80%（基于关键词交集）
- **归档规则明确**：`processed` 条目超过 30 天自动归档到 `history/YYYY-MM.json`

### Schema

- `state.schema.json`: 为所有条目类型添加 `content_hash` 字段（32位 MD5）
- `pending_item`: `mtime` → `content_hash`
- `processing_entry`: `mtime` → `content_hash`
- `failed_entry`: `mtime` → `content_hash`
- `processed_entry`: 新增必填 `content_hash`，保留可选 `source_mtime`

### 迁移说明

现有 `state.json` 需手动更新：
1. 为每个 `processed` 条目添加 `content_hash` 字段
2. 或删除 `state.json` 重新处理文件

## [1.0.1] - 2026-03-10

### 变更

- 优化 intel-distill 上下文架构，Agent 直接写入情报卡片
- 添加 JSON Schema 校验支持
- 精简文档内容，消除冗余
- 补充临时文件清理逻辑

## [1.0.0] - 2026-03-10

### 新增

- 首个正式版本发布
- 实现 intel-distill 命令核心功能
- 支持七大情报领域自动分类：
  - Threat Landscape（威胁态势）
  - Industry Analysis（行业分析）
  - Vendor Intelligence（厂商情报）
  - Emerging Tech（新兴技术）
  - Customer Market（客户与市场）
  - Policy Regulation（政策法规）
  - Capital Investment（资本动态）
- 支持 Markdown、PDF、Word 文档处理
- 实现增量处理机制

[1.2.5]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.2.1...v1.2.2
[1.2.0]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.5...v1.0.6
[1.1.0]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/cyberstrat-forge/cyber-nexus/releases/tag/v1.0.0