# Domain Templates Reference

> 七大情报领域的 Frontmatter 和 Body 模板 (v3.0 - 元数据继承)

## 四组层次结构

所有情报卡片采用四组层次结构的 frontmatter：

```
┌─────────────────────────────────────────────────────────────┐
│ 第一组：核心标识（生成）                                      │
├─────────────────────────────────────────────────────────────┤
│ intelligence_id    - 情报卡片唯一标识                         │
│ title              - 情报卡片标题                             │
│ created_date       - 卡片生成日期                             │
│ primary_domain     - 主领域（七大领域之一）                   │
│ secondary_domains  - 次领域列表                               │
│ security_relevance - 安全相关性 high/medium                   │
│ tags               - 嵌套标签（geo/、business/、关键词）      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 第二组：item 来源追溯（继承 + 预处理）                        │
├─────────────────────────────────────────────────────────────┤
│ source_type        - 来源类型 local/cyber-pulse              │
│ item_id            - 采集阶段标识                             │
│ item_title         - item 标题                               │
│ author             - 作者                                     │
│ original_url       - 原文链接                                 │
│ published_at       - 原文发布时间                             │
│ fetched_at         - 采集时间                                 │
│ completeness_score - 完整度 0-1                               │
│ archived_file      - 归档文件链接 WikiLink（本地文件）/ null（cyber-pulse）    │
│ converted_file     - 转换文件链接 WikiLink                    │
│ converted_content_hash - 转换文件内容哈希（变更检测）        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 第三组：情报源追溯（继承）                                    │
├─────────────────────────────────────────────────────────────┤
│ source_id          - 情报源 ID                                │
│ source_name        - 情报源名称                               │
│ source_url         - 情报源 URL                               │
│ source_tier        - 情报源等级 T0-T3                         │
│ source_score       - 情报源评分 0-100                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 第四组：处理状态（生成）                                      │
├─────────────────────────────────────────────────────────────┤
│ review_status      - 审核状态 pending/approved/rejected/null │
│ generated_by       - 生成者标识                               │
│ generated_session  - 会话 ID                                  │
└─────────────────────────────────────────────────────────────┘
```

### tags 嵌套格式

tags 字段使用命名空间前缀组织：

```yaml
tags: ["geo/china", "business/MSSP", "APT", "ransomware", "cloud-security"]
```

| 前缀 | 说明 | 示例值 |
|------|------|--------|
| `geo/` | 地域范围 | `geo/global`, `geo/china`, `geo/china-primary`, `geo/overseas`, `geo/unknown` |
| `business/` | 业务模式 | `business/MSSP`, `business/SECaaS`, `business/Subscription` |
| 无前缀 | 关键词 | `APT`, `ransomware`, `cloud-security`, `zero-trust` |

---

## 1. Threat-Landscape（威胁态势）

### Frontmatter

```yaml
---
intelligence_id: "threat-20260402-ransomware-surge"
title: "情报标题"
created_date: "2026-04-02"
primary_domain: "Threat-Landscape"
secondary_domains: []
security_relevance: "high"
tags: ["geo/global", "APT", "Lazarus", "financial-sector", "malware"]

source_type: "cyber-pulse"
item_id: "item_a1b2c3d4"
item_title: "原始标题"
author: "作者"
original_url: "https://example.com/article"
published_at: "2026-04-01T08:00:00Z"
fetched_at: "2026-04-01T10:30:00Z"
completeness_score: 0.92
archived_file: "[[archive/2026/04/report-2026.pdf|report-2026.pdf]]"
converted_file: "[[converted/2026/04/report-2026.md|report-2026.md]]"
converted_content_hash: "abc123def456789..."

source_id: "src_securityweekly"
source_name: "Security Weekly"
source_url: "https://securityweekly.com"
source_tier: "T1"
source_score: 85

review_status: "passed"
generated_by: "intelligence-analyzer"
generated_session: "20260402-151800"

threat_type:                    # 勒索软件/APT/供应链攻击等
threat_actor:                   # 威胁组织名称
target_sector:                  # 目标行业
target_region:                  # 目标地区
impact_scale:                   # 影响规模
---
```

