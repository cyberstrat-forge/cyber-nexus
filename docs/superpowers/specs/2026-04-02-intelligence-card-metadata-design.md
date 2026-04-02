# 情报卡片元数据优化设计

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 优化情报卡片 frontmatter 结构，继承 intel-pull 采集元数据，建立完整的来源追溯

**架构：** 四组层次结构 - 核心标识 → item 来源追溯 → 情报源追溯 → 处理状态

**技术栈：** TypeScript, JSON Schema, Markdown frontmatter

---

## 背景

### 问题

当前情报卡片生成过程中，intel-pull 采集的有价值元数据未传递到情报卡片：

| 采集元数据 | 当前状态 |
|-----------|---------|
| `source_id`, `source_name`, `source_url` | ❌ 丢失 |
| `source_tier`, `source_score` | ❌ 丢失 |
| `author` | ❌ 丢失 |
| `published_at`, `fetched_at` | ❌ 丢失 |
| `completeness_score` | ❌ 丢失 |

### 目标

- 情报卡片继承采集元数据作为追溯信息
- 为后续主题分析预留数据基础（辅助决策）
- 建立逻辑清晰的 frontmatter 结构

---

## 设计方案

### 四组层次结构

```
┌─────────────────────────────────────────────────────────────┐
│ 第一组：核心标识                                              │
├─────────────────────────────────────────────────────────────┤
│ intelligence_id    - 情报卡片唯一标识（生成）                 │
│ title              - 情报卡片标题（生成）                     │
│ created_date       - 卡片生成日期（生成）                     │
│ primary_domain     - 主领域（生成）                           │
│ secondary_domains  - 次领域列表（生成）                       │
│ security_relevance - 安全相关性 high/medium（生成）           │
│ tags               - 关键词列表（继承 + 生成）                │
│                    - 包含：geo_scope, business_model_tags 等 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 第二组：item 来源追溯                                         │
├─────────────────────────────────────────────────────────────┤
│ item_id            - 采集阶段标识（继承）                     │
│ item_title         - item 标题（继承）                       │
│ author             - 作者（继承）                             │
│ original_url       - 原文链接（继承）                         │
│ published_at       - 原文发布时间（继承）                     │
│ fetched_at         - 采集时间（继承）                         │
│ completeness_score - 完整度 0-1（继承）                       │
│ archived_file      - 归档文件链接 WikiLink（预处理生成）      │
│ converted_file     - 转换文件链接 WikiLink（预处理生成）      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 第三组：情报源追溯                                            │
├─────────────────────────────────────────────────────────────┤
│ source_id          - 情报源 ID（继承）                        │
│ source_name        - 情报源名称（继承）                       │
│ source_url         - 情报源 URL（继承）                       │
│ source_tier        - 情报源等级 T0-T3（继承）                 │
│ source_score       - 情报源评分 0-100（继承）                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 第四组：处理状态                                              │
├─────────────────────────────────────────────────────────────┤
│ review_status      - 审核状态 pending/approved/rejected      │
└─────────────────────────────────────────────────────────────┘
```

---

## 字段定义

### 第一组：核心标识

| 字段 | 类型 | 必填 | 来源 | 说明 |
|------|------|------|------|------|
| `intelligence_id` | string | ✅ | 生成 | 格式：`{domain_prefix}-{YYYYMMDD}-{seq}` |
| `title` | string | ✅ | 生成 | 情报卡片标题（可能与 item_title 不同） |
| `created_date` | date | ✅ | 生成 | 格式：YYYY-MM-DD |
| `primary_domain` | enum | ✅ | 生成 | 七大领域之一 |
| `secondary_domains` | array | ✅ | 生成 | 次领域列表（可为空） |
| `security_relevance` | enum | ✅ | 生成 | `high` 或 `medium` |
| `tags` | array | ✅ | 继承+生成 | 关键词列表，合并采集 tags + 分析生成 |

**tags 字段说明：**

tags 是一个统一的关键词列表，包含但不限于：
- `geo_scope` 的值（如 `china`, `global`）
- `business_model_tags` 的值（如 `SaaS`, `MSSP`）
- 分析生成的关键词（如 `APT`, `ransomware`）

示例：
```yaml
tags: ["china", "SaaS", "APT", "ransomware", "cloud-security"]
```

---

### 第二组：item 来源追溯

| 字段 | 类型 | 必填 | 来源 | 说明 |
|------|------|------|------|------|
| `item_id` | string | ✅ | 继承 | 格式：`item_{8位hex}` |
| `item_title` | string | ✅ | 继承 | 采集阶段的原始标题 |
| `author` | string | ❌ | 继承 | 作者信息（可选） |
| `original_url` | string | ❌ | 继承 | 原文链接（可选） |
| `published_at` | datetime | ❌ | 继承 | ISO 8601 格式（可选） |
| `fetched_at` | datetime | ✅ | 继承 | ISO 8601 格式 |
| `completeness_score` | number | ❌ | 继承 | 0-1 之间的浮点数 |
| `archived_file` | string | ✅ | 预处理 | WikiLink 格式 |
| `converted_file` | string | ✅ | 预处理 | WikiLink 格式 |

**WikiLink 格式示例：**
```yaml
archived_file: "[[archive/2026/04/report-2026.pdf]]"
converted_file: "[[converted/2026/04/report-2026.md]]"
```

---

### 第三组：情报源追溯

