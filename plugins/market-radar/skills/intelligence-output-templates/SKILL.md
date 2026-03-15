---
name: intelligence-output-templates
description: Markdown templates and output structure for intelligence cards. Use when generating final markdown output from agent JSON results.
---

## 概述

此 skill 提供情报卡片的输出模板。

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

- **`../cybersecurity-domain-knowledge/SKILL.md`** - 领域定义
- **`../intelligence-analysis-methodology/SKILL.md`** - 提取方法论