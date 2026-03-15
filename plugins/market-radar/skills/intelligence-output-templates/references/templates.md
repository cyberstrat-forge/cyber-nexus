# Domain Templates Reference

> 七大情报领域的 Frontmatter 和 Body 模板 (v2.0)

## 持久化元数据字段

所有情报卡片都包含以下持久化元数据字段，确保卡片独立于源文件和中间产物：

| 字段 | 类型 | 说明 |
|------|------|------|
| `intelligence_id` | string | 正式情报卡片 ID（格式：`{domain}-{YYYYMMDD}-{seq}`） |
| `source_hash` | string | 源文件 MD5 哈希（用于去重） |
| `archived_source` | string | 归档文件路径（`archive/YYYY/MM/{filename}`） |
| `converted_file` | string | 转换文件路径（`converted/YYYY/MM/{filename}.md`） |
| `source_file` | string | 原始源文件路径（保持兼容） |

这些字段确保：
- 删除源文件后卡片仍可追溯
- 重新加入文件时能检测重复
- 卡片包含完整来源信息

---

## 1. Threat-Landscape（威胁态势）

### Frontmatter

```yaml
---
title: "情报标题"
intelligence_id: "threat-YYYYMMDD-001"    # 正式情报卡片 ID
source_file: "inbox/report.pdf"           # 原始源文件路径
source_hash: "abc123..."                  # 源文件 MD5 哈希
archived_source: "archive/2026/03/report.pdf"  # 归档文件路径
converted_file: "converted/2026/03/report.md"  # 转换文件路径
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Threat-Landscape
secondary_domains: []
geo_scope: unknown                # 【必填】地域范围，值域见 Common Fields Reference，无法判断时使用 unknown
security_relevance: high
threat_type:                    # 勒索软件/APT/供应链攻击等
threat_actor:                   # 威胁组织名称
target_sector:                  # 目标行业
target_region:                  # 目标地区
impact_scale:                   # 影响规模
review_status: null             # null=自动批准/pending=待审核/approved=已批准/rejected=已拒绝
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
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
- [[相关情报文件路径]]
```

---

## 2. Industry-Analysis（行业分析）

### Frontmatter

```yaml
---
title: "情报标题"
intelligence_id: "industry-YYYYMMDD-001"  # 正式情报卡片 ID
source_file: "inbox/report.pdf"           # 原始源文件路径
source_hash: "abc123..."                  # 源文件 MD5 哈希
archived_source: "archive/2026/03/report.pdf"  # 归档文件路径
converted_file: "converted/2026/03/report.md"  # 转换文件路径
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Industry-Analysis
secondary_domains: []
geo_scope: unknown                # 【必填】地域范围，值域见 Common Fields Reference，无法判断时使用 unknown
business_model_tags: []           # 业务模式标签（可选）
security_relevance: medium
market_scope:                   # 全球/中国/区域
segment:                        # 细分领域
review_status: null             # null=自动批准/pending=待审核/approved=已批准/rejected=已拒绝
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
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
- [[相关情报文件路径]]
```

---

## 3. Vendor-Intelligence（厂商情报）

### Frontmatter

```yaml
---
title: "情报标题"
intelligence_id: "vendor-YYYYMMDD-001"    # 正式情报卡片 ID
source_file: "inbox/report.pdf"           # 原始源文件路径
source_hash: "abc123..."                  # 源文件 MD5 哈希
archived_source: "archive/2026/03/report.pdf"  # 归档文件路径
converted_file: "converted/2026/03/report.md"  # 转换文件路径
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Vendor-Intelligence
secondary_domains: []
geo_scope: unknown                # 【必填】地域范围，值域见 Common Fields Reference，无法判断时使用 unknown
security_relevance: medium
vendor_name:
vendor_type:                    # 创业公司/上市企业/大厂安全部门
business_area:                  # 业务领域
review_status: null             # null=自动批准/pending=待审核/approved=已批准/rejected=已拒绝
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
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
- [[相关情报文件路径]]
```

---

## 4. Emerging-Tech（新兴技术）

### Frontmatter

```yaml
---
title: "情报标题"
intelligence_id: "emerging-YYYYMMDD-001"  # 正式情报卡片 ID
source_file: "inbox/report.pdf"           # 原始源文件路径
source_hash: "abc123..."                  # 源文件 MD5 哈希
archived_source: "archive/2026/03/report.pdf"  # 归档文件路径
converted_file: "converted/2026/03/report.md"  # 转换文件路径
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Emerging-Tech
secondary_domains: []
geo_scope: unknown                # 【必填】地域范围，值域见 Common Fields Reference，无法判断时使用 unknown
security_relevance: high
tech_name:                      # 技术名称
maturity:                       # 概念/早期/成长/成熟
review_status: null             # null=自动批准/pending=待审核/approved=已批准/rejected=已拒绝
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
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
- [[相关情报文件路径]]
```

---

## 5. Customer-Market（客户与市场）

### Frontmatter

```yaml
---
title: "情报标题"
intelligence_id: "customer-YYYYMMDD-001"  # 正式情报卡片 ID
source_file: "inbox/report.pdf"           # 原始源文件路径
source_hash: "abc123..."                  # 源文件 MD5 哈希
archived_source: "archive/2026/03/report.pdf"  # 归档文件路径
converted_file: "converted/2026/03/report.md"  # 转换文件路径
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Customer-Market
secondary_domains: []
geo_scope: unknown                # 【必填】地域范围，值域见 Common Fields Reference，无法判断时使用 unknown
security_relevance: medium
customer_segment:               # 客户细分
region:                         # 地区
review_status: null             # null=自动批准/pending=待审核/approved=已批准/rejected=已拒绝
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
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
- [[相关情报文件路径]]
```

