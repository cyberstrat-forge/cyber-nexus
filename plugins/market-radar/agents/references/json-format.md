# Agent Result Format Specification

> Intelligence Analyzer Agent 轻量返回格式规范 (v2.0)

## 设计目标

Agent 返回轻量状态 JSON，不包含情报内容详情，以减少主会话上下文占用。

## 返回格式

### 成功且有情报（自动批准）

```json
{
  "status": "success",
  "source_file": "converted/2026/03/report.md",
  "has_strategic_value": true,
  "intelligence_count": 2,
  "intelligence_ids": [
    "threat-intelligence-20260313-001",
    "threat-intelligence-20260313-002"
  ],
  "output_files": [
    "threat-intelligence/20260313-threat-analysis.md"
  ],
  "cards": [
    {
      "intelligence_id": "threat-intelligence-20260313-001",
      "primary_domain": "Threat-Landscape",
      "output_file": "threat-intelligence/20260313-threat-analysis.md",
      "title": "威胁分析报告"
    }
  ],
  "source_meta": {
    "title": "原文档标题",
    "published": "2026-03-01"
  },
  "processing_notes": "成功提取 2 条情报"
}
```

### 成功但无情报（无价值）

```json
{
  "status": "success",
  "source_file": "converted/2026/03/general-notes.md",
  "has_strategic_value": false,
  "source_meta": {
    "title": "一般性笔记",
    "published": "2026-03-05"
  },
  "processing_notes": "未发现战略价值信息"
}
```

### 成功但需要复核（待审核）

```json
{
  "status": "success",
  "source_file": "converted/2026/03/suspicious-report.md",
  "has_strategic_value": null,
  "review_reason": "检测到高风险威胁指标，需人工确认",
  "source_meta": {
    "title": "可疑报告",
    "published": "2026-03-10"
  },
  "processing_notes": "需要人工复核后决定是否生成情报卡片"
}
```

### 失败

```json
{
  "status": "error",
  "source_file": "converted/2026/03/report.docx",
  "has_strategic_value": false,
  "source_meta": {
    "title": null,
    "published": null
  },
  "error_code": "ANALYSIS_FAILED",
  "error_message": "Unable to extract meaningful content",
  "processing_notes": "分析失败"
}
```

## 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `status` | string | ✅ | `success` 或 `error` |
| `source_file` | string | ✅ | 源文件相对路径（converted 目录下） |
| `has_strategic_value` | boolean/null | ✅ | `true`=有情报，`false`=无情报，`null`=需复核 |
| `review_reason` | string | 条件 | 需要复核的原因（`has_strategic_value=null` 时必需） |
| `intelligence_count` | number | 条件 | 情报项数量（成功且有情报时必需，不设上限） |
| `intelligence_ids` | array | 条件 | 情报卡片 ID 列表（成功且有情报时必需） |
| `output_files` | array | 条件 | 输出文件路径（成功且有情报时必需） |
| `cards` | array | 条件 | 情报卡片详情列表（成功且有情报时必需） |
| `source_meta` | object | ✅ | 源文档元数据（title, published） |
| `processing_notes` | string | ✅ | 处理说明 |
| `error_code` | string | 条件 | 错误码（失败时必需） |
| `error_message` | string | 条件 | 错误详情（失败时必需） |

## has_strategic_value 三种值

| 值 | 含义 | 后续操作 |
|-----|------|---------|
| `true` | 明确有战略价值 | 自动生成情报卡片 |
| `false` | 明确无战略价值 | 不生成卡片，永久跳过 |
| `null` | 需要人工复核 | 加入 `review.items` 队列，等待审核 |

## 错误码

| 错误码 | 说明 |
|--------|------|
| `READ_FAILED` | 无法读取源文件 |
| `CONVERSION_FAILED` | 文件格式转换失败 |
| `WRITE_FAILED` | 写入情报卡片失败 |
| `ANALYSIS_FAILED` | 分析过程失败 |
| `TOOL_UNAVAILABLE` | 必需工具不可用 |

## intelligence_id 格式

```
{domain-prefix}-{YYYYMMDD}-{seq}

例如：
- threat-intelligence-20260313-001
- market-trends-20260313-002
- technology-innovation-20260313-003
```

**domain-prefix 映射关系**：

| Schema Domain | ID 前缀 | 文件路径 |
|---------------|---------|----------|
| Threat-Landscape | threat-intelligence | threat-intelligence |
| Industry-Analysis | market-trends | market-trends |
| Vendor-Intelligence | vendor-intelligence | vendor-intelligence |
| Emerging-Tech | technology-innovation | technology-innovation |
| Customer-Market | customer-market | customer-market |
| Policy-Regulation | policy-regulation | policy-regulation |
| Capital-Investment | capital-investment | capital-investment |

## pending_id 格式（待审核项）

```
pending-{domain-prefix}-{YYYYMMDD}-{seq}

例如：
- pending-threat-intelligence-20260313-001
- pending-technology-innovation-20260313-002
```

## 输出规则

1. 返回纯 JSON，不使用 markdown 代码块包裹
2. 文件路径相对于输出目录
3. 当 `has_strategic_value` 为 `null` 时，必须提供 `review_reason`

## Schema 定义

完整格式定义参见 `schemas/agent-result.schema.json`。