### Body Template

```markdown
# {title}

> **情报领域**：Threat-Landscape | **日期**：{intelligence_date}

## 核心事实
聚焦攻击事件的关键要素：谁（威胁行为者）用什么（攻击手段）攻击了谁（受害目标），造成什么影响

**战略意义**：[对网络安全战略的影响]

## 攻击手法
[具体技术手段、工具、CVE 等]

## 受害目标
[行业、地区、规模等]

## 影响评估
[受影响数量、经济损失等]

## 趋势变化
[新出现的模式、演变方向]

## 关键数据

| 指标 | 数值 |
|------|------|
| [指标名] | **[数值]** |

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[intelligence/{domain}/YYYY/MM/{filename}.md|{相关情报标题}]]
```

**链接规范**：相关情报链接必须使用完整路径，包含 `intelligence/` 前缀。

---

## 2. Industry-Analysis（行业分析）

### Frontmatter

```yaml
---
intelligence_id: "industry-20260402-cybersecurity-trends"
title: "情报标题"
created_date: "2026-04-02"
primary_domain: "Industry-Analysis"
secondary_domains: []
security_relevance: "medium"
tags: ["geo/china", "business/MSSP", "business/Subscription", "market-growth", "cybersecurity"]

source_type: "cyber-pulse"
item_id: "item_a1b2c3d4"
item_title: "原始标题"
author: "作者"
original_url: "https://example.com/article"
published_at: "2026-04-01T08:00:00Z"
fetched_at: "2026-04-01T10:30:00Z"
completeness_score: 0.92
archived_file: "[[archive/2026/04/report-2026.pdf|report-2026.pdf]]"
converted_file: "[[converted/2026/04/report-2026.md|report-2026.md]]"
converted_content_hash: "abc123def456789..."

source_id: "src_gartner"
source_name: "Gartner"
source_url: "https://gartner.com"
source_tier: "T0"
source_score: 95

review_status: null
generated_by: "intelligence-analyzer"
generated_session: "20260402-151800"

market_scope:                   # 全球/中国/区域
segment:                        # 细分领域
---
```

### Body Template

```markdown
# {title}

> **情报领域**：Industry-Analysis | **日期**：{intelligence_date}

## 核心事实
聚焦市场/行业的关键洞察：什么领域呈现什么趋势（增长/衰退/转型），核心数据支撑，对安全行业的影响

**战略意义**：[对网络安全战略的影响]

## 市场规模
[当前规模、增长率]

## 驱动因素
[推动增长的关键因素]

## 阻碍因素
[限制发展的关键因素]

## 预测观点
[对未来趋势的判断]

## 业务模式观察
[如有业务模式创新，在此描述]

## 关键数据

| 指标 | 数值 |
|------|------|
| [指标名] | **[数值]** |

## 关键实体
- 组织：[相关公司/机构]
- 技术/产品：[相关技术/产品]

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[intelligence/{domain}/YYYY/MM/{filename}.md|{相关情报标题}]]
```

**链接规范**：相关情报链接必须使用完整路径，包含 `intelligence/` 前缀。

---

## 3. Vendor-Intelligence（厂商情报）

### Frontmatter

