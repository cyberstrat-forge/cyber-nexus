# 情报日报模板

## frontmatter 结构

```yaml
---
report_type: daily
date: YYYY-MM-DD
generated_at: YYYY-MM-DDTHH:MM:SS
generated_by: intelligence-daily-writer
intelligence_count: N
domains_covered: [Domain1, Domain2, ...]
high_priority_count: N
---
```

### frontmatter 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `report_type` | string | 报告类型，固定为 `daily` |
| `date` | string | 日报日期（YYYY-MM-DD） |
| `generated_at` | datetime | 生成时间（ISO 8601） |
| `generated_by` | string | 生成 Agent ID |
| `intelligence_count` | number | 当日情报卡片总数 |
| `domains_covered` | array | 覆盖的情报领域列表 |
| `high_priority_count` | number | 重点关注情报数量（最多 5） |

---

## 正文结构

### 1. 执行摘要

以编辑点评视角撰写，自然语言段落形式：

```markdown
## 执行摘要

今日情报呈现三个值得关注的方向。厂商层面，CrowdStrike 动作密集——产品发布与融资同步推进，显示出在 AI 安全赛道上的加速姿态。威胁层面，供应链攻击持续发酵，攻防博弈的时间差值得关注。政策层面，AI 安全治理指南的出台将重塑合规格局。总体而言，AI 正在成为安全市场竞争的核心变量。
```

**写作要求**：
- 单一段落，流畅自然
- 突出趋势和关联
- 编辑点评视角，非机械汇总
- 包含：情报总体情况、关键动向概述、潜在影响提示、战略意义总结

---

### 2. 情报概览

按聚合维度组织内容，每个聚合组包含：

```markdown
## 情报概览

### {聚合标题}

{关联分析描述，自然语言段落，关键数据加粗}

- {卡片标题简述}... [[{文件名}]]
- {卡片标题简述}... [[{文件名}]]

**商业模式影响**：{仅商业模式聚合时添加}
```

**Obsidian 链接格式**：
- 从 `card_path` 提取文件名：`Vendor-Intelligence/2026/04/20260406-crowdstrike.md` → `[[20260406-crowdstrike]]`
- 使用 `[[filename]]` 格式，不含路径

---

### 3. 重点关注

筛选高价值情报（最多 5 条），每条包含深入分析：

```markdown
## 重点关注

### {重点关注标题}

{深入分析描述，200-300 字}

**关键问题**：
1. {研究问题 1}
2. {研究问题 2}
3. {研究问题 3}

**相关情报卡片**：[[{文件名}]]、[[{文件名}]]
```

**深入分析要求**：
- 提出研究问题而非重复内容
- 包含技术细节追问
- 包含对比分析建议
- 包含后续跟踪方向

---

### 4. 工作统计

数据表格格式：

```markdown
## 工作统计

| 指标 | 数量 |
|------|------|
| 新增情报卡片 | {total_count} |
| 情报领域覆盖 | {domains_count} |
| 来源数量 | {sources_count} |
| 重点关注情报 | {high_priority_count} |

**领域分布**：{从 stats.domains_distribution 生成}
```

---

## 输出路径

日报文件路径格式：

```
{output_dir}/reports/daily/{date}-daily.md
```

示例：`intelligence/reports/daily/2026-04-06-daily.md`

---

## 空报告处理

当日无情报卡片时：

```markdown
---
report_type: daily
date: 2026-04-05
generated_at: 2026-04-05T18:00:00
generated_by: intelligence-daily-writer
intelligence_count: 0
domains_covered: []
high_priority_count: 0
---

# 2026-04-05 情报日报

今日无新增情报卡片。
```

---

## 完整示例

