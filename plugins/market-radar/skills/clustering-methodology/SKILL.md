---
name: Clustering Methodology
description: This skill should be used when the intelligence-cluster agent needs guidance on clustering intelligence cards to themes, detecting new themes, and determining card-theme assignments.
version: 1.0.0
---

## 概述

情报聚类方法论，指导如何将情报卡片分配到合适的主题，以及如何检测新主题。

## 聚类流程

### 1. 读取卡片内容

阅读情报卡片的以下部分：

- **Frontmatter 元数据**：`title`, `primary_domain`, `secondary_domains`, `intelligence_date`, 领域特定字段
- **正文核心事实**：`## 核心事实` 章节
- **关键词提取**：标题和正文中的关键实体名称

### 2. 主题匹配

对每张卡片，按以下规则匹配主题：

#### 2.1 领域匹配

检查卡片的 `primary_domain` 和 `secondary_domains` 是否在主题的 `domains` 列表中：

```
如果 primary_domain ∈ theme.domains → 基础分 +0.3
如果 secondary_domains ∩ theme.domains ≠ ∅ → 附加分 +0.1
```

#### 2.2 关键词匹配

检查卡片标题和正文是否包含主题关键词：

```
对于 theme.keywords 中的每个关键词：
  如果出现在标题 → 分数 +0.2
  如果出现在正文 → 分数 +0.1
```

#### 2.3 实体匹配

检查卡片中的实体是否匹配主题的 `match_rules.entity_patterns`：

```
如果卡片提及 entity_patterns 中的实体 → 分数 +0.15
```

#### 2.4 计算最终置信度

```
confidence = min(1.0, 基础分 + 关键词分 + 实体分)
```

### 3. 分配决策

根据置信度决定卡片归属：

| 置信度范围 | 决策 |
|-----------|------|
| >= 0.7 | 明确分配到该主题 |
| 0.4 - 0.7 | 边缘情况，标记为候选主题 |
| < 0.4 | 不分配到该主题 |

**多主题情况**：
- 一张卡片可以属于多个主题（置信度都 >= 0.7）
- 记录所有候选主题供后续确认

### 4. 新主题检测

当以下情况发生时，考虑推荐新主题：

#### 4.1 触发条件

```
1. 存在 >= min_cards 张未分配卡片（置信度 < 0.4）
2. 这些卡片有相似的特征：
   - 相同或相近的 primary_domain
   - 共同的关键词或实体
   - 相似的内容主题
```

#### 4.2 检测方法

分析未分配卡片的共同特征：

```
1. 统计 primary_domain 分布
2. 提取高频关键词（出现 >= 3 次）
3. 识别共同实体
4. 归纳内容主题
```

#### 4.3 推荐格式

```json
{
  "suggested_theme_id": "suggested-theme-slug",
  "name": "建议的主题名称",
  "description": "主题描述",
  "keywords": ["关键词1", "关键词2"],
  "domains": ["相关领域"],
  "supporting_cards": ["card1.md", "card2.md"],
  "confidence": 0.85
}
```

## 领域特定指导

### Threat-Landscape 相关主题

聚类时重点关注：
- 威胁行为者名称（`threat_actor`）
- 攻击类型（`threat_type`）
- 目标行业和地区

常见主题：
- 勒索软件威胁
- APT 组织活动
- 供应链攻击
- 零日漏洞利用

### Emerging-Tech 相关主题

聚类时重点关注：
- 技术名称（`tech_name`）
- 成熟度（`maturity`）
- 应用场景

常见主题：
- AI 安全
- 云安全
- 零信任架构
- XDR/EDR

### Vendor-Intelligence 相关主题

聚类时重点关注：
- 厂商名称（`vendor_name`）
- 业务领域（`business_area`）
- 产品动态

常见主题：
- 安全厂商动态
- 创业公司观察
- 并购整合

## 边界情况处理

### 情报跨多个主题

当卡片同时匹配多个主题时：

```
1. 列出所有候选主题及置信度
2. 如果都是强匹配（>= 0.7），分配到多个主题
3. 如果置信度相近，优先选择 primary_domain 匹配的主题
```

### 情报与主题定义不符

当卡片主题匹配但内容不符时：

```
1. 降低置信度
2. 记录不匹配原因
3. 考虑是否需要调整主题配置
```

### 新兴情报无法聚类

当发现新的情报模式时：

```
1. 收集相似卡片
2. 分析共同特征
3. 推荐新主题给用户确认
```

## 输出格式

聚类结果返回 JSON：

```json
{
  "clustered": [
    {
      "card_path": "Threat-Landscape/20260301-lockbit-ransomware.md",
      "assigned_themes": ["ransomware-threats"],
      "confidence": {"ransomware-threats": 0.85}
    }
  ],
  "edge_cases": [
    {
      "card_path": "Emerging-Tech/20260301-ai-cloud-security.md",
      "candidate_themes": ["ai-security", "cloud-security"],
      "confidence": {"ai-security": 0.55, "cloud-security": 0.52},
      "reason": "内容涉及两个主题，置信度相近"
    }
  ],
  "unclustered": [
    {
      "card_path": "Industry-Analysis/20260301-iot-security-market.md",
      "reason": "无匹配主题"
    }
  ],
  "suggested_new_themes": [
    {
      "suggested_theme_id": "iot-security",
      "name": "IoT 安全",
      "description": "物联网安全市场、技术和威胁动态",
      "keywords": ["IoT安全", "物联网安全", "OT安全"],
      "domains": ["Emerging-Tech", "Industry-Analysis"],
      "supporting_cards": ["..."],
      "confidence": 0.8
    }
  ]
}
```

## 质量检查

聚类完成后执行：

- [ ] 每张卡片都有聚类结果（分配/边缘/未分配）
- [ ] 置信度计算正确
- [ ] 多主题分配合理
- [ ] 新主题推荐有足够支持（>= min_cards 张卡片）

## 参考文件

- **`references/domain-guidance.md`** - 各情报领域的聚类特定指导