```yaml
---
intelligence_id: "vendor-20260402-crowdstrike-threat-report"
title: "情报标题"
created_date: "2026-04-02"
primary_domain: "Vendor-Intelligence"
secondary_domains: []
security_relevance: "medium"
tags: ["geo/global", "CrowdStrike", "funding", "Series-B", "endpoint-security"]

source_type: "cyber-pulse"
item_id: "item_a1b2c3d4"
item_title: "原始标题"
author: "作者"
original_url: "https://example.com/article"
published_at: "2026-04-01T08:00:00Z"
fetched_at: "2026-04-01T10:30:00Z"
completeness_score: 0.92
archived_file: "[[archive/2026/04/report-2026.pdf|report-2026.pdf]]"
converted_file: "[[converted/2026/04/report-2026.md|report-2026.md]]"
converted_content_hash: "abc123def456789..."

source_id: "src_techcrunch"
source_name: "TechCrunch"
source_url: "https://techcrunch.com"
source_tier: "T2"
source_score: 75

review_status: null
generated_by: "intelligence-analyzer"
generated_session: "20260402-151800"

vendor_name:
vendor_type:                    # 创业公司/上市企业/大厂安全部门
business_area:                  # 业务领域
---
```

### Body Template

```markdown
# {title}

> **情报领域**：Vendor-Intelligence | **日期**：{intelligence_date}

## 核心事实
聚焦厂商的关键动态：谁（厂商名称）发生了什么（融资/并购/发布/转型），核心数据或意义

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

## 关键数据

| 指标 | 数值 |
|------|------|
| [指标名] | **[数值]** |

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[intelligence/{domain}/YYYY/MM/{filename}.md|{相关情报标题}]]
```

**链接规范**：相关情报链接必须使用完整路径，包含 `intelligence/` 前缀。

---

## 4. Emerging-Tech（新兴技术）

### Frontmatter

```yaml
---
intelligence_id: "emerging-20260402-ai-security-platform"
title: "情报标题"
created_date: "2026-04-02"
primary_domain: "Emerging-Tech"
secondary_domains: []
security_relevance: "high"
tags: ["geo/global", "ai-security", "AISP", "LLM-protection", "emerging-tech"]

source_type: "cyber-pulse"
item_id: "item_a1b2c3d4"
item_title: "原始标题"
author: "作者"
original_url: "https://example.com/article"
published_at: "2026-04-01T08:00:00Z"
fetched_at: "2026-04-01T10:30:00Z"
completeness_score: 0.92
archived_file: "[[archive/2026/04/report-2026.pdf|report-2026.pdf]]"
converted_file: "[[converted/2026/04/report-2026.md|report-2026.md]]"
converted_content_hash: "abc123def456789..."

source_id: "src_gartner"
source_name: "Gartner"
source_url: "https://gartner.com"
source_tier: "T0"
source_score: 95

review_status: null
generated_by: "intelligence-analyzer"
generated_session: "20260402-151800"

tech_name:                      # 技术名称
maturity:                       # 概念/早期/成长/成熟
---
```

### Body Template

```markdown
# {title}

> **情报领域**：Emerging-Tech | **日期**：{intelligence_date}

## 核心事实
聚焦技术的关键价值：什么技术/产品，解决什么安全问题，处于什么成熟阶段，市场前景如何

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

## 关键数据

| 指标 | 数值 |
|------|------|
| [指标名] | **[数值]** |

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[intelligence/{domain}/YYYY/MM/{filename}.md|{相关情报标题}]]
```

**链接规范**：相关情报链接必须使用完整路径，包含 `intelligence/` 前缀。

---

## 5. Customer-Market（客户与市场）

### Frontmatter

```yaml
---
intelligence_id: "customer-20260402-ciso-ai-adoption"
title: "情报标题"
created_date: "2026-04-02"
primary_domain: "Customer-Market"
secondary_domains: []
security_relevance: "medium"
tags: ["geo/china", "enterprise", "security-budget", "procurement", "market-demand"]

source_type: "cyber-pulse"
item_id: "item_a1b2c3d4"
item_title: "原始标题"
author: "作者"
original_url: "https://example.com/article"
published_at: "2026-04-01T08:00:00Z"
fetched_at: "2026-04-01T10:30:00Z"
completeness_score: 0.92
archived_file: "[[archive/2026/04/report-2026.pdf|report-2026.pdf]]"
converted_file: "[[converted/2026/04/report-2026.md|report-2026.md]]"
converted_content_hash: "abc123def456789..."

source_id: "src_idc"
source_name: "IDC"
source_url: "https://idc.com"
source_tier: "T1"
source_score: 88

review_status: null
generated_by: "intelligence-analyzer"
generated_session: "20260402-151800"

customer_segment:               # 客户细分
region:                         # 地区
---
```

