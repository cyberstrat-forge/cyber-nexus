# 情报周报模板

## frontmatter 结构

```yaml
---
report_type: weekly
week: YYYY-WXX
date_range:
  start: YYYY-MM-DD
  end: YYYY-MM-DD
generated_at: YYYY-MM-DDTHH:MM:SS
generated_by: intelligence-weekly-writer
theme_count: N
intelligence_count: N
change_types_covered: [变化类型1, 变化类型2, ...]
---
```

### frontmatter 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `report_type` | string | 固定为 `weekly` |
| `week` | string | ISO 周格式 `YYYY-WXX` |
| `date_range` | object | 日期范围 `{start, end}` |
| `generated_at` | datetime | 生成时间 |
| `generated_by` | string | 生成 Agent ID |
| `theme_count` | number | 识别主题数量 |
| `intelligence_count` | number | 本周情报卡片总数 |
| `change_types_covered` | array | 涉及的变化类型列表 |

---

## 正文结构

### 1. 执行摘要

```markdown
## 执行摘要

{本周主题概览，3-5 句话，概括本周涌现的核心主题}
```

**写作要求**：
- 单一段落
- 突出主题间的关联
- 为执行层提供清晰的关注方向

---

### 2. 主题分析

```markdown
## 主题分析

### 主题一：{主题标题}

{主题分析段落，综合本周多篇日报的相关内容，200-300 字}

**涉及变化类型**：{变化类型1}、{变化类型2}

**相关日报**：
- [[YYYY-MM-DD-daily|MM-DD 日报]] — {一句话说明}
- [[YYYY-MM-DD-daily|MM-DD 日报]] — {一句话说明}

**相关情报**：[[{文件名}|{标题}]]、[[{文件名}|{标题}]]

### 主题二：{主题标题}
{同上结构}
```

**变化类型标注要求**：
- 每个主题必须标注涉及的变化类型
- 从以下六种选择：新威胁出现、市场格局变化、技术突破与应用、客户需求演变、合规压力变化、资本动向
- 支撑月报按变化类型聚合

---

### 3. 重点关注

```markdown
## 重点关注

### {重点关注标题}
{深入分析，300-500 字}

**关键启示**：{启发性提示}

### {其他重点关注}
{同上结构，3-4 条}
```

---

### 4. 下钻索引

```markdown
## 下钻索引

### 本周日报

| 日期 | 标题 | 主题 |
|------|------|------|
| [[YYYY-MM-DD-daily|MM-DD]] | ... | {主题1}、{主题2} |

### 高价值情报卡片

**主题一**：
- [[{文件名}|{标题}]] — {一句话说明}

**主题二**：
- [[{文件名}|{标题}]] — {一句话说明}
```

---

### 5. 工作统计

```markdown
## 工作统计

| 指标 | 数量 |
|------|------|
| 本周情报卡片 | N |
| 日报覆盖 | 7/7 |
| 识别主题 | N |
| 重点关注 | N |

**主题分布**：{各主题涉及的情报数量}

**变化类型分布**：{各变化类型的情报数量}
```

---

## 主题提炼指南

### 语义分析方法

1. 读取本周 7 天日报全文
2. 识别跨日报的模式和关联
3. 提炼主题并回溯相关日报
4. 标注变化类型

### 主题数量动态调整

| 情报量 | 主题数量 |
|--------|----------|
| < 10 条 | 2-3 个 |
| 10-30 条 | 3-5 个 |
| > 30 条 | 5-7 个 |

---

## 输出路径

周报文件路径格式：

```
{output_dir}/reports/weekly/{YYYY}-W{XX}-weekly.md
```

示例：`intelligence/reports/weekly/2026-W15-weekly.md`

---

## 空报告处理

本周无日报或无情报卡片时：

```markdown
---
report_type: weekly
week: 2026-W15
date_range:
  start: 2026-04-07
  end: 2026-04-13
generated_at: 2026-04-13T18:00:00
generated_by: intelligence-weekly-writer
theme_count: 0
intelligence_count: 0
change_types_covered: []
---

# 情报周报 | 2026-W15

本周无日报或无情报卡片。
```