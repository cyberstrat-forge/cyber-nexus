# Domain Templates Reference

> 七大情报领域的 Frontmatter 和 Body 模板

## 1. Threat-Landscape（威胁态势）

### Frontmatter

```yaml
---
title: "情报标题"
source_file: "[[relative/path/to/source.md]]"
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Threat-Landscape
secondary_domains: []
security_relevance: high
threat_type:                    # 勒索软件/APT/供应链攻击等
threat_actor:                   # 威胁组织名称
target_sector:                  # 目标行业
target_region:                  # 目标地区
impact_scale:                   # 影响规模
review_status: pending
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
## 核心事实
[提炼后的战略情报，1-3 句话]

> "[原文关键语句]"

**战略意义**：[对网络安全战略的影响]

## 攻击手法
[具体技术手段、工具、CVE 等]

## 受害目标
[行业、地区、规模等]

## 影响评估
[受影响数量、经济损失等]

## 趋势变化
[新出现的模式、演变方向]

## 数据支撑
- [具体数字、比例、金额]

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[相关情报文件路径]]
```

---

## 2. Industry-Analysis（行业分析）

### Frontmatter

```yaml
---
title: "情报标题"
source_file: "[[relative/path/to/source.md]]"
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Industry-Analysis
secondary_domains: []
security_relevance: medium
market_scope:                   # 全球/中国/区域
segment:                        # 细分领域
review_status: pending
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
## 核心事实
[提炼后的战略情报，1-3 句话]

> "[原文关键语句]"

**战略意义**：[对网络安全战略的影响]

## 市场规模
[当前规模、增长率]

## 驱动因素
[推动增长的关键因素]

## 阻碍因素
[限制发展的关键因素]

## 预测观点
[对未来趋势的判断]

## 数据支撑
- [具体数字、比例、金额]

## 关键实体
- 组织：[相关公司/机构]
- 技术/产品：[相关技术/产品]

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[相关情报文件路径]]
```

---

## 3. Vendor-Intelligence（厂商情报）

### Frontmatter

```yaml
---
title: "情报标题"
source_file: "[[relative/path/to/source.md]]"
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Vendor-Intelligence
secondary_domains: []
security_relevance: medium
vendor_name:
vendor_type:                    # 创业公司/上市企业/大厂安全部门
business_area:                  # 业务领域
review_status: pending
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
## 核心事实
[提炼后的战略情报，1-3 句话]

> "[原文关键语句]"

**战略意义**：[对网络安全战略的影响]

## 厂商概况
[公司背景、主营业务]

## 关键动态
[产品发布、战略调整、人事变动等]

## 财务数据
[营收、增长、估值等]

## 市场地位
[竞争位置、市场份额、行业认可]

## 战略动向
[并购、合作、市场扩张等]

## 数据支撑
- [具体数字、比例、金额]

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[相关情报文件路径]]
```

---

## 4. Emerging-Tech（新兴技术）

### Frontmatter

```yaml
---
title: "情报标题"
source_file: "[[relative/path/to/source.md]]"
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Emerging-Tech
secondary_domains: []
security_relevance: high
tech_name:                      # 技术名称
maturity:                       # 概念/早期/成长/成熟
review_status: pending
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
## 核心事实
[提炼后的战略情报，1-3 句话]

> "[原文关键语句]"

**战略意义**：[对网络安全战略的影响]

## 技术概述
[技术核心概念、原理]

## 核心能力
[解决什么问题、应用价值]

## 应用场景
[适用场景、目标行业]

## 代表厂商/产品
[主要玩家、代表性产品]

## 安全影响
[对攻防的影响、新的攻击面/防御能力]

## 发展趋势
[技术演进方向、未来预期]

## 数据支撑
- [具体数字、比例、金额]

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[相关情报文件路径]]
```

---

## 5. Customer-Market（客户与市场）

### Frontmatter

```yaml
---
title: "情报标题"
source_file: "[[relative/path/to/source.md]]"
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Customer-Market
secondary_domains: []
security_relevance: medium
customer_segment:               # 客户细分
region:                         # 地区
review_status: pending
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
## 核心事实
[提炼后的战略情报，1-3 句话]

> "[原文关键语句]"

**战略意义**：[对网络安全战略的影响]

## 客户画像
[行业、规模、地区等特征]

## 需求痛点
[核心安全挑战]

## 采购行为
[决策模式、预算变化]

## 决策因素
[选型关键因素排序]

## 采用趋势
[新技术接受度、实施进展]

## 数据支撑
- [具体数字、比例、金额]

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[相关情报文件路径]]
```

