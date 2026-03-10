# JSON Output Format Specification

> Intelligence Analyzer Agent 输出格式规范

## 完整输出结构

```json
{
  "source_file": "relative/path/to/file.md",
  "has_strategic_value": true,
  "intelligence_items": [
    {
      "domain": "Domain-Identifier",
      "title": "简洁的情报标题",
      "filename": "YYYYMMDD-subject-feature.md",
      "keywords": ["关键词1", "关键词2", "关键词3"],
      "dedup_check": {
        "primary_entity": "主要实体名称",
        "timeframe": "YYYY-MM",
        "key_facts": [
          "关键事实1",
          "关键事实2"
        ]
      },
      "frontmatter": {
        "title": "情报标题",
        "source_file": "[[relative/path/to/source.md]]",
        "intelligence_date": "YYYY-MM-DD",
        "created_date": "YYYY-MM-DD",
        "primary_domain": "Domain-Identifier",
        "secondary_domains": [],
        "security_relevance": "high | medium",
        "domain_specific_field": "value",
        "review_status": "pending",
        "generated_by": "intelligence-analyzer",
        "generated_session": "SESSION_ID"
      },
      "content": "## 核心事实\n\n[提炼后的情报]\n\n> \"[关键引用]\"\n\n**战略意义**：[战略影响]\n\n## 数据支撑\n- [具体数据点]\n\n## 原文关键引用\n### [引用主题]\n> \"[原文语句]\"\n> — 第 X-Y 行\n\n## 相关情报\n- [[related/path.md]]",
      "review_needed": false,
      "review_notes": null
    }
  ],
  "source_meta": {
    "title": "原文档标题",
    "published": "YYYY-MM-DD 或 null"
  },
  "processing_notes": "任何相关的处理说明"
}
```

---

## 字段说明

### 顶层字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `source_file` | string | ✅ | 源文件相对路径 |
| `has_strategic_value` | boolean | ✅ | 是否发现战略价值情报 |
| `intelligence_items` | array | ✅ | 情报项数组（可为空） |
| `source_meta` | object | ✅ | 源文档元数据 |
| `processing_notes` | string | ✅ | 处理说明 |

### source_meta 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string \| null | 原文档标题 |
| `published` | string \| null | 源文档发布日期（YYYY-MM-DD 格式） |

---

## 日期字段说明

### intelligence_date（情报日期）

**定义**：源文件的发布日期，代表情报内容本身的时效性。

**来源优先级**：
1. Markdown frontmatter 中的 `date` 或 `published` 字段
2. PDF 元数据中的 `CreationDate`
3. 文件名中的日期模式（如 `2026-03-01-report.md`）
4. 文件添加日期（`source_file_added_date`）

**用途**：
- 情报卡片的 `intelligence_date` frontmatter 字段
- 文件名日期前缀（转换为 YYYYMMDD 格式）

### created_date（创建日期）

**定义**：情报卡片的生成日期（处理日期）。

**用途**：
- 记录情报何时被提取和处理
- 与 `intelligence_date` 区分，便于追溯

### source_published_date（源文件发布日期）

由命令传入，从源文件提取的发布日期。可能为 `null`（无法提取时）。

### source_file_added_date（源文件添加日期）

由命令传入，文件被添加到源文件夹的日期（文件系统 ctime）。作为发布日期的备选。

---

### intelligence_items 字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `domain` | string | ✅ | 领域标识符 |
| `title` | string | ✅ | 情报标题 |
| `filename` | string | ✅ | 建议文件名（格式：`YYYYMMDD-subject-feature.md`） |
| `keywords` | array | ✅ | 关键词列表（3-5个） |
| `dedup_check` | object | ✅ | 去重检查信息 |
| `frontmatter` | object | ✅ | Markdown frontmatter |
| `content` | string | ✅ | Markdown 正文内容 |
| `review_needed` | boolean | ✅ | 是否需要人工审核 |
| `review_notes` | string | ❌ | 审核备注 |

### dedup_check 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `primary_entity` | string | 主要实体名称（公司、技术、组织等） |
| `timeframe` | string | 时间范围（YYYY-MM） |
| `key_facts` | array | 关键事实列表（2-3条） |

### frontmatter 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 情报标题 |
| `source_file` | string | 源文件链接（WikiLink 格式） |
| `intelligence_date` | string | 情报日期（源文件发布日期，YYYY-MM-DD 格式） |
| `created_date` | string | 创建日期（处理日期，YYYY-MM-DD 格式） |
| `primary_domain` | string | 主要领域 |
| `secondary_domains` | array | 次要领域 |
| `security_relevance` | string | 安全关联度（high/medium） |
| `review_status` | string | 审核状态（固定为 pending） |
| `generated_by` | string | 生成者（固定为 intelligence-analyzer） |
| `generated_session` | string | 会话 ID |

---

## 领域标识符

| 标识符 | 领域 |
|--------|------|
| `Threat-Landscape` | 威胁态势 |
| `Industry-Analysis` | 行业分析 |
| `Vendor-Intelligence` | 厂商情报 |
| `Emerging-Tech` | 新兴技术 |
| `Customer-Market` | 客户与市场 |
| `Policy-Regulation` | 政策法规 |
| `Capital-Investment` | 资本动态 |

---

## 特殊情况

### 未发现战略价值

```json
{
  "source_file": "path/to/file.md",
  "has_strategic_value": false,
  "intelligence_items": [],
  "source_meta": {
    "title": "文档标题",
    "published": null
  },
  "processing_notes": "未发现战略价值的原因说明"
}
```

---

## 输出规则

1. **必须返回纯 JSON**：不要使用 markdown 代码块包裹
2. **字段顺序无关**：但必须包含所有必需字段
3. **空数组使用 `[]`**：不要使用 `null`
4. **字符串使用双引号**：遵循 JSON 标准
5. **布尔值使用小写**：`true` / `false`