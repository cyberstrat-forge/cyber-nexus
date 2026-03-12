---
name: Thematic Methodology
description: This skill should be used when the theme-analyzer agent needs guidance on analyzing intelligence cards within a theme, identifying trends, and generating analysis materials.
version: 1.0.0
---

## 概述

主题分析方法论，指导如何对已聚类的情报卡片进行深度分析，识别趋势、模式和洞察。

## 分析流程

### 1. 信息收集

阅读该主题下所有情报卡片，提取：

- **时间维度**：`intelligence_date` 分布
- **领域分布**：`primary_domain`, `secondary_domains`
- **关键实体**：厂商名、威胁组织、技术名
- **核心事实**：每张卡片的 `## 核心事实` 章节
- **数据支撑**：具体数字、比例、金额

### 2. 趋势分析

#### 2.1 时间趋势

分析情报的时间分布：

```
1. 统计每月/每周情报数量
2. 识别增长/下降趋势
3. 检测异常峰值
4. 分析趋势变化原因
```

#### 2.2 热度趋势

分析关键词和实体的热度变化：

```
1. 统计关键词出现频次
2. 对比早期与近期的关键词变化
3. 识别新兴关键词和消退关键词
```

### 3. 关联分析

#### 3.1 实体关联

构建实体关系网络：

```
厂商 ↔ 产品 ↔ 技术
威胁组织 ↔ 攻击手法 ↔ 目标行业
投资方 ↔ 被投公司 ↔ 业务领域
```

#### 3.2 跨领域关联

分析本主题涉及的领域间关系：

```
例如 AI 安全主题：
- Emerging-Tech ↔ Threat-Landscape（新技术带来新威胁）
- Vendor-Intelligence ↔ Capital-Investment（厂商融资驱动技术发展）
```

### 4. 洞察提炼

根据分析维度提炼洞察：

#### 威胁类主题（Threat-Landscape）

| 维度 | 分析内容 |
|------|----------|
| 威胁行为者 | 活跃组织、攻击偏好、演变趋势 |
| 攻击手法 | 新技术、工具变化、防御难点 |
| 目标分析 | 行业偏好、地区分布、规模特征 |
| 影响评估 | 经济损失、数据泄露、业务中断 |

#### 技术类主题（Emerging-Tech）

| 维度 | 分析内容 |
|------|----------|
| 技术成熟度 | 概念→早期→成长→成熟演变 |
| 应用场景 | 适用行业、部署模式、落地进展 |
| 代表厂商 | 产品能力、市场份额、差异化 |
| 安全影响 | 新攻击面、防御能力提升 |

#### 市场类主题（Industry-Analysis, Vendor-Intelligence）

| 维度 | 分析内容 |
|------|----------|
| 市场规模 | 当前规模、增长率、预测数据 |
| 竞争格局 | 主要玩家、市场份额、差异化策略 |
| 客户需求 | 痛点变化、预算趋势、决策因素 |
| 资本动态 | 融资事件、估值变化、投资热点 |

## 分析维度详解

### threat_actor（威胁行为者）

跟踪内容：
- 威胁组织名称、别名
- 活动时间线
- 攻击目标偏好
- 技术能力评估
- 与其他组织的关联

### attack_method（攻击手法）

跟踪内容：
- 攻击技术名称
- 利用工具
- 目标漏洞（CVE）
- 检测难点
- 防御建议

### vendor_name（厂商名称）

跟踪内容：
- 公司基本情况
- 产品矩阵
- 财务表现
- 战略动向
- 市场地位

### market_size（市场规模）

跟踪内容：
- 当前市场规模
- 历史增长率
- 预测数据
- 区域分布
- 细分领域占比

### maturity（技术成熟度）

跟踪内容：
- 技术发展阶段
- 采用率变化
- 标准化进展
- 生态完善度

## 输出格式

分析材料输出 JSON：

```json
{
  "theme_id": "ai-security",
  "theme_name": "AI 安全",
  "analysis_date": "2026-03-12T10:30:00Z",
  "card_count": 25,
  "date_range": {
    "start": "2025-06-01",
    "end": "2026-03-10"
  },
  "summary": "主题分析摘要，1-3 句话",
  "trends": {
    "time_trend": {
      "direction": "increasing",
      "description": "情报数量呈上升趋势，近3个月增长40%",
      "monthly_counts": {"2025-12": 5, "2026-01": 8, "2026-02": 10, "2026-03": 7}
    },
    "emerging_keywords": ["提示注入", "AI Agent 安全"],
    "declining_keywords": ["对抗样本"]
  },
  "entities": {
    "vendors": [
      {"name": "OpenAI", "mentions": 8, "key_points": ["发布安全指南", "Red Team 测试"]},
      {"name": "Anthropic", "mentions": 5, "key_points": ["Constitutional AI"]}
    ],
    "threat_actors": [],
    "technologies": [
      {"name": "LLM", "mentions": 15},
      {"name": "Prompt Injection", "mentions": 12}
    ]
  },
  "cross_domain_links": [
    {"domains": ["Emerging-Tech", "Threat-Landscape"], "insight": "AI 技术发展带来新的攻击面"}
  ],
  "key_findings": [
    "发现1：AI 安全市场快速增长，年增长率超过 30%",
    "发现2：提示注入成为最受关注的 AI 安全威胁",
    "发现3：大模型厂商普遍加强安全能力建设"
  ],
  "strategic_implications": [
    "建议1：关注 AI 安全产品投资机会",
    "建议2：建立 AI 安全测试能力",
    "建议3：跟踪监管政策进展"
  ],
  "data_points": [
    {"type": "market_size", "value": "50亿美元", "source": "Gartner 报告"},
    {"type": "growth_rate", "value": "35% YoY", "source": "行业分析"}
  ],
  "source_cards": ["path/to/card1.md", "path/to/card2.md"]
}
```

## 质量检查

分析完成后执行：

- [ ] 所有卡片都已分析
- [ ] 趋势分析有数据支撑
- [ ] 关键发现至少 3 条
- [ ] 战略建议可执行
- [ ] 数据来源可追溯

## 参考文件

- **`references/dimensions.md`** - 分析维度详细定义和操作指导