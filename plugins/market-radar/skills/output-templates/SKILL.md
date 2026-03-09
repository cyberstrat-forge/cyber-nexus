---
name: Intelligence Output Templates
description: This skill should be used when formatting extracted intelligence into structured output files, creating intelligence cards, or applying domain-specific templates. Triggers on "format intelligence", "create intelligence card", "output template", or when generating final intelligence documents.
version: 0.1.0
---

## 输出概述

情报以两种格式输出：

1. **Agent JSON 输出**：intelligence-analyzer agent 返回的结构化数据
2. **Markdown 情报卡片**：存储在 `.intel/<领域>/` 的最终文档

## 文件命名规范

格式：`{YYYYMMDD}-{简短标识符}.md`

示例：
- `20260309-ai-agent-security.md`
- `20260309-ransomware-trends.md`

命名规则：
- 日期为情报日期（非创建日期）
- 标识符简洁、可读、反映核心内容
- 使用 kebab-case 格式
- 最长 50 字符

## 存储结构

```
.intel/
├── state.json              # 统一状态管理
├── history/                # 历史元数据（按月归档）
│   ├── 2026-03.json
│   ├── 2026-02.json
│   └── ...
├── Threat-Landscape/
│   └── {情报卡片}.md
├── Industry-Analysis/
│   └── {情报卡片}.md
├── Vendor-Intelligence/
│   └── {情报卡片}.md
├── Emerging-Tech/
│   └── {情报卡片}.md
├── Customer-Market/
│   └── {情报卡片}.md
├── Policy-Regulation/
│   └── {情报卡片}.md
└── Capital-Investment/
    └── {情报卡片}.md
```

## 状态文件结构（state.json）

```json
{
  "version": "1.0",
  "updated_at": "2026-03-09T20:30:00Z",

  "queue": {
    "pending": [
      {"path": "docs/report1.md", "mtime": 1709987400}
    ],
    "processing": {
      "docs/report2.md": {
        "started_at": "2026-03-09T20:25:00Z",
        "session": "20260309-202500",
        "mtime": 1709987500
      }
    },
    "failed": {
      "docs/encrypted.pdf": {
        "error": "Agent timeout",
        "failed_at": "2026-03-09T20:20:00Z",
        "retries": 1,
        "mtime": 1709987300
      }
    }
  },

  "processed": {
    "ai-security-report-2026.md": {
      "source_mtime": 1709987400,
      "processed_at": "2026-03-09T20:15:00Z",
      "intelligence_count": 3,
      "output_files": [
        ".intel/Industry-Analysis/20260309-ai-security-market-growth.md"
      ],
      "session": "20260309-201500"
    }
  },

  "stats": {
    "total_files": 15,
    "total_intelligence": 28,
    "last_run": "2026-03-09T20:30:00Z"
  }
}
```

### 状态字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `queue.pending` | 数组 | 待处理文件列表，包含路径和 mtime |
| `queue.processing` | 对象 | 正在处理的文件，键为文件路径 |
| `queue.failed` | 对象 | 失败的文件，包含错误信息和重试次数 |
| `processed` | 对象 | 已完成文件的元数据，键为文件路径 |
| `stats.total_files` | 数字 | 累计处理文件数 |
| `stats.total_intelligence` | 数字 | 累计提取情报数 |
| `stats.last_run` | 字符串 | 最后运行时间 |

## 历史归档文件结构（history/*.json）

```json
{
  "month": "2026-02",
  "processed": {
    "jan-report.md": {
      "source_mtime": 1708000000,
      "processed_at": "2026-02-15T10:00:00Z",
      "intelligence_count": 2,
      "archived_at": "2026-03-01T00:00:00Z"
    }
  },
  "stats": {
    "files_processed": 12,
    "intelligence_extracted": 25
  }
}
```

### 归档规则

- 每月初归档上月及更早的 `processed` 数据
- 归档后从 `state.json` 的 `processed` 中移除
- 历史文件可用于统计分析和审计追溯

## 通用 Frontmatter 字段

所有领域共享以下 frontmatter 字段：

```yaml
---
title: "情报标题"
source_file: "[[relative/path/to/source.md]]"
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Domain-Identifier
secondary_domains: [Secondary-Domain-1, Secondary-Domain-2]
security_relevance: high | medium
review_status: pending | approved | revised
review_notes:                    # 仅当 review_status: pending 时
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

## Markdown 卡片结构

### 通用章节

所有情报卡片包含：

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

完整的领域特定 frontmatter 和正文模板，参见：

- **`references/templates.md`** - 全部 7 个领域模板

快速参考：

| 领域 | 特殊 Frontmatter | 特殊正文章节 |
|--------|---------------------|----------------------|
| Threat-Landscape | threat_type, threat_actor, target_sector, target_region, impact_scale | 攻击手法, 受害目标, 影响评估, 趋势变化 |
| Industry-Analysis | market_scope, segment | 市场规模, 驱动因素, 阻碍因素, 预测观点 |
| Vendor-Intelligence | vendor_name, vendor_type, business_area | 厂商概况, 关键动态, 财务数据, 市场地位, 战略动向 |
| Emerging-Tech | tech_name, maturity | 技术概述, 核心能力, 应用场景, 代表厂商, 安全影响, 发展趋势 |
| Customer-Market | customer_segment, region | 客户画像, 需求痛点, 采购行为, 决策因素, 采用趋势 |
| Policy-Regulation | policy_name, issuing_body, jurisdiction, effective_date | 政策概述, 核心要求, 影响范围, 合规成本, 市场影响 |
| Capital-Investment | event_type, company, investors | 事件概述, 交易详情, 业务方向, 投资逻辑, 市场信号 |

## 相关资源

### 参考文件

- **`references/templates.md`** - 全部 7 个领域的完整模板

### 关联 Skills

- **`../domain-knowledge/SKILL.md`** - 领域定义
- **`../analysis-methodology/SKILL.md`** - 提取方法论