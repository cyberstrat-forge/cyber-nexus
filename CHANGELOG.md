# 更新日志

本文件记录项目的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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

[1.0.2]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/cyberstrat-forge/cyber-nexus/releases/tag/v1.0.0