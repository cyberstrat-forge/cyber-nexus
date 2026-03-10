# Agent Result Format Specification

> Intelligence Analyzer Agent 轻量返回格式规范

## 设计目标

Agent 返回轻量状态 JSON，不包含情报内容详情，以减少主会话上下文占用。

---

## 返回格式

### 成功且有情报

```json
{
  "status": "success",
  "source_file": "docs/report.md",
  "has_strategic_value": true,
  "intelligence_count": 2,
  "output_files": [
    "Industry-Analysis/20260301-ai-security-market-growth.md",
    "Emerging-Tech/20260301-ai-agent-architecture-flaw.md"
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

---

## 字段说明

### 顶层字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `status` | string | ✅ | 处理状态：`success` 或 `error` |
| `source_file` | string | ✅ | 源文件相对路径 |
| `has_strategic_value` | boolean | ✅ | 是否发现战略价值情报 |
| `intelligence_count` | number | 条件 | 情报项数量（status=success 且 has_strategic_value=true 时必需） |
| `output_files` | array | 条件 | 输出文件路径列表（status=success 且 has_strategic_value=true 时必需） |
| `source_meta` | object | ✅ | 源文档元数据 |
| `processing_notes` | string | ✅ | 处理说明 |
| `error_code` | string | 条件 | 错误码（status=error 时必需） |
| `error_message` | string | 条件 | 错误详情（status=error 时必需） |

### source_meta 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string \| null | 原文档标题 |
| `published` | string \| null | 源文档发布日期（YYYY-MM-DD 格式） |

---

## 错误码定义

| 错误码 | 说明 |
|--------|------|
| `READ_FAILED` | 无法读取源文件 |
| `CONVERSION_FAILED` | 文件格式转换失败（如 pandoc 不可用） |
| `WRITE_FAILED` | 写入情报卡片失败 |
| `ANALYSIS_FAILED` | 分析过程失败 |
| `TOOL_UNAVAILABLE` | 必需工具不可用 |

---

## 与旧格式的对比

| 项目 | 旧格式 | 新格式 |
|------|--------|--------|
| 返回内容 | 完整情报内容 | 仅状态信息 |
| 单条情报 | ~1.5KB | ~0.1KB |
| 10 条情报 | ~15KB | ~1KB |
| 情报卡片生成 | intel-distill 负责 | Agent 直接写入 |

**上下文节省**：约 90%+

---

## 输出规则

1. **必须返回纯 JSON**：不要使用 markdown 代码块包裹
2. **status 必须准确**：成功用 `success`，失败用 `error`
3. **错误信息完整**：失败时必须包含 `error_code` 和 `error_message`
4. **文件路径相对**：`output_files` 中的路径相对于输出目录

---

## Schema 校验

返回格式由 `schemas/agent-result.schema.json` 定义，校验脚本：

```bash
npx tsx validate-json.ts agent-result ./result.json
```

校验内容包括：
- status 字段有效性
- 必需字段完整性
- 条件字段存在性（根据 status 和 has_strategic_value）
- 错误码有效性