### Body Template

```markdown
# {title}

> **情报领域**：Customer-Market | **日期**：{intelligence_date}

## 核心事实
聚焦客户的关键需求：什么行业/规模的客户，面临什么安全挑战或需求变化，呈现什么趋势

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

## 关键数据

| 指标 | 数值 |
|------|------|
| [指标名] | **[数值]** |

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[intelligence/{domain}/YYYY/MM/{filename}.md|{相关情报标题}]]
```

**链接规范**：相关情报链接必须使用完整路径，包含 `intelligence/` 前缀。

---

## 6. Policy-Regulation（政策法规）

### Frontmatter

```yaml
---
intelligence_id: "policy-20260402-zero-trust-framework"
title: "情报标题"
created_date: "2026-04-02"
primary_domain: "Policy-Regulation"
secondary_domains: []
security_relevance: "high"
tags: ["geo/china", "compliance", "data-protection", "regulation", "PIPL"]

source_type: "cyber-pulse"
item_id: "item_a1b2c3d4"
item_title: "原始标题"
author: "作者"
original_url: "https://example.com/article"
published_at: "2026-04-01T08:00:00Z"
fetched_at: "2026-04-01T10:30:00Z"
completeness_score: 0.92
archived_file: "[[archive/2026/04/report-2026.pdf|report-2026.pdf]]"
converted_file: "[[converted/2026/04/report-2026.md|report-2026.md]]"
converted_content_hash: "abc123def456789..."

source_id: "src_official"
source_name: "Government Official"
source_url: "https://gov.cn"
source_tier: "T0"
source_score: 100

review_status: null
generated_by: "intelligence-analyzer"
generated_session: "20260402-151800"

policy_name:                    # 政策名称
issuing_body:                   # 发布机构
jurisdiction:                   # 管辖区域
effective_date:                 # 生效时间
---
```

### Body Template

```markdown
# {title}

> **情报领域**：Policy-Regulation | **日期**：{intelligence_date}

## 核心事实
聚焦政策的关键要求：什么政策/法规，对谁提出什么合规要求，何时生效/有何影响

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

## 关键数据

| 指标 | 数值 |
|------|------|
| [指标名] | **[数值]** |

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[intelligence/{domain}/YYYY/MM/{filename}.md|{相关情报标题}]]
```

**链接规范**：相关情报链接必须使用完整路径，包含 `intelligence/` 前缀。

---

## 7. Capital-Investment（资本动态）

### Frontmatter

```yaml
---
intelligence_id: "capital-20260402-security-funding"
title: "情报标题"
created_date: "2026-04-02"
primary_domain: "Capital-Investment"
secondary_domains: []
security_relevance: "medium"
tags: ["geo/global", "funding", "Series-B", "cybersecurity-unicorn", "venture-capital"]

source_type: "cyber-pulse"
item_id: "item_a1b2c3d4"
item_title: "原始标题"
author: "作者"
original_url: "https://example.com/article"
published_at: "2026-04-01T08:00:00Z"
fetched_at: "2026-04-01T10:30:00Z"
completeness_score: 0.92
archived_file: "[[archive/2026/04/report-2026.pdf|report-2026.pdf]]"
converted_file: "[[converted/2026/04/report-2026.md|report-2026.md]]"
converted_content_hash: "abc123def456789..."

source_id: "src_crunchbase"
source_name: "Crunchbase"
source_url: "https://crunchbase.com"
source_tier: "T1"
source_score: 85

review_status: null
generated_by: "intelligence-analyzer"
generated_session: "20260402-151800"

event_type:                    # 融资/并购/IPO
company:                       # 涉及公司
investors:                     # 投资方/收购方
---
```

### Body Template

