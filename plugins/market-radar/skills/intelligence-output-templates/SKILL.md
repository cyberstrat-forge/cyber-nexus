---
name: intelligence-output-templates
description: Markdown templates and output structure for intelligence cards. Use when generating final markdown output from agent JSON results.
---

## 概述

此 skill 提供情报卡片的输出模板。

## 四组层次结构

情报卡片 frontmatter 采用四组层次结构：

1. **核心标识**：`intelligence_id`, `title`, `created_date`, `primary_domain`, `secondary_domains`, `security_relevance`, `tags`
2. **item 来源追溯**：`item_id`, `item_title`, `author`, `original_url`, `published_at`, `fetched_at`, `completeness_score`, `archived_file`, `converted_file`
3. **情报源追溯**：`source_id`, `source_name`, `source_url`, `source_tier`, `source_score`
4. **处理状态**：`review_status`, `generated_by`, `generated_session`

## tags 嵌套格式

tags 字段使用命名空间前缀：

```yaml
tags: ["geo:china", "business:MSSP", "APT", "ransomware"]
```

- `geo:` 前缀：地域范围（`geo:global`, `geo:china`, `geo:unknown` 等）
- `business:` 前缀：业务模式（仅 Industry-Analysis）
- 无前缀：关键词

## 写作原则

### 提炼而非摘抄

- 精炼语言，聚焦单一洞察
- 关键数据在"核心事实"中用 **加粗** 突出
- 不复制整段原文，只在必要时引用关键语句

### 数据呈现

- 多组数据（≥2条）使用表格格式
- 单条数据可内联在正文中，用 **加粗** 突出
- 表格包含：指标、数值

## 输出结构

情报卡片按领域和年月存储：

```
{output_dir}/
├── Threat-Landscape/
│   └── 2026/
│       ├── 03/
│       │   └── 20260301-apt-activity.md
│       └── 04/
│           └── 20260402-ransomware-trend.md
├── Industry-Analysis/
│   └── 2025/
│       └── 10/
│           └── 20251013-cybersecurity-trends-2026.md
├── Vendor-Intelligence/
│   └── 2026/
├── Emerging-Tech/
│   └── 2026/
├── Customer-Market/
│   └── 2026/
├── Policy-Regulation/
│   └── 2026/
└── Capital-Investment/
    └── 2026/
```

**输出路径格式**：

```
{output}/{domain}/{YYYY}/{MM}/{YYYYMMDD}-{subject}-{feature}.md
```

其中：
- `{domain}` - 情报领域（如 Threat-Landscape）
- `{YYYY}` - 发布年份（从 published_at 提取）
- `{MM}` - 发布月份（从 published_at 提取）
- `{YYYYMMDD}` - 发布日期
- `{subject}` - 主体/对象
- `{feature}` - 核心特征

## 领域特定模板

完整的 7 个领域 frontmatter 和正文模板，参见：

- **`references/templates.md`**

## 相关 Skills

- **`../cybersecurity-domain-knowledge/SKILL.md`** - 领域定义
- **`../intelligence-analysis-methodology/SKILL.md`** - 提取方法论