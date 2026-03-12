---
name: cybersecurity-domain-knowledge
description: This skill should be used when analyzing cybersecurity-related documents for strategic intelligence extraction. Triggers when processing documents about threat intelligence, vendor analysis, emerging security technologies, market trends, policy regulations, or capital investment in the security industry.
---

## 情报领域

网络安全战略规划的七个情报领域：Threat-Landscape、Industry-Analysis、Vendor-Intelligence、Emerging-Tech、Customer-Market、Policy-Regulation、Capital-Investment。

详细定义参见 `../output-templates/references/templates.md`。

## 领域识别关键词

### Threat-Landscape（威胁态势）
- 攻击类型：勒索软件、APT、供应链攻击、零日漏洞、DDoS、钓鱼攻击
- 威胁行为者：黑客组织、APT组织、威胁行为者
- 影响描述：数据泄露、安全事件、受害者

### Industry-Analysis（行业分析）
- 市场相关：市场规模、增长率、市场份额、细分市场
- 趋势相关：行业趋势、发展方向、竞争格局
- 数据特征：亿美元、同比增长、CAGR
- 业务模式：MSSP、SECaaS、托管服务、订阅制、生态合作、众包安全、安全保险

### Vendor-Intelligence（厂商情报）
- 公司相关：厂商、安全公司、创业公司
- 产品相关：产品发布、新功能、版本更新
- 商业动态：并购、融资、战略合作、IPO

### Emerging-Tech（新兴技术）
- AI 安全：AI安全、大模型安全、对抗样本、提示注入
- 新技术：零信任、SASE、XDR、云安全、区块链安全
- 创新应用：新技术、创新应用、技术突破

### Customer-Market（客户与市场）
- 需求相关：客户需求、痛点、安全挑战
- 预算相关：安全预算、采购、投入
- 行为特征：决策因素、选型标准

### Policy-Regulation（政策法规）
- 法规名称：网络安全法、数据安全法、个人信息保护法
- 合规相关：合规、监管、标准、认证
- 监管机构：监管机构、网信办、公安部

### Capital-Investment（资本动态）
- 融资相关：融资、投资、估值、轮次
- 并购相关：收购、并购、整合
- 上市相关：上市、公开发行

## 领域特定指标

### 高优先级指标

**Threat-Landscape：**
- 首次出现的攻击技术
- 国家级行为者活动
- 关键基础设施攻击
- 零日漏洞利用

**Industry-Analysis：**
- 市场规模数据（具体数字）
- 增长率预测
- 市场份额排名
- 区域差异

**Vendor-Intelligence：**
- 带技术细节的产品发布
- 战略转型或重新定位
- 带战略理由的并购
- 财务业绩数据

**Emerging-Tech：**
- 新技术介绍
- 安全影响分析
- 成熟度评估
- 应用案例

**Customer-Market：**
- 预算分配变化
- 优先级转变
- 新合规要求
- 采用障碍

**Policy-Regulation：**
- 新法律/法规发布
- 合规截止日期
- 执法行动
- 解释指南

**Capital-Investment：**
- 融资金额和投资方
- 估值变化
- 并购交易细节
- 战略投资者参与

## 跨领域关联

```
Emerging-Tech ←→ Threat-Landscape（新技术创造新攻击面）
Vendor-Intelligence ←→ Capital-Investment（融资驱动厂商增长）
Policy-Regulation ←→ Customer-Market（法规驱动客户需求）
Industry-Analysis ←→ 所有领域（为所有情报提供市场背景）
```

## AI 安全重点

特别关注 AI 相关发展：

1. **AI 赋能安全**：AI 驱动的安全工具、自动化
2. **AI 安全**：保护 AI 系统、模型安全
3. **AI 攻击**：对抗性机器学习、提示注入、数据投毒
4. **AI 治理**：AI 法规、伦理 AI、负责任 AI

分析任何领域时，主动寻找 AI 关联。