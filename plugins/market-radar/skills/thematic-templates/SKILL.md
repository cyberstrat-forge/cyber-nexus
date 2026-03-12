---
name: thematic-templates
description: This skill should be used when generating theme reports and panorama reports from analysis materials. Provides markdown templates and structure guidance.
---

## 概述

主题报告模板，定义主题报告和全景报告的结构和格式。

详细模板参见 `references/templates.md`。

## 报告类型

| 类型 | 用途 | 输出位置 |
|------|------|----------|
| 主题报告 | 单个主题的深度分析报告 | `reports/{theme-id}.md` |
| 全景报告 | 所有主题的综合概览 | `panorama/{YYYYMM}-panorama.md` |

## 基本结构

### 主题报告结构

```markdown
---
title: "主题名称"
theme_id: "theme-id"
generated_date: YYYY-MM-DD
card_count: N
date_range: "YYYY-MM-DD ~ YYYY-MM-DD"
---

## 概览
[主题核心洞察，2-3 句话]

## 时间趋势
[时间线分析，趋势变化]

## 关键发现
1. [发现1]
2. [发现2]
3. [发现3]

## 实体网络
### 关键厂商
### 威胁行为者（如适用）
### 技术趋势

## 跨领域关联
[领域间的关联分析]

## 战略建议
1. [建议1]
2. [建议2]

## 数据支撑
### 关键数据
| 指标 | 数值 | 来源 |

### 情报来源
- [[卡片路径]]
```

### 全景报告结构

```markdown
---
title: "网络安全情报全景"
generated_date: YYYY-MM-DD
themes_count: N
---

## 全景概览
[整体态势描述]

## 领域分布
[各领域情报数量和占比]

## 热点主题
[各主题摘要]

## 跨主题洞察
[主题间的关联和联动]

## 战略建议汇总
[基于全景分析的关键建议]

## 主题报告索引
| 主题 | 卡片数 | 报告链接 |
```

## 参考文件

详细模板格式参见：

- **`references/templates.md`** - 完整报告模板