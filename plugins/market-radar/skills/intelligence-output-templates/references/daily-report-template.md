# 情报日报模板

## frontmatter 结构

```yaml
---
report_type: daily
date: YYYY-MM-DD
generated_at: YYYY-MM-DDTHH:MM:SS
generated_by: intelligence-daily-writer
intelligence_count: N
domains_covered: [Domain1, Domain2, ...]
high_priority_count: N
---
```

### frontmatter 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `report_type` | string | 报告类型，固定为 `daily` |
| `date` | string | 日报日期（YYYY-MM-DD） |
| `generated_at` | datetime | 生成时间（ISO 8601） |
| `generated_by` | string | 生成 Agent ID |
| `intelligence_count` | number | 当日情报卡片总数 |
| `domains_covered` | array | 覆盖的情报领域列表 |
| `high_priority_count` | number | 重点关注情报数量（最多 5） |

---

## 正文结构

### 1. 执行摘要

以编辑点评视角撰写，自然语言段落形式：

```markdown
## 执行摘要

今日情报呈现三个值得关注的方向。厂商层面，CrowdStrike 动作密集——产品发布与融资同步推进，显示出在 AI 安全赛道上的加速姿态。威胁层面，供应链攻击持续发酵，攻防博弈的时间差值得关注。政策层面，AI 安全治理指南的出台将重塑合规格局。总体而言，AI 正在成为安全市场竞争的核心变量。
```

**写作要求**：
- 单一段落，流畅自然
- 突出趋势和关联
- 编辑点评视角，非机械汇总
- 包含：情报总体情况、关键动向概述、潜在影响提示、战略意义总结

---

### 2. 情报概览

按聚合维度组织内容，每个聚合组包含：

```markdown
## 情报概览

### {聚合标题}

{关联分析描述，自然语言段落，关键数据加粗}

- {卡片标题简述}... [[{文件名}]]
- {卡片标题简述}... [[{文件名}]]

**商业模式影响**：{仅商业模式聚合时添加}
```

**Obsidian 链接格式**：
- 从 `card_path` 提取文件名：`Vendor-Intelligence/2026/04/20260406-crowdstrike.md` → `[[20260406-crowdstrike]]`
- 使用 `[[filename]]` 格式，不含路径

---

### 3. 重点关注

筛选高价值情报（最多 5 条），每条包含深入分析：

```markdown
## 重点关注

### {重点关注标题}

{深入分析描述，200-300 字}

**关键问题**：
1. {研究问题 1}
2. {研究问题 2}
3. {研究问题 3}

**相关情报卡片**：[[{文件名}]]、[[{文件名}]]
```

**深入分析要求**：
- 提出研究问题而非重复内容
- 包含技术细节追问
- 包含对比分析建议
- 包含后续跟踪方向

---

### 4. 工作统计

数据表格格式：

```markdown
## 工作统计

| 指标 | 数量 |
|------|------|
| 新增情报卡片 | {total_count} |
| 情报领域覆盖 | {domains_count} |
| 来源数量 | {sources_count} |
| 重点关注情报 | {high_priority_count} |

**领域分布**：{从 stats.domains_distribution 生成}
```

---

## 输出路径

日报文件路径格式：

```
{output_dir}/reports/daily/{date}-daily.md
```

示例：`intelligence/reports/daily/2026-04-06-daily.md`

---

## 空报告处理

当日无情报卡片时：

```markdown
---
report_type: daily
date: 2026-04-05
generated_at: 2026-04-05T18:00:00
generated_by: intelligence-daily-writer
intelligence_count: 0
domains_covered: []
high_priority_count: 0
---

# 2026-04-05 情报日报

今日无新增情报卡片。
```