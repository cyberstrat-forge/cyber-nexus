# Clustering Domain-Specific Guidance

> 各情报领域的聚类特定指导

## Threat-Landscape 聚类指导

### 关键识别要素

- **威胁组织名称**：APT 组织、勒索软件团伙、黑客组织
- **攻击类型**：勒索软件、钓鱼、DDoS、供应链攻击
- **目标特征**：行业、地区、规模

### 常见主题聚类

| 主题关键词 | 匹配特征 |
|-----------|----------|
| 勒索软件 | threat_type: ransomware, LockBit, BlackCat |
| APT 活动 | threat_actor: APTxx, 国家级行为者 |
| 供应链攻击 | supply chain, third-party, dependency |

## Emerging-Tech 聚类指导

### 关键识别要素

- **技术名称**：AI/ML、零信任、SASE、XDR
- **成熟度**：概念、早期、成长、成熟
- **应用场景**：云安全、端点安全、身份管理

### 常见主题聚类

| 主题关键词 | 匹配特征 |
|-----------|----------|
| AI 安全 | AI, LLM, prompt injection, adversarial |
| 云安全 | cloud, SASE, CASB, CWPP |
| 零信任 | zero trust, ZTNA, identity |

## Vendor-Intelligence 聚类指导

### 关键识别要素

- **厂商名称**：安全公司名称
- **业务领域**：端点、网络、云、身份
- **动态类型**：产品发布、融资、并购

### 常见主题聚类

| 主题关键词 | 匹配特征 |
|-----------|----------|
| 厂商动态 | vendor_name, product launch, funding |
| 安全融资 | funding, Series A/B/C, acquisition |

## Industry-Analysis 聚类指导

### 关键识别要素

- **市场范围**：全球、区域、中国
- **细分领域**：端点安全、云安全、身份管理
- **数据类型**：市场规模、增长率、份额

### 常见主题聚类

| 主题关键词 | 匹配特征 |
|-----------|----------|
| 市场规模 | market size, CAGR, billion |
| 行业趋势 | trend, growth, forecast |

## 跨领域主题聚类

某些主题天然跨领域，聚类时需考虑：

| 主题 | 涉及领域 | 聚类指导 |
|------|----------|----------|
| AI 安全 | Emerging-Tech + Threat-Landscape + Vendor-Intelligence | 技术发展+威胁+厂商动态三位一体 |
| 云安全 | Emerging-Tech + Industry-Analysis + Vendor-Intelligence | 技术+市场+厂商综合分析 |
| 勒索软件 | Threat-Landscape + Policy-Regulation | 威胁为主，法规为辅 |