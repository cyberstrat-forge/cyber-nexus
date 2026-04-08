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
| `high_priority_count` | number | 重点关注情报数量（最多 4） |

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

按**七大情报领域**组织内容，每个领域下的聚合组包含：

```markdown
## 情报概览

### {情报领域名称}

{领域整体态势分析，自然语言段落，关键数据加粗}

- [[intelligence/{card_path}|{卡片标题}]] — {一句话简要说明}
- [[intelligence/{card_path}|{卡片标题}]] — {一句话简要说明}

**商业模式影响**：{仅 Industry-Analysis、Vendor-Intelligence、Emerging-Tech 领域适用}
```

**七大情报领域**：
1. **Threat-Landscape**（威胁态势）：攻击手法、威胁组织、安全事件
2. **Industry-Analysis**（行业分析）：市场规模、增长趋势、竞争格局
3. **Vendor-Intelligence**（厂商情报）：产品发布、战略调整、并购动态
4. **Emerging-Tech**（新兴技术）：AI安全、零信任、云安全
5. **Customer-Market**（客户与市场）：需求变化、采购行为、预算趋势
6. **Policy-Regulation**（政策法规）：新法规、合规要求、监管动态
7. **Capital-Investment**（资本动态）：融资、并购、IPO

**Obsidian 链接格式**：
- 格式：`[[intelligence/{完整路径}|显示标题]]`
- `card_path` 来自扫描输出（如 `Threat-Landscape/2026/04/xxx.md`）
- 完整链接：`[[intelligence/Threat-Landscape/2026/04/xxx.md|标题]]`

**领域内聚合原则**：
- 同一领域内多条情报，按主题/攻击类型进一步细分描述
- 示例：Threat-Landscape 领域内多个漏洞情报 → 分析"安全漏洞风险"态势
- 每个领域至少 1 条情报，无情报的领域不显示

---

### 3. 重点关注

筛选高价值情报（**3-4 条**），每条包含深入分析：

```markdown
## 重点关注

### {重点关注标题}

{深入分析描述，300-500 字，包含：背景上下文、技术细节、战略影响、关联情报综合分析}

**关键启示**：{给读者的启发性提示，2-3 句}

**关联情报**：[[intelligence/{card_path}|{标题}]]、[[intelligence/{card_path}|{标题}]]
```

**深入分析要求**：
- **读取关联卡片**：如有 `secondary_domains` 或 tags 关联的情报，读取其内容一并提供上下文
- **丰富内容**：超出情报概览的简要说明，提供技术细节、影响范围、应对建议
- **启发性思考**：给读者战略层面或实践层面的关键提示
- **关联综合**：将相关情报卡片内容融合分析，提供更全面的视角

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

### Vendor-Intelligence（厂商情报）

CrowdStrike 在 AI 安全赛道动作密集，产品发布与融资同步推进，显示出明确的战略加速姿态。**Falcon XDR 新增 AI 威胁检测模块**，利用大语言模型提升未知威胁识别能力；同日宣布获得 **2 亿美元战略投资**，将用于 AI 安全研发。

- [[intelligence/Vendor-Intelligence/2026/04/20260406-crowdstrike-falcon-xdr.md|CrowdStrike Falcon XDR 新增 AI 威胁检测模块]] — 利用 LLM 提升未知威胁识别能力，XDR 领域重要创新
- [[intelligence/Vendor-Intelligence/2026/04/20260406-crowdstrike-funding.md|CrowdStrike 获 2 亿美元战略投资]] — 资金将用于 AI 安全研发，加速产品线扩展

**商业模式影响**：AI 驱动的威胁检测能力正成为 XDR 市场的核心差异化因素，传统规则引擎厂商面临转型压力。

### Threat-Landscape（威胁态势）

供应链攻击持续发酵，开源生态成为攻击重点目标。LiteLLM 供应链攻击导致 Mercor 公司 **4TB 数据**被 Lapsus$ 勒索；开源生态恶意软件通报量同比激增 **13.6 倍**，攻击者已完成从"机会主义"到"生态化"的转型。

