# Analysis Dimensions Reference

> 分析维度详细定义和操作指导

## 趋势分析维度

### time_trend（时间趋势）

**定义**：情报数量随时间的变化趋势

**数据来源**：`intelligence_date` 字段

**分析方法**：
1. 按月/周统计情报数量
2. 计算环比增长率
3. 识别峰值和低谷
4. 分析变化原因

**输出格式**：
```json
{
  "direction": "increasing|decreasing|stable",
  "description": "趋势描述",
  "monthly_counts": {"2026-01": 5, "2026-02": 8}
}
```

### keyword_trend（关键词趋势）

**定义**：关键词热度的变化

**分析方法**：
1. 统计关键词出现频次
2. 对比不同时期的关键词分布
3. 识别新兴关键词和消退关键词

**判断标准**：
- 新兴关键词：近3个月出现次数 >= 之前的2倍
- 消退关键词：近3个月出现次数 <= 之前的1/2

## 实体网络维度

### vendor_name（厂商名称）

**数据来源**：
- `vendor_name` 字段（Vendor-Intelligence）
- 正文中的公司名称

**分析内容**：
- 厂商提及频次
- 核心动向（产品、战略、融资）
- 市场地位变化

### threat_actor（威胁行为者）

**数据来源**：
- `threat_actor` 字段（Threat-Landscape）
- 正文中的组织名称

**分析内容**：
- 组织活跃度
- 攻击偏好
- 技术能力
- 与其他组织的关联

### tech_name（技术名称）

**数据来源**：
- `tech_name` 字段（Emerging-Tech）
- 正文中的技术术语

**分析内容**：
- 技术成熟度
- 采用情况
- 代表产品/厂商

## 跨领域关联维度

### cross_domain_links

**定义**：不同情报领域之间的关联关系

**常见关联模式**：

| 关联类型 | 涉及领域 | 典型洞察 |
|----------|----------|----------|
| 技术→威胁 | Emerging-Tech → Threat-Landscape | 新技术带来新攻击面 |
| 厂商→资本 | Vendor-Intelligence → Capital-Investment | 融资驱动厂商发展 |
| 政策→市场 | Policy-Regulation → Customer-Market | 法规驱动市场需求 |
| 威胁→市场 | Threat-Landscape → Industry-Analysis | 威胁态势影响市场规模 |

## 数据支撑维度

### data_points

**数据类型**：

| 类型 | 字段 | 示例 |
|------|------|------|
| market_size | 市场规模 | 50亿美元 |
| growth_rate | 增长率 | 35% YoY |
| market_share | 市场份额 | 15% |
| funding_amount | 融资金额 | 1亿美元 |
| valuation | 估值 | 10亿美元 |

**质量要求**：
- 必须有具体数值
- 需注明来源
- 优先使用权威来源（Gartner, IDC 等）