# Agent Result Format Specification

> Intelligence Analyzer Agent 轻量返回格式规范

## 设计目标

Agent 返回轻量状态 JSON，不包含情报内容详情，以减少主会话上下文占用。

## 返回格式

### 成功且有情报

```json
{
  "status": "success",
  "source_file": "docs/report.md",
  "has_strategic_value": true,
  "intelligence_count": 2,
  "output_files": [
    "Industry-Analysis/20260301-ai-security-market-growth.md"
  ],
  "source_meta": {
    "title": "原文档标题",
    "published": "2026-03-01"
  },
  "processing_notes": "成功提取 2 条情报"
}
```

### 成功但无情报

```json
{
  "status": "success",
  "source_file": "docs/general-notes.md",
  "has_strategic_value": false,
  "source_meta": {
    "title": "一般性笔记",
    "published": "2026-03-05"
  },
  "processing_notes": "未发现战略价值信息"
}
```

### 失败

```json
{
  "status": "error",
  "source_file": "docs/report.docx",
  "has_strategic_value": false,
  "source_meta": {
    "title": null,
    "published": null
  },
  "error_code": "CONVERSION_FAILED",
  "error_message": "pandoc not available for docx conversion",
  "processing_notes": "无法转换 docx 文件"
}
```

## 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `status` | string | ✅ | `success` 或 `error` |
| `source_file` | string | ✅ | 源文件相对路径 |
| `has_strategic_value` | boolean | ✅ | 是否发现战略价值情报 |
| `intelligence_count` | number | 条件 | 情报项数量（成功且有情报时必需） |
| `output_files` | array | 条件 | 输出文件路径（成功且有情报时必需） |
| `source_meta` | object | ✅ | 源文档元数据（title, published） |
| `processing_notes` | string | ✅ | 处理说明 |
| `error_code` | string | 条件 | 错误码（失败时必需） |
| `error_message` | string | 条件 | 错误详情（失败时必需） |

## 错误码

| 错误码 | 说明 |
|--------|------|
| `READ_FAILED` | 无法读取源文件 |
| `CONVERSION_FAILED` | 文件格式转换失败 |
| `WRITE_FAILED` | 写入情报卡片失败 |
| `ANALYSIS_FAILED` | 分析过程失败 |
| `TOOL_UNAVAILABLE` | 必需工具不可用 |

## 输出规则

1. 返回纯 JSON，不使用 markdown 代码块包裹
2. 文件路径相对于输出目录

## Schema 定义

完整格式定义参见 `schemas/agent-result.schema.json`。