- [[intelligence/Threat-Landscape/2026/04/20260406-litellm-supply-chain.md|LiteLLM 供应链攻击波及 Mercor]] — AI 生态供应链首遭勒索组织系统性利用，4TB 数据被 Lapsus$ 窃取
- [[intelligence/Threat-Landscape/2026/04/20260406-opensource-malware.md|开源生态恶意软件通报激增 13.6 倍]] — npm、PyPI 成为攻击重点，供应链攻击进入"工业化"阶段

### Policy-Regulation（政策法规）

欧盟发布 AI 安全治理指南，对高风险 AI 系统提出强制性安全评估要求。指南涉及 **透明度、可解释性、人类监督** 三大核心原则，预计 2026 年底正式生效。跨国企业需提前调整 AI 产品合规策略。

- [[intelligence/Policy-Regulation/2026/04/20260406-eu-ai-governance.md|欧盟发布 AI 安全治理指南]] — 对高风险 AI 系统提出强制性要求，影响 AI 安全产品设计

## 重点关注

### CrowdStrike AI 安全战略加速：XDR 市场的智能化竞赛

CrowdStrike 同步推进产品发布和融资，显示出明确的 AI 安全战略意图。Falcon XDR 的 AI 模块采用大语言模型进行威胁检测，这是 XDR 领域的重要创新——传统 XDR 依赖规则和签名，对未知威胁识别能力有限。战略投资的 2 亿美元将用于 AI 研发，预计会加速 AI 安全产品线的扩展。与 Palo Alto、SentinelOne 的竞争格局看，AI 能力正成为 XDR 市场的核心差异化因素。

**关键启示**：传统安全厂商必须建立 AI 研发能力，否则将在新一轮市场竞争中落后。对于企业用户，评估 XDR 产品时应关注其 AI 检测能力的成熟度和误报率。

**关联情报**：[[intelligence/Vendor-Intelligence/2026/04/20260406-crowdstrike-falcon-xdr.md|CrowdStrike Falcon XDR 新增 AI 模块]]、[[intelligence/Vendor-Intelligence/2026/04/20260406-crowdstrike-funding.md|CrowdStrike 获战略投资]]

### 供应链攻击进入"工业化"阶段：开源生态的信任危机

开源生态恶意软件通报量激增 **13.6 倍**，标志着供应链攻击已从"偶发事件"演变为"规模化产业"。LiteLLM 供应链攻击揭示了一个新的攻击模式：勒索组织开始系统性利用 AI 生态供应链，而非仅针对传统软件供应链。**96% 的 CVE 发生在非热门项目**——这正是企业安全盲区。攻击者已构建完整的供应链攻击工具链和流程。

**关键启示**：企业必须建立"零信任供应链"架构：全量依赖图谱、SBOM 强制审计、第三方持续评估。安全厂商应关注供应链安全服务市场机会。

**关联情报**：[[intelligence/Threat-Landscape/2026/04/20260406-litellm-supply-chain.md|LiteLLM 供应链攻击]]、[[intelligence/Threat-Landscape/2026/04/20260406-opensource-malware.md|开源恶意软件激增]]

### 欧盟 AI 治理指南：合规先行者的战略窗口

欧盟 AI 安全治理指南对高风险 AI 系统提出强制性要求，预计 2026 年底生效。指南的三大核心原则——透明度、可解释性、人类监督——将直接影响 AI 安全产品的设计和运营。对于跨国企业，提前 8 个月启动合规准备是必要的，否则可能面临市场准入风险。合规能力可能成为 AI 安全厂商的差异化优势。

**关键启示**：AI 安全产品厂商应将合规要求纳入产品设计阶段，而非事后补救。具备合规能力的厂商将在欧洲市场获得先发优势。

**关联情报**：[[intelligence/Policy-Regulation/2026/04/20260406-eu-ai-governance.md|欧盟 AI 安全治理指南]]

## 工作统计

| 指标 | 数量 |
|------|------|
| 新增情报卡片 | 8 |
| 情报领域覆盖 | 3 |
| 来源数量 | 5 |
| 重点关注情报 | 3 |

**领域分布**：厂商情报 3 条，威胁态势 3 条，政策法规 2 条
```