```markdown
# {title}

> **情报领域**：Capital-Investment | **日期**：{intelligence_date}

## 核心事实
聚焦交易的关键信息：谁（投资方/收购方）投资/收购了谁（标的），金额/估值多少，业务方向是什么

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

## 关键数据

| 指标 | 数值 |
|------|------|
| [指标名] | **[数值]** |

## 相关实体
- 公司：[相关公司]
- 投资机构：[相关投资机构]

## 原文关键引用
### [引用主题]
> "[原文语句]"
> — 第 X-Y 行 / [章节名]

## 相关情报
- [[intelligence/{domain}/YYYY/MM/{filename}.md|{相关情报标题}]]
```

**链接规范**：相关情报链接必须使用完整路径，包含 `intelligence/` 前缀。

---

## Common Fields Reference

### tags（嵌套标签）

tags 字段采用命名空间前缀组织，统一管理地域、业务模式和关键词：

```yaml
tags: ["geo/china", "business/MSSP", "business/Subscription", "APT", "ransomware"]
```

#### geo/ 前缀（地域范围）

| Tag | Description |
|-----|-------------|
| `geo/global` | 全球/无特定地域 |
| `geo/china` | 仅中国 |
| `geo/china-primary` | 中国为主，涉及海外 |
| `geo/overseas` | 仅海外 |
| `geo/overseas-primary` | 海外为主，涉及中国 |
| `geo/unknown` | 无法判断（默认值） |

**判断规则**：
- 严格模式：仅依据文档明确提及的地域信息
- 判断依据：明确提及的国家/地区、涉及的公司总部位置、法规适用范围、攻击目标地理位置
- 无法判断时使用 `geo/unknown`

#### business/ 前缀（业务模式）

**仅适用于 Industry-Analysis 领域**，用于识别网络安全行业的业务模式创新。

**交付模式类**：

| Tag | Description |
|-----|-------------|
| `business/MSSP` | 托管安全服务提供商 (Managed Security Service Provider) |
| `business/SECaaS` | 安全即服务 / 云端交付 (Security as a Service) |
| `business/On-Premise` | 本地部署模式 |
| `business/Hybrid-Delivery` | 混合交付（本地+云端） |
| `business/Embedded-Security` | 内嵌安全（安全能力嵌入其他产品） |

**收费模式类**：

| Tag | Description |
|-----|-------------|
| `business/Subscription` | 订阅制（周期性付费） |
| `business/Usage-Based` | 用量计费 |
| `business/Outcome-Based` | 结果导向（按效果付费） |
| `business/Freemium` | 免费增值模式 |
| `business/License-Based` | 授权制（一次性买断） |

**运营模式类**：

| Tag | Description |
|-----|-------------|
| `business/MDR` | 托管检测响应服务 (Managed Detection & Response) |
| `business/MSS` | 托管安全服务 (Managed Security Services) |
| `business/vCISO` | 虚拟安全官服务 |
| `business/Security-Operations-Outsourcing` | 安全运营外包 |
| `business/In-House-Operations` | 自建运营 |

**合作生态类**：

| Tag | Description |
|-----|-------------|
| `business/Platform-Ecosystem` | 平台生态（构建开放平台集成 ISV） |
| `business/Channel-Partner` | 渠道合作（代理商/分销商） |
| `business/OEM-Partnership` | OEM 合作（技术白牌输出） |
| `business/Technology-Alliance` | 技术联盟 |
| `business/Co-Development` | 联合开发 |

**创新/新兴模式类**：

| Tag | Description |
|-----|-------------|
| `business/Crowdsourced-Security` | 众包安全（众包漏洞挖掘/测试） |
| `business/Security-Insurance` | 安全保险 |
| `business/Bug-Bounty-Platform` | 漏洞赏金平台 |
| `business/Cyber-Risk-Quantification` | 网络风险量化服务 |
| `business/Security-Financing` | 安全金融 |
| `business/Data-Sharing-Alliance` | 威胁情报共享联盟 |