| 字段 | 类型 | 必填 | 来源 | 说明 |
|------|------|------|------|------|
| `source_id` | string | ❌ | 继承 | 情报源 ID（可选） |
| `source_name` | string | ❌ | 继承 | 情报源名称（可选） |
| `source_url` | string | ❌ | 继承 | 情报源 URL（可选） |
| `source_tier` | enum | ❌ | 继承 | T0/T1/T2/T3（可选） |
| `source_score` | number | ❌ | 继承 | 0-100（可选） |

**source_tier 等级说明：**
- T0: 最高优先级，官方权威来源
- T1: 高优先级，知名安全厂商/研究机构
- T2: 中等优先级，行业媒体/分析师
- T3: 低优先级，一般来源

---

### 第四组：处理状态

| 字段 | 类型 | 必填 | 来源 | 说明 |
|------|------|------|------|------|
| `review_status` | enum | ❌ | 生成 | `pending`/`approved`/`rejected` |

---

## 数据流

### 元数据传递路径

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: intel-pull 采集                                    │
├─────────────────────────────────────────────────────────────┤
│ 生成元数据：                                                  │
│ • id, title, body, url, author, tags                         │
│ • published_at, fetched_at                                   │
│ • source.id, source.name, source.url, source.tier, source.score│
│ • completeness_score, word_count                             │
│                                                             │
│ 写入 inbox/*.md 文件 frontmatter                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: 预处理转换                                          │
├─────────────────────────────────────────────────────────────┤
│ 保留：inbox 文件的所有 frontmatter                            │
│                                                             │
│ 新增元数据：                                                  │
│ • content_hash (正文 MD5)                                    │
│ • archived_file, converted_file                             │
│                                                             │
│ 写入 converted/YYYY/MM/*.md 文件 frontmatter                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: intelligence-analyzer 分析                         │
├─────────────────────────────────────────────────────────────┤
│ 读取：converted 文件 frontmatter（继承采集元数据）            │
│                                                             │
│ 生成元数据：                                                  │
│ • intelligence_id, title, created_date                       │
│ • primary_domain, secondary_domains                          │
│ • security_relevance, tags                                   │
│ • review_status                                              │
│                                                             │
│ 写入情报卡片 frontmatter（融合继承 + 生成）                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 变更影响

### 需要修改的文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `schemas/intelligence-output.schema.json` | 修改 | 更新 frontmatter 字段定义 |
| `agents/intelligence-analyzer.md` | 修改 | 更新元数据读取和写入逻辑 |
| `skills/intelligence-output-templates/SKILL.md` | 修改 | 更新模板结构 |
| `skills/intelligence-output-templates/references/templates.md` | 修改 | 更新七大领域模板 |
| `commands/intel-distill.md` | 修改 | 更新文档中的 frontmatter 说明 |

### 向后兼容

现有情报卡片无需迁移，新卡片采用新结构。后续主题分析可根据字段是否存在进行兼容处理。

---

## 示例

### 完整情报卡片 Frontmatter

```yaml
---
# ============================================
# 第一组：核心标识
# ============================================
intelligence_id: "threat-intelligence-20260402-001"
title: "APT组织Lazarus利用新型恶意软件攻击金融机构"
created_date: "2026-04-02"
primary_domain: "Threat-Landscape"
secondary_domains: ["Vendor-Intelligence"]
security_relevance: "high"
tags: ["china-primary", "APT", "Lazarus", "financial-sector", "malware"]

# ============================================
# 第二组：item 来源追溯
# ============================================
item_id: "item_a1b2c3d4"
item_title: "Lazarus Group's New Malware Campaign Targets Financial Institutions"
author: "Security Research Team"
original_url: "https://example.com/security/lazarus-malware-2026"
published_at: "2026-04-01T08:00:00Z"
fetched_at: "2026-04-01T10:30:00Z"
completeness_score: 0.92
archived_file: "[[archive/2026/04/20260401-item_a1b2c3d4.md]]"
converted_file: "[[converted/2026/04/20260401-item_a1b2c3d4.md]]"

# ============================================
# 第三组：情报源追溯
# ============================================
source_id: "src_securityweekly"
source_name: "Security Weekly"
source_url: "https://securityweekly.com"
source_tier: "T1"
source_score: 85

# ============================================
# 第四组：处理状态
# ============================================
review_status: null
---
```

---

## 后续扩展

### 主题分析集成（未来）

在后续的主题分析功能中，采集元数据可用于辅助决策：

- `source_tier` + `source_score` → 情报可信度权重
- `published_at` vs `fetched_at` → 情报时效性评估
- `tags` → 领域分类辅助验证

---

## 自检清单

### 1. 覆盖完整性

| 需求 | 状态 |
|------|------|
| 继承 source_id, source_name, source_url | ✅ 第三组 |
| 继承 source_tier, source_score | ✅ 第三组 |
| 继承 author | ✅ 第二组 |
| 继承 published_at, fetched_at | ✅ 第二组 |
| 继承 completeness_score | ✅ 第二组 |
| 保留 item_id 追溯 | ✅ 第二组 |
| 保留 archived_file, converted_file | ✅ 第二组 |

### 2. 结构清晰性

- ✅ 四组层次分明：核心标识 → item 追溯 → 源追溯 → 处理状态
- ✅ 字段命名一致：使用下划线分隔
- ✅ 必填/可选明确标记

### 3. 可扩展性

- ✅ tags 字段支持灵活扩展
- ✅ 可选字段允许缺失（兼容非 cyber-pulse 来源）
- ✅ 为后续主题分析预留数据基础