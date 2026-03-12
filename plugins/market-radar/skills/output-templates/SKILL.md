---
name: intelligence-output-templates
description: Markdown templates and output structure for intelligence cards. Use when generating final markdown output from agent JSON results.
---

## 概述

此 skill 提供情报卡片的输出模板。

## 输出结构

情报卡片按领域存储：

```
{output_dir}/
├── Threat-Landscape/
├── Industry-Analysis/
├── Vendor-Intelligence/
├── Emerging-Tech/
├── Customer-Market/
├── Policy-Regulation/
└── Capital-Investment/
```

## 领域特定模板

完整的 7 个领域 frontmatter 和正文模板，参见：

- **`references/templates.md`**

## 相关 Skills

- **`../domain-knowledge/SKILL.md`** - 领域定义
- **`../analysis-methodology/SKILL.md`** - 提取方法论