**特殊标签**：

| Tag | Description |
|-----|-------------|
| `business/New-Business-Model` | 新出现的业务模式（在 content 中描述） |
| `business/Business-Model-Shift` | 业务模式转型 |

**使用规则**：
- 一条情报可打多个 `business/` 标签（如 `business/MSSP` + `business/Subscription`）
- 发现新模式时使用 `business/New-Business-Model` 并在内容中描述
- 转型场景使用 `business/Business-Model-Shift`

#### 无前缀（关键词）

直接使用关键词作为标签，无需命名空间前缀：

```yaml
tags: ["geo/global", "APT", "Lazarus", "ransomware", "cloud-security"]
```

**常见关键词类别**：
- 威胁类型：`APT`, `ransomware`, `phishing`, `supply-chain-attack`
- 技术领域：`ai-security`, `zero-trust`, `cloud-security`, `endpoint-security`
- 行业垂直：`financial-sector`, `healthcare`, `government`, `critical-infrastructure`
- 厂商实体：`CrowdStrike`, `Palo-Alto`, `Microsoft-Security`

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

| Value | Description | Decided By |
|-------|-------------|------------|
| `passed` | 自动通过（Agent 明确判断有价值） | Agent |
| `pending` | 待人工审核（Agent 无法确定，需复核） | Agent |
| `approved` | 人工批准 | User |
| `rejected` | 拒绝（Agent 自动拒绝或用户拒绝） | Agent/User |

**状态流转**：

```
Agent 判断:
  明确有价值 → passed (生成卡片)
  明确无价值 → rejected (不生成卡片)
  难以判断   → pending (加入审核队列)

用户审核:
  approve    → approved (生成卡片)
  reject     → rejected (不生成卡片)
```

### source_tier（情报源等级）

| Tier | Description |
|------|-------------|
| T0 | 最高优先级，官方权威来源 |
| T1 | 高优先级，知名安全厂商/研究机构 |
| T2 | 中等优先级，行业媒体/分析师 |
| T3 | 低优先级，一般来源 |

---

## File Naming Rules

**格式**：`{YYYYMMDD}-{subject}-{feature}.md`

| 组成部分 | 说明 | 示例 |
|----------|------|------|
| `YYYYMMDD` | 情报日期（源文件发布日期） | `20251013` |
| `subject` | 主体/对象（简短英文） | `gartner`, `ai-security`, `lockbit` |
| `feature` | 核心特征/动作 | `trends-2026`, `platform-rise`, `ransomware-surge` |

**subject 和 feature 的生成规则**：

| 组成部分 | 生成方式 | 说明 |
|----------|---------|------|
| `subject` | 从情报内容提取核心实体 | 公司名、技术名、威胁组织名、市场名等 |
| `feature` | 描述情报的核心特征或动作 | 趋势、事件、突破、增长、攻击等 |

**生成步骤**：
1. 识别情报的核心主体（谁/什么）
2. 识别情报的核心特征（发生了什么/什么趋势）
3. 转换为简短英文 kebab-case
4. 组合成文件名，控制在 60 字符内

**原则**：
- kebab-case 格式，全部小写
- 最大 60 字符
- 体现情报独特性
- 用户看文件名即可大致了解情报内容

**示例**：

| 标题 | subject | feature | 文件名 |
|------|---------|---------|--------|
| Gartner发布2026网络安全规划指南 | gartner | trends-2026 | `20251013-gartner-trends-2026.md` |
| AI安全平台市场快速增长 | ai-security | market-growth | `20260301-ai-security-market-growth.md` |
| CrowdStrike完成B轮融资 | crowdstrike | series-b | `20260301-crowdstrike-series-b.md` |
| LockBit勒索软件攻击激增 | lockbit | ransomware-surge | `20260301-lockbit-ransomware-surge.md` |
| 零信任架构采用率达63% | zero-trust | adoption-rate | `20260301-zero-trust-adoption-rate.md` |

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