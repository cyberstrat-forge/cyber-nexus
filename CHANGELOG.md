# 更新日志

本文件记录项目的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.2.0] - 2026-03-13

### 新增

- **market-radar**: 重构 intel-distill 工作流，解决多个核心问题
  - 新增 `inbox/` 目录作为待处理文档推荐入口
  - 源文件归档到 `archive/YYYY/MM/`，按年月组织
  - 转换文件输出到 `converted/YYYY/MM/`
  - 元数据文件保存在 archive/ 目录 (`{filename}.meta`)
  - 基于源文件哈希实现去重机制

- **market-radar**: 情报卡片持久化支持
  - 卡片包含 `source_hash`、`archived_source`、`converted_file` 等元数据
  - 支持删除源文件后卡片仍可追溯
  - 审核机制：待审核不生成卡片，批准后才生成，拒绝后不生成

- **market-radar**: 新增 `scan-queue.ts` 扫描队列脚本
  - 批量扫描 converted 目录
  - 自动选择处理策略（< 50 文件用 Glob，>= 50 文件用脚本）
  - 支持 object 和 array 两种 state 格式

### 变更

- **market-radar**: 统一 Schema 和文档格式
  - `processed` 类型统一为 object（键值对映射）
  - 字段命名统一：`stats`、`updated_at`
  - `intelligence_id` 正则放宽支持多单词前缀
  - 添加 Domain 映射关系文档

- **market-radar**: 改进错误处理
  - 为依赖检测添加错误日志
  - 为元数据解析添加错误日志

### 修复

- 修复 Schema 与文档不一致问题
- 修复静默失败问题（catch 块添加日志）

## [1.1.0] - 2026-03-13

### 新增

- **market-radar**: 情报报告功能
  - 支持 `--report weekly` 生成周报
  - 支持 `--report monthly` 生成月报
  - 报告包含：执行摘要、情报综述、情报目录

## [1.0.5] - 2026-03-13

### 新增

- **market-radar v1.1.0**：情报报告功能
  - 支持 `--report weekly` 生成周报
  - 支持 `--report monthly` 生成月报
  - 报告包含：执行摘要、情报综述、情报目录

## [1.0.4] - 2026-03-11

### 新增

- **market-radar**: 新增 `geo_scope` 字段，用于标识情报的地域范围
  - 值域：`global`, `china`, `china-primary`, `overseas`, `overseas-primary`, `unknown`
  - 适用于所有情报领域
- **market-radar**: 新增 `business_model_tags` 字段，用于识别网络安全行业业务模式
  - 仅适用于 Industry-Analysis 领域
  - 标签体系覆盖 6 大类共 27 个标签值

## [1.0.3] - 2026-03-11

### 新增

- **market-radar**: 预处理管道，在调用 Agent 前统一处理源文件
  - 格式转换：PDF/DOCX → Markdown（依赖 pandoc/pdftotext）
  - 噪声清洗：删除图片链接、社交媒体元数据、连续空行
  - 支持多种来源：PDF 报告、微信公众号、Twitter/X 线程、网页文章
  - 增量处理：自动跳过已转换文件

## [1.0.2] - 2026-03-10

### 变更

- **market-radar**: 使用 content hash (MD5) 替代 mtime 进行变更检测，解决 git 操作导致的误判问题
- **market-radar**: 明确定义去重规则（日期 + 领域 + 标题相似度 > 80%）
- **market-radar**: 明确归档规则（超过 30 天自动归档到 history/ 目录）

### Schema

- `state.schema.json`: 为所有条目类型添加 `content_hash` 字段

## [1.0.1] - 2026-03-10

### 变更

- **market-radar**: 优化 intel-distill 上下文架构，Agent 直接写入情报卡片
- **market-radar**: 添加 JSON Schema 校验支持
- **market-radar**: 精简文档内容，消除冗余

## [1.0.0] - 2026-03-10

### 新增

- **market-radar**: 首个正式版本
  - intel-distill 命令实现情报提取
  - 支持七大情报领域自动分类
  - 支持 Markdown、PDF、Word 文档处理
  - 实现增量处理机制

[1.2.0]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.5...v1.1.0
[1.0.5]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/cyberstrat-forge/cyber-nexus/releases/tag/v1.0.0