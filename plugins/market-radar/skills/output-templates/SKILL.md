---
name: Intelligence Output Templates
description: Markdown templates and output structure for intelligence cards. Use when generating final markdown output from agent JSON results.
version: 1.0.0
---

## 概述

此 skill 提供 markdown 模板，用于将 Agent 返回的 JSON 转换为情报卡片文件。

## 存储结构

```
{output_dir}/
├── Threat-Landscape/
├── Industry-Analysis/
├── Vendor-Intelligence/
├── Emerging-Tech/
├── Customer-Market/
├── Policy-Regulation/
└── Capital-Investment/

{output_dir}/.intel/
├── state.json
└── history/
```

## 文件命名规范

格式：`{YYYYMMDD}-{简短标识符}.md`

规则：
- 日期为情报日期（非创建日期）
- 标识符使用 kebab-case，最长 50 字符

## 通用 Frontmatter 字段

```yaml
---
title: "情报标题"
source_file: "[[relative/path/to/source.md]]"
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Domain-Identifier
secondary_domains: []
security_relevance: high | medium
review_status: pending
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

## 通用正文结构

```markdown
## 核心事实
[1-3 句话提炼的战略情报]

> "[来源中的关键引用]"

**战略意义**：[对网络安全战略的影响]

## 数据支撑
- [具体数字、百分比、金额]

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[related/intelligence/path.md]]
```

## 领域特定模板

完整的 7 个领域 frontmatter 和正文模板，参见：

- **`references/templates.md`**

## 相关 Skills

- **`../domain-knowledge/SKILL.md`** - 领域定义
- **`../analysis-methodology/SKILL.md`** - 提取方法论