---

## 6. Policy-Regulation（政策法规）

### Frontmatter

```yaml
---
title: "情报标题"
source_file: "[[relative/path/to/source.md]]"
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Policy-Regulation
secondary_domains: []
security_relevance: high
policy_name:                    # 政策名称
issuing_body:                   # 发布机构
jurisdiction:                   # 管辖区域
effective_date:                 # 生效时间
review_status: pending
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
## 核心事实
[提炼后的战略情报，1-3 句话]

> "[原文关键语句]"

**战略意义**：[对网络安全战略的影响]

## 政策概述
[法规/政策核心内容]

## 核心要求
[主要合规要点]

## 影响范围
[适用对象、行业]

## 合规成本
[预估实施成本]

## 市场影响
[对行业/厂商的影响]

## 数据支撑
- [具体数字、比例、金额]

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[相关情报文件路径]]
```

---

## 7. Capital-Investment（资本动态）

### Frontmatter

```yaml
---
title: "情报标题"
source_file: "[[relative/path/to/source.md]]"
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Capital-Investment
secondary_domains: []
security_relevance: medium
event_type:                    # 融资/并购/IPO
company:                       # 涉及公司
investors:                     # 投资方/收购方
review_status: pending
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
## 核心事实
[提炼后的战略情报，1-3 句话]

> "[原文关键语句]"

**战略意义**：[对网络安全战略的影响]

## 事件概述
[交易基本情况]

## 交易详情
[金额、估值、轮次等]

## 业务方向
[投资标的业务领域]

## 投资逻辑
[投资原因、战略意图]

## 市场信号
[反映的行业趋势]

## 数据支撑
- [具体数字、比例、金额]

## 相关实体
- 公司：[相关公司]
- 投资机构：[相关投资机构]

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[相关情报文件路径]]
```

---

## Common Fields Reference

### security_relevance

| Value | Criteria |
|-------|----------|
| high | 直接安全关联，即时相关性 |
| medium | 间接安全关联，上下文相关性 |

### maturity（Emerging-Tech）

| Value | Description |
|-------|-------------|
| 概念 | 概念阶段，无商业产品 |
| 早期 | 早期阶段，有限采用 |
| 成长 | 成长阶段，采用增加 |
| 成熟 | 成熟阶段，广泛采用 |

### review_status

| Value | Description |
|-------|-------------|
| pending | 待人工审核 |
| approved | 已审核通过 |
| revised | 审核后修改 |

---

## File Naming Rules

**格式**：`{YYYYMMDD}-{subject}-{feature}.md`

| 组成部分 | 说明 |
|----------|------|
| `YYYYMMDD` | 情报日期（源文件发布日期） |
| `subject` | 主体/对象（简短英文） |
| `feature` | 核心特征/动作 |

**原则**：
- kebab-case 格式，全部小写
- 最大 60 字符
- 体现情报独特性

**示例**：

| 标题 | 文件名 |
|------|--------|
| AI安全市场高速增长 | `20260301-ai-security-market-growth.md` |
| CrowdStrike完成B轮融资 | `20260301-crowdstrike-series-b.md` |
| LockBit勒索软件攻击激增 | `20260301-lockbit-ransomware-surge.md` |

**领域特征词**：

| 领域 | 特征词 |
|------|--------|
| Threat-Landscape | `attack`, `surge`, `breach`, `vulnerability`, `exploit` |
| Industry-Analysis | `growth`, `decline`, `trend`, `forecast`, `cagr` |
| Vendor-Intelligence | `funding`, `acquisition`, `ipo`, `partnership`, `launch` |
| Emerging-Tech | `breakthrough`, `release`, `adoption`, `prototype` |
| Customer-Market | `shift`, `demand`, `budget`, `preference` |
| Policy-Regulation | `enact`, `compliance`, `deadline`, `amendment` |
| Capital-Investment | `series-a/b/c`, `valuation`, `merger`, `ipo` |

**日期来源**：参见 `agents/intelligence-analyzer.md` 步骤 2。