```markdown
---
report_type: daily
date: 2026-04-06
generated_at: 2026-04-06T15:30:00Z
generated_by: intelligence-daily-writer
intelligence_count: 8
domains_covered: [Vendor-Intelligence, Threat-Landscape, Policy-Regulation]
high_priority_count: 3
---

# 情报日报 | 2026-04-06

## 执行摘要

今日情报呈现三个值得关注的方向。厂商层面，CrowdStrike 动作密集——产品发布与融资同步推进，显示出在 AI 安全赛道上的加速姿态。威胁层面，供应链攻击持续发酵，多家企业受影响，攻防博弈的时间差值得关注。政策层面，欧盟 AI 安全治理指南的出台将重塑合规格局，对跨国企业影响深远。总体而言，AI 正在成为安全市场竞争的核心变量，厂商需加速布局以抢占先机。

## 情报概览

### CrowdStrike 发布 Falcon XDR AI 模块并获战略投资

CrowdStrike 在 AI 安全赛道动作密集，产品发布与融资同步推进。**Falcon XDR 新增 AI 威胁检测模块**，利用大语言模型提升未知威胁识别能力；同日宣布获得 **2 亿美元战略投资**，将用于 AI 安全研发。两大动作显示出 CrowdStrike 在 AI 安全领域的加速姿态。

- CrowdStrike Falcon XDR 新增 AI 威胁检测模块 [[20260406-crowdstrike-falcon-xdr]]
- CrowdStrike 获 2 亿美元战略投资 [[20260406-crowdstrike-funding]]

### 供应链攻击持续发酵

本月供应链攻击事件频发，**npm、PyPI 等开源生态成为攻击重点目标**。LiteLLM 供应链攻击导致 Mercor 公司 4TB 数据被 Lapsus$ 勒索；开源生态恶意软件通报量同比激增 **13.6 倍**，显示攻击者已完成从"机会主义"到"生态化"的转型。

- LiteLLM 供应链攻击波及 Mercor [[20260406-litellm-supply-chain]]
- 开源生态恶意软件通报激增 13.6 倍 [[20260406-opensource-malware]]

**商业模式影响**：供应链安全服务（SBOM 管理、依赖审计）需求将持续增长，安全厂商需建立"零信任供应链"能力。

### 欧盟 AI 安全治理指南出台

欧盟发布 AI 安全治理指南，对高风险 AI 系统提出强制性安全评估要求。指南涉及 **透明度、可解释性、人类监督** 三大核心原则，预计 2026 年底正式生效。跨国企业需提前调整 AI 产品合规策略。

- 欧盟发布 AI 安全治理指南 [[20260406-eu-ai-governance]]

## 重点关注

### CrowdStrike AI 安全战略加速

CrowdStrike 同步推进产品发布和融资，显示出明确的 AI 安全战略意图。Falcon XDR 的 AI 模块采用大语言模型进行威胁检测，这是 XDR 领域的重要创新——传统 XDR 依赖规则和签名，对未知威胁识别能力有限。战略投资的 2 亿美元将用于 AI 研发，预计会加速 AI 安全产品线的扩展。

**关键问题**：
1. CrowdStrike 的 AI 模块与现有 XDR 架构如何集成？是否需要额外部署？
2. 战略投资将用于哪些具体 AI 技术方向？是自研还是收购？
3. 与 Palo Alto、SentinelOne 的 AI 安全产品相比，CrowdStrike 的差异化优势是什么？

**相关情报卡片**：[[20260406-crowdstrike-falcon-xdr]]、[[20260406-crowdstrike-funding]]

### 开源生态供应链攻击进入"工业化"阶段

开源生态恶意软件通报量激增 **13.6 倍**，标志着供应链攻击已从"偶发事件"演变为"规模化产业"。攻击者利用包管理器的信任机制，通过 typosquatting、依赖混淆、投毒等方式实施大规模渗透。更关键的是，**96% 的 CVE 发生在非热门项目**——这正是企业安全盲区。

**关键问题**：
1. 企业如何建立全量依赖图谱？是否清楚间接依赖了哪些"长尾包"？
2. 包管理器平台（npm、PyPI）是否应引入"可信发布者认证"机制？
3. SBOM 审计工具是否足够成熟？能否检测间接依赖中的恶意代码？

**相关情报卡片**：[[20260406-litellm-supply-chain]]、[[20260406-opensource-malware]]

### 欧盟 AI 治理指南重塑合规格局

欧盟 AI 安全治理指南对高风险 AI 系统提出强制性要求，预计 2026 年底生效。指南的三大核心原则——透明度、可解释性、人类监督——将直接影响 AI 安全产品的设计和运营。跨国企业需提前 8 个月启动合规准备，否则可能面临市场准入风险。

**关键问题**：
1. 哪些 AI 系统被归类为"高风险"？安全产品是否在列？
2. "可解释性"要求对 AI 威胁检测产品意味着什么？是否需要披露算法逻辑？
3. 企业如何评估现有 AI 产品与指南的差距？合规改造周期预计多长？

**相关情报卡片**：[[20260406-eu-ai-governance]]

## 工作统计

| 指标 | 数量 |
|------|------|
| 新增情报卡片 | 8 |
| 情报领域覆盖 | 3 |
| 来源数量 | 5 |
| 重点关注情报 | 3 |

**领域分布**：厂商情报 3 条，威胁态势 3 条，政策法规 2 条
```