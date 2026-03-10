# Domain Templates Reference

> Complete frontmatter and body templates for all 7 intelligence domains.

---

## Domain Overview

| Domain | Identifier | Description |
|--------|------------|-------------|
| 威胁态势 | Threat-Landscape | 新型攻击手法、威胁组织动态、重大安全事件 |
| 行业分析 | Industry-Analysis | 市场规模、增长趋势、行业格局变化 |
| 厂商情报 | Vendor-Intelligence | 产品发布、战略调整、并购、财务数据 |
| 新兴技术 | Emerging-Tech | 新技术原理、应用场景、安全影响、成熟度评估 |
| 客户与市场 | Customer-Market | 客户需求变化、采购行为、预算趋势 |
| 政策法规 | Policy-Regulation | 新法规发布、合规要求、监管动态 |
| 资本动态 | Capital-Investment | 融资、并购、IPO、投资趋势 |

---

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

### security_relevance Values

| Value | Criteria |
|-------|----------|
| high | Direct security implications, immediate relevance |
| medium | Indirect security connections, contextual relevance |

### maturity Values (Emerging-Tech)

| Value | Description |
|-------|-------------|
| 概念 | Concept stage, no commercial products |
| 早期 | Early stage, limited adoption |
| 成长 | Growth stage, increasing adoption |
| 成熟 | Mature stage, widespread adoption |

### review_status Values

| Value | Description |
|-------|-------------|
| pending | Needs human review |
| approved | Reviewed and approved |
| revised | Modified after review |

---

## File Naming Rules

Format: `{YYYYMMDD}-{subject}-{feature}.md`

| 组成部分 | 说明 |
|----------|------|
| `{YYYYMMDD}` | 情报日期（源文件发布日期，非处理日期） |
| `{subject}` | 主体/对象（简短英文） |
| `{feature}` | 核心特征/动作（体现情报核心内容） |

### 日期来源说明

文件名中的日期应为**源文件发布日期**，获取优先级：

1. **Markdown frontmatter**：`date` 或 `published` 字段
2. **PDF 元数据**：`CreationDate` 或 `ModDate`
3. **文件名模式**：匹配 `YYYY-MM-DD` 或 `YYYYMMDD` 格式
4. **文件系统日期**：文件添加时间（ctime），作为兜底

**示例**：
- 源文件 `2026-03-01-ai-security-report.pdf` 于 `2026-03-05` 添加，处理日期为 `2026-03-10`
- 情报卡片命名：`20260301-ai-security-market-growth.md`（使用发布日期 03-01）
- `intelligence_date`：`2026-03-01`
- `created_date`：`2026-03-10`

### Naming Principles

- **体现核心特征**：文件名应反映情报的独特性，而非仅是领域词
- **结构清晰**：日期 + 主体 + 特征，易于识别和检索
- **kebab-case 格式**：全部小写，用连字符分隔
- **最大长度**：60 字符

### Examples

| 标题 | 文件名 | 说明 |
|------|--------|------|
| AI安全市场高速增长 | `20260310-ai-security-market-growth.md` | growth 体现增长趋势 |
| CrowdStrike完成B轮融资 | `20260310-crowdstrike-series-b.md` | 具体厂商 + 融资轮次 |
| LockBit勒索软件攻击激增 | `20260310-lockbit-ransomware-surge.md` | 具体威胁组织 + 动作 |
| 数据安全法正式生效 | `20260310-china-data-security-law.md` | 具体法规名称 |
| AI Agent架构安全漏洞 | `20260310-ai-agent-architecture-flaw.md` | 技术领域 + 具体问题 |

### Feature Keywords by Domain

| 领域 | 常用特征词 |
|------|-----------|
| Threat-Landscape | `attack`, `surge`, `breach`, `vulnerability`, `exploit` |
| Industry-Analysis | `growth`, `decline`, `trend`, `forecast`, `cagr` |
| Vendor-Intelligence | `funding`, `acquisition`, `ipo`, `partnership`, `launch` |
| Emerging-Tech | `breakthrough`, `release`, `adoption`, `prototype` |
| Customer-Market | `shift`, `demand`, `budget`, `preference` |
| Policy-Regulation | `enact`, `compliance`, `deadline`, `amendment` |
| Capital-Investment | `series-a/b/c`, `valuation`, `merger`, `ipo` |