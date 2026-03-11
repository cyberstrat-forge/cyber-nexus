# 更新日志

本文件记录 market-radar 插件的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

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

[1.0.3]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/cyberstrat-forge/cyber-nexus/releases/tag/v1.0.0