---

## 6. Policy-Regulation（政策法规）

### Frontmatter

```yaml
---
title: "情报标题"
intelligence_id: "policy-YYYYMMDD-001"    # 正式情报卡片 ID
source_file: "inbox/report.pdf"           # 原始源文件路径
source_hash: "abc123..."                  # 源文件 MD5 哈希
archived_source: "archive/2026/03/report.pdf"  # 归档文件路径
converted_file: "converted/2026/03/report.md"  # 转换文件路径
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Policy-Regulation
secondary_domains: []
geo_scope: unknown                # 【必填】地域范围，值域见 Common Fields Reference，无法判断时使用 unknown
security_relevance: high
policy_name:                    # 政策名称
issuing_body:                   # 发布机构
jurisdiction:                   # 管辖区域
effective_date:                 # 生效时间
review_status: null             # null=自动批准/pending=待审核/approved=已批准/rejected=已拒绝
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
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
- [[相关情报文件路径]]
```

---

## 7. Capital-Investment（资本动态）

### Frontmatter

```yaml
---
title: "情报标题"
intelligence_id: "capital-YYYYMMDD-001"   # 正式情报卡片 ID
source_file: "inbox/report.pdf"           # 原始源文件路径
source_hash: "abc123..."                  # 源文件 MD5 哈希
archived_source: "archive/2026/03/report.pdf"  # 归档文件路径
converted_file: "converted/2026/03/report.md"  # 转换文件路径
intelligence_date: YYYY-MM-DD
created_date: YYYY-MM-DD
primary_domain: Capital-Investment
secondary_domains: []
geo_scope: unknown                # 【必填】地域范围，值域见 Common Fields Reference，无法判断时使用 unknown
security_relevance: medium
event_type:                    # 融资/并购/IPO
company:                       # 涉及公司
investors:                     # 投资方/收购方
review_status: null             # null=自动批准/pending=待审核/approved=已批准/rejected=已拒绝
generated_by: intelligence-analyzer
generated_session: "YYYYMMDD-HHMMSS"
---
```

### Body Template

```markdown
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
- [[相关情报文件路径]]
```

---

## Common Fields Reference

### geo_scope（地域范围）

| Value | Description |
|-------|-------------|
| global | 全球/无特定地域 |
| china | 仅中国 |
| china-primary | 中国为主，涉及海外 |
| overseas | 仅海外 |
| overseas-primary | 海外为主，涉及中国 |
| unknown | 无法判断（默认值） |

**判断规则**：
- 严格模式：仅依据文档明确提及的地域信息
- 判断依据：明确提及的国家/地区、涉及的公司总部位置、法规适用范围、攻击目标地理位置
- 无法判断时设为 `unknown`

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
| null | 自动批准（Agent 明确判断有价值） |
| pending | 待人工审核（Agent 无法确定，需复核） |
| approved | 已审核通过 |
| rejected | 已审核拒绝 |

**v2.0 变更**：
- `null` 表示自动批准，无需人工审核
- `pending` 表示 Agent 无法确定战略价值，需人工复核
- 审核后状态变为 `approved` 或 `rejected`

### business_model_tags（业务模式标签）

**仅适用于 Industry-Analysis 领域**，用于识别网络安全行业的业务模式创新。

#### 交付模式类

| Tag | Description |
|-----|-------------|
| MSSP | 托管安全服务提供商 (Managed Security Service Provider) |
| SECaaS | 安全即服务 / 云端交付 (Security as a Service) |
| On-Premise | 本地部署模式 |
| Hybrid-Delivery | 混合交付（本地+云端） |
| Embedded-Security | 内嵌安全（安全能力嵌入其他产品） |

#### 收费模式类

| Tag | Description |
|-----|-------------|
| Subscription | 订阅制（周期性付费） |
| Usage-Based | 用量计费 |
| Outcome-Based | 结果导向（按效果付费） |
| Freemium | 免费增值模式 |
| License-Based | 授权制（一次性买断） |

#### 运营模式类

| Tag | Description |
|-----|-------------|
| MDR | 托管检测响应服务 (Managed Detection & Response) |
| MSS | 托管安全服务 (Managed Security Services) |
| vCISO | 虚拟安全官服务 |
| Security-Operations-Outsourcing | 安全运营外包 |
| In-House-Operations | 自建运营 |

#### 合作生态类

| Tag | Description |
|-----|-------------|
| Platform-Ecosystem | 平台生态（构建开放平台集成 ISV） |
| Channel-Partner | 渠道合作（代理商/分销商） |
| OEM-Partnership | OEM 合作（技术白牌输出） |
| Technology-Alliance | 技术联盟 |
| Co-Development | 联合开发 |

#### 创新/新兴模式类

| Tag | Description |
|-----|-------------|
| Crowdsourced-Security | 众包安全（众包漏洞挖掘/测试） |
| Security-Insurance | 安全保险 |
| Bug-Bounty-Platform | 漏洞赏金平台 |
| Cyber-Risk-Quantification | 网络风险量化服务 |
| Security-Financing | 安全金融 |
| Data-Sharing-Alliance | 威胁情报共享联盟 |

#### 特殊标签

| Tag | Description |
|-----|-------------|
| New-Business-Model | 新出现的业务模式（在 content 中描述） |
| Business-Model-Shift | 业务模式转型 |

**使用规则**：
- 一条情报可打多个标签（如 `MSSP` + `Subscription`）
- 发现新模式时使用 `New-Business-Model` 并在内容中描述
- 转型场景使用 `Business-Model-Shift`

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