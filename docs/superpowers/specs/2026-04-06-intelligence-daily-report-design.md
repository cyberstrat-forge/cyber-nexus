# 情报日报功能设计文档

**日期**: 2026-04-06
**状态**: 设计完成，待审核
**目标**: 为 market-radar 插件新增情报日报功能，帮助团队情报成员快速发现值得深入研究的情报卡片。

---

## 1. 功能概述

情报日报（Intelligence Daily Report）是 market-radar 插件新增的报告类型，面向团队情报成员，每日自动生成监测情况报告。

### 核心价值

- **快速发现值得深入研究的情报卡片**：日报不是机械汇总，而是情报分析人员视角的内容重组
- **有机聚合当日情报内容**：按主体/主题/事件链条等维度动态聚合，而非按领域简单分类
- **自然语言描述 + Obsidian 链接**：便于跳转追溯原始情报卡片

### 与周报/月报差异

| 特性 | 日报 | 周报/月报 |
|------|------|---------|
| 频率 | 每日 | 每周/每月 |
| 内容范围 | 当日新增情报卡片（按 `created_date`） | 指定周期内情报卡片 |
| 组织逻辑 | Agent 动态聚合（主体/主题/事件链条） | 领域分组 + 统计汇总 |
| 输出风格 | 自然语言叙述，深入分析 | 结构化报告 |
| 目标读者 | 团队情报成员 | 管理层/决策者 |

---

## 2. 需求分析

### 2.1 核心场景

**每日情报监测报告**——关注工作状态 + 情报内容概要 + 可追溯链接。

目的：提醒情报分析人员要去研究的情报卡片是哪些，而非展示工作数量。

### 2.2 目标读者

**团队情报成员**——共享给同事，需要标准化格式便于协作讨论。

### 2.3 内容范围

**当天新增情报卡片**——按 `created_date` 过滤，反映情报分析团队的当日产出。

### 2.4 自动化程度

**半自动化流程**——Agent 自动生成日报，无需人工审核环节。

理由：
- 日报内容量适中（预计 5-15 张情报卡片），Agent 可处理
- 半自动化流程便于后续迭代验证 Agent 输出质量
- 复用现有架构（scan-cards.ts + Agent），技术成本适中

### 2.5 内容组织逻辑

**有机聚合**——Agent 根据当日情报内容动态决定聚合维度：

| 维度 | 优先级 | 定义 | 识别依据 |
|------|-------|------|---------|
| **主体聚合** | 1 | 同一实体（厂商/组织/技术）在多张卡片出现 | vendor_name, threat_actor, tech_name, policy_name |
| **事件链条聚合** | 1 | 多张卡片构成因果/时间序列关系 | 同一事件的时间序列、因果关系 |
| **商业模式聚合** | 2 | 情报对网络安全商业模式产生共同影响 | business/ 标签 + 领域特定内容分析 |
| **跨领域关联聚合** | 2 | 卡片间存在领域间关联关系 | 领域组合 + 关联类型（技术-威胁、厂商-资本、政策-客户） |
| **主题聚合** | 3 | 多张卡片涉及同一主题/类型 | threat_type, business_area, segment, tech_name |
| **地域聚合** | 3 | 多张卡片聚焦同一地理区域 | geo/ 标签, target_region, jurisdiction |
| **时间序列聚合** | 3 | 同一主题/主体在不同时间点的演变 | 同主体/主题 + 不同时间 |
| **独立展示** | 兜底 | 无明显关联的情报 | 无上述关联 |

聚合标题需带语义概要，不暴露内部聚合类型标注。

#### 商业模式聚合详解

**定义**：识别情报对网络安全公司商业模式的影响，按影响类型聚合。

**影响类型**：

| 类型 | 描述 | 触发条件 | 示例 |
|------|------|---------|------|
| **模式重构** | 现有商业模式被颠覆或重大变革 | 新技术/新模式替代传统模式 | AI Agent 重构安全运营 → 从 MSS 转向 AI-MDR |
| **模式扩展** | 现有模式的延伸或增强 | 新能力补充现有模式 | 零信任 SaaS 扩展传统边界安全 |
| **新模式兴起** | 全新商业模式出现 | 之前不存在的模式 | 安全保险、众包安全、按效果付费 |
| **模式衰退** | 传统模式市场份额下降 | 新模式侵蚀传统市场 | 本地部署安全被 SECaaS 替代 |

**识别依据**（从情报内容提取）：

| 领域 | 可识别的商业模式影响 |
|------|---------------------|
| **Threat-Landscape** | 新威胁催生新防御服务模式（如勒索软件催生赎金谈判服务） |
| **Industry-Analysis** | 市场趋势反映模式变化（如 MSSP 增长、订阅制占比提升） |
| **Vendor-Intelligence** | 厂商战略转型（如从产品销售转向订阅服务） |
| **Emerging-Tech** | 技术创新驱动模式变革（如 AI Agent 自动化运营） |
| **Customer-Market** | 客户需求变化驱动模式调整（如中小企业偏好托管服务） |
| **Policy-Regulation** | 合规要求催生新模式（如合规即服务 Compliance-as-a-Service） |
| **Capital-Investment** | 投资热点反映模式趋势（如 MDR 融资热潮） |

#### 跨领域关联聚合详解

**定义**：识别情报卡片之间的跨领域关联关系，按关联类型聚合。

| 关联类型 | 描述 | 示例 |
|---------|------|------|
| **技术-威胁关联** | 新技术创造新攻击面/防御能力 | AI 安全技术 ↔ AI 对抗攻击 |
| **厂商-资本关联** | 融资驱动厂商战略动向 | CrowdStrike 融资 ↔ CrowdStrike 产品发布 |
| **政策-客户关联** | 法规驱动客户需求变化 | AI 治理指南 ↔ 企业 AI 安全需求 |
| **行业背景关联** | 多条情报共享同一市场背景 | AI 安全市场增长 ↔ 各厂商 AI 产品发布 |

### 2.6 重点关注判断标准

Agent 判断以下情报进入重点关注板块：
- 情报涉及头部厂商重大动态（产品发布、融资、战略调整）
- 情报揭示行业趋势变化（新技术兴起、市场格局变化）
- 情报涉及高影响力威胁事件（大规模攻击、新型攻击手法）
- 情报涉及合规政策变化（影响厂商运营、产品合规）

---

## 3. 技术架构

### 3.1 组件架构

```
intel-distill 命令
  --report daily 参数
      ↓
scan-cards.ts (扩展)
  --date YYYY-MM-DD 参数
  输出: 当日情报卡片 JSON 数据
      ↓
intelligence-daily-writer Agent (新建)
  输入: scan-cards 输出 + 日报模板
  输出: YYYY-MM-DD-daily.md
      ↓
reports/daily/YYYY-MM-DD-daily.md
```

### 3.2 组件职责

| 组件 | 职责 | 改动类型 |
|------|------|---------|
| `scan-cards.ts` | 按日期过滤情报卡片，输出 JSON 数据给 Agent | 扩展 |
| `intelligence-daily-writer` Agent | 聚合判断 + 内容重组 + 深入分析 + 生成日报 | 新建 |
| `intelligence-output-templates` Skill | 日报模板定义（frontmatter + 正文结构） | 扩展 |
| `intel-distill` 命令 | 新增 `--report daily` 参数入口 | 扩展 |

### 3.3 技术方案选择

采用**混合方案**（方案 C）：
- 复用 `scan-cards.ts`（过滤逻辑通用）
- 新建专用 Agent 保证日报输出质量
- 复用命令入口（用户体验一致）

---

## 4. 组件设计

### 4.1 scan-cards.ts 扩展

**新增参数**：

| 参数 | 说明 | 默认值 |
|------|------|-------|
| `--date` | 过滤指定日期的情报卡片（按 `created_date`） | 当天日期 |
| `--format` | 输出格式：`json`（Agent 输入）或 `list`（终端展示） | `list` |

**输出 JSON 结构**（供 Agent 使用）：

```json
{
  "date": "2026-04-06",
  "intelligence_cards": [
    {
      "intelligence_id": "intel_20260406_crowdstrike_falcon",
      "title": "CrowdStrike Falcon XDR 新增 AI 威胁检测模块",
      "created_date": "2026-04-06",
      "primary_domain": "Vendor-Intelligence",
      "secondary_domains": ["Industry-Analysis"],
      "security_relevance": "medium",
      "tags": ["geo/global", "AI", "XDR", "CrowdStrike"],
      "published_at": "2026-04-06",
      "source_name": "CrowdStrike Blog",
      "source_tier": "T1",
      "item_id": "item_abc123",
      "item_title": "...",
      "original_url": "https://...",
      "completeness_score": 0.85,
      "archived_file": "[[archive/2026/04/...]]",
      "converted_file": "[[converted/2026/04/...]]",
      "card_path": "intelligence/Vendor-Intelligence/2026/04/20260406-crowdstrike-falcon-xdr.md",
      "body_summary": "...(正文前 500 字摘要)"
    }
  ],
  "stats": {
    "total_count": 10,
    "domains_distribution": {
      "Threat-Landscape": 3,
      "Vendor-Intelligence": 3,
      "Capital-Investment": 2,
      "Industry-Analysis": 2
    },
    "sources_distribution": {
      "CrowdStrike Blog": 2,
      "Microsoft Blog": 1,
      "Gartner": 1
    }
  }
}
```

**关键改动**：
- 新增 `--date` 参数，按 `created_date` 字段过滤（支持 `YYYY-MM-DD` 格式）
- 新增 `--format json` 输出完整情报卡片数据（含 `body_summary` 正文摘要）
- 复用现有递归 glob pattern（支持年月子目录结构）

### 4.2 intelligence-daily-writer Agent

**Agent 文件**：`plugins/market-radar/agents/intelligence-daily-writer.md`

**核心职责**：
1. **有机聚合判断**：识别主体关联、主题关联、事件链条、地域关联
2. **内容重组**：按聚合维度组织情报，自然语言描述关联关系
3. **重点关注筛选**：判断高价值情报（头部厂商动态、行业趋势、高影响力威胁、合规政策）
4. **深入分析输出**：针对重点关注情报，提出研究问题、技术细节追问、对比分析建议

**Agent 参数**：

| 参数 | 说明 | 来源 |
|------|------|------|
| `cards_data` | JSON 格式情报卡片数据 | scan-cards 输出 |
| `output_path` | 日报输出路径 | `reports/daily/YYYY-MM-DD-daily.md` |
| `date` | 日报日期 | `YYYY-MM-DD` |

**Agent prompt 关键指令**：

```markdown
## 聚合判断逻辑

按优先级依次判断：

### 优先级 1（强关联）

1. **主体聚合**：同一实体（厂商/组织/技术）在多张卡片出现
   - 识别字段：vendor_name, threat_actor, tech_name, policy_name, company, investors
   - 示例：CrowdStrike 的产品发布 + 融资消息

2. **事件链条聚合**：多张卡片构成因果/时间序列关系
   - 识别方式：同一事件的不同阶段、因果关系
   - 示例：漏洞披露 → 攻击利用 → 厂商响应

### 优先级 2（中等关联）

3. **商业模式聚合**：情报对网络安全商业模式产生共同影响
   - 影响类型：模式重构、模式扩展、新模式兴起、模式衰退
   - 识别依据：business/ 标签、领域特定内容（技术驱动变革、市场趋势变化、厂商战略转型）
   - 示例：AI Agent 重构安全运营 → 涉及厂商动态、市场趋势、客户需求等多张卡片

4. **跨领域关联聚合**：卡片间存在领域间关联关系
   - 技术-威胁关联：新技术创造新攻击面/防御能力
   - 厂商-资本关联：融资驱动厂商战略动向
   - 政策-客户关联：法规驱动客户需求变化
   - 行业背景关联：多条情报共享同一市场背景

### 优先级 3（弱关联）

5. **主题聚合**：多张卡片涉及同一主题/类型
   - 识别字段：threat_type, business_area, segment, tech_name
   - 示例：多条勒索软件相关情报

6. **地域聚合**：多张卡片聚焦同一地理区域
   - 识别字段：geo/ 标签, target_region, jurisdiction
   - 示例：多条中国相关政策/厂商情报

7. **时间序列聚合**：同一主题/主体在不同时间点的演变
   - 识别方式：同主体/主题 + 不同日期
   - 示例：APT-X 组织 3 月攻击 → 4 月攻击（手法升级）

### 兜底处理

8. **独立展示**：无明显关联的情报，单独列出，按领域标注

## 重点关注判断标准

以下情报应进入重点关注板块：
- 情报涉及头部厂商重大动态（产品发布、融资、战略调整）
- 情报揭示行业趋势变化（新技术兴起、市场格局变化）
- 情报涉及高影响力威胁事件（大规模攻击、新型攻击手法）
- 情报涉及合规政策变化（影响厂商运营、产品合规）
- 情报涉及商业模式变革（新模式兴起、传统模式衰退）

## 输出要求

- 执行摘要：编辑点评视角，自然语言段落，揭示趋势和关联
- 情报概览：聚合标题带概要信息，正文详述关联分析，关键数据严格引用
- 重点关注：每条 200-300 字，提出研究问题而非重复内容
- Obsidian 链接：使用 `[[filename]]` 格式，基于 card_path 提取文件名
```

### 4.3 日报模板

**模板文件**：`plugins/market-radar/skills/intelligence-output-templates/references/daily-report-template.md`

**frontmatter 结构**：

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

**正文结构**：
1. **执行摘要**（编辑点评，自然语言段落）
2. **情报概览**（有机聚合 + 卡片跳转）
3. **重点关注**（深入分析，提出研究问题）
4. **工作统计**（数据表格）

### 4.4 intel-distill 命令扩展

**新增参数组合**：

```bash
/intel-distill --report daily
# 默认当天日期，输出到 reports/daily/YYYY-MM-DD-daily.md

/intel-distill --report daily --date 2026-04-05
# 指定日期，输出历史日报

/intel-distill --report daily --preview
# 预览模式，输出到终端不写文件
```

**执行流程**（复用现有报告生成逻辑）：

```
1. 检查依赖
2. 执行 scan-cards.ts --date YYYY-MM-DD --format json
3. 调用 intelligence-daily-writer Agent
4. 生成日报到 reports/daily/
5. 输出完成提示
```

---

## 5. 目录结构更新

```
reports/
├── daily/
│   └── 2026-04-06-daily.md    # 日报
├── weekly/
│   └── 2026-W15-weekly.md     # 周报（统一命名格式）
└── monthly/
    └── 2026-03-monthly.md     # 月报（统一命名格式）
```

**周报/月报命名同步更新**：从 `YYYY-WXX.md` / `YYYY-MM.md` 改为 `YYYY-WXX-weekly.md` / `YYYY-MM-monthly.md`。

---

## 6. 完整日报模板示例

参见附录：`daily-report-template-example.md`（包含完整的示例内容）。

---

## 7. 实现计划概要

### 新增文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `agents/intelligence-daily-writer.md` | Agent | 日报撰写 Agent |
| `skills/intelligence-output-templates/references/daily-report-template.md` | 模板 | 日报模板定义 |

### 修改文件

| 文件 | 改动说明 |
|------|---------|
| `scripts/reporting/scan-cards.ts` | 新增 `--date`、`--format` 参数 |
| `commands/intel-distill.md` | 新增 `--report daily` 参数说明 |
| `skills/intelligence-output-templates/SKILL.md` | 新增日报模板引用 |
| `scripts/reporting/scan-cards.ts`（周报/月报） | 同步命名格式 |

### 版本更新

- 插件版本：`1.7.6` → `1.8.0`（新增功能）
- 仓库版本：`1.0.27` → `1.0.28`

---

## 8. 风险与考量

### 8.1 Agent 输出质量

**风险**：Agent 聚合判断可能不准确，导致日报内容组织混乱。

**缓解措施**：
- 在 Agent prompt 中明确聚合判断逻辑和优先级
- 提供示例输出供 Agent 参考
- 后续可收集用户反馈迭代优化

### 8.2 日报内容量

**风险**：当日情报卡片数量过少（如 0-2 条）或过多（如 20+ 条），日报结构可能不适用。

**缓解措施**：
- 情报卡片数量为 0 时，输出提示"今日无新增情报卡片"
- 情报卡片数量过多时，重点关注板块控制数量（最多 5 条），其余在情报概览展示

### 8.3 首次使用体验

**风险**：用户首次使用 `--report daily` 时，可能不清楚输出位置和格式。

**缓解措施**：
- 命令执行后输出明确的文件路径提示
- 在插件 README 中补充日报使用说明

---

## 附录：完整日报模板示例

```markdown
---
report_type: daily
date: 2026-04-06
generated_at: 2026-04-06T18:30:00
generated_by: intelligence-daily-writer
intelligence_count: 10
domains_covered: [Threat-Landscape, Industry-Analysis, Vendor-Intelligence, Capital-Investment]
high_priority_count: 4
---

# 2026-04-06 情报日报

## 执行摘要

今日情报呈现三个值得关注的方向。厂商层面，CrowdStrike 动作密集——产品发布与融资同步推进，显示出在 AI 安全赛道上的加速姿态，与微软、Palo Alto Networks 的竞争将更趋激烈。威胁层面，供应链攻击持续发酵，APT-X 组织针对能源行业的攻击手法升级，微软快速推出检测工具，攻防博弈的时间差值得关注。政策层面，中国 AI 安全治理指南的出台将重塑国内 AI 产品合规格局，对安全厂商的 AI 模块开发亦有直接影响。总体而言，今日情报指向一个趋势：AI 正在成为安全市场竞争的核心变量，同时也是监管关注的新焦点。

---

## 情报概览

### CrowdStrike 发布 AI 增强产品并获得战略投资

CrowdStrike 今日宣布 Falcon XDR 新版本集成 AI 威胁检测模块，可自动识别异常行为并生成攻击链分析报告，检测效率提升 **40%**。同时，公司获得 **2 亿美元** 战略投资，由 Sequoia Capital 领投，主要用于亚太市场扩展和 AI 能力研发。这一系列动作显示 CrowdStrike 在 AI 驱动安全领域持续加码，与微软、Palo Alto Networks 形成正面竞争。

- 产品发布：Falcon XDR 新增 AI 威胁检测模块，检测效率提升 40%... [[20260406-crowdstrike-falcon-xdr]]
- 融资动态：2 亿美元战略投资，Sequoia 领投，拓展亚太... [[20260406-crowdstrike-funding]]

### AI Agent 重构安全运营商业模式

AI Agent 技术正在重塑安全运营的交付模式。传统 MSS/MDR 服务依赖人工分析响应，而 AI Agent 可实现自动化威胁检测、调查和响应（TDIR），将服务成本降低 **60%**，响应时间从小时级缩短至分钟级。这一变革催生新的商业模式——AI 增强型托管服务，传统 MSSP 面临转型压力。

- 行业分析：Gartner 预测 2026 年 AI 安全市场达 85 亿美元，年增长 32%... [[20260406-gartner-ai-security-market]]
- 厂商情报：OpenAI 与 Palo Alto Networks 达成 AI 安全合作... [[20260406-openai-paloalto-collab]]
- 政策法规：中国工信部发布 AI 安全治理指南... [[20260406-china-ai-security-guide]]

**商业模式影响**：MSSP 需从"人力密集型"转向"AI 增强型"，否则面临成本劣势。

### 供应链安全风险持续升温

近期供应链攻击事件频发，引发行业高度关注。**APT-X 组织**针对能源行业发起供应链攻击，通过工业控制软件更新渠道植入恶意代码，影响 **12 家** 能源企业。微软随即发布供应链安全检测工具 Supply Chain Guard，可扫描第三方组件依赖关系并识别潜在风险。两者时间上的关联性值得关注——攻击事件可能催生防御工具的快速发布。

- 威胁态势：APT-X 组织针对能源行业供应链攻击，影响 12 家企业... [[20260406-aptx-supplychain]]
- 厂商情报：微软发布 Supply Chain Guard 供应链安全检测工具... [[20260406-microsoft-supplychain-tool]]

### 独立情报

以下情报未发现明显关联，单独列出：

- 勒索软件 LockBit 3.0 变体出现，采用双重勒索策略... [[20260406-lockbit-ransomware]]
  （威胁态势）

- Fortinet 收购 SD-WAN 厂商 Celerity，扩展网络边界产品线... [[20260406-fortinet-acquisition]]
  （资本动态）

---

## 重点关注

### CrowdStrike 双重动作的战略意图

CrowdStrike 今日同步发布产品更新和融资消息，节奏密集，值得深入解读。

**产品层面**：Falcon XDR 集成 AI 威胁检测模块，检测效率提升 40%，这与微软 Sentinel 的 AI 能力、Palo Alto Networks Cortex XDR 的自动化分析形成直接对标。关键问题：CrowdStrike 的 AI 模块技术差异点是什么？是否基于专有模型还是第三方集成？

**资本层面**：2 亿美元融资由 Sequoia 领投，时机与产品发布同步。需分析资金用途——公告提到亚太市场扩展和 AI 研发，但具体比例未披露。亚太市场扩展是否针对中国 MSSP 合作伙伴？AI 研发是否用于收购 AI 安全初创公司？

**竞争格局影响**：CrowdStrike、微软、Palo Alto Networks 三家均在 AI 安全领域发力，市场格局可能从 XDR 功能竞争转向 AI 能力竞争。建议跟踪三家厂商的 AI 模块技术路线和客户案例对比。

**相关情报卡片**：[[20260406-crowdstrike-falcon-xdr]]、[[20260406-crowdstrike-funding]]

---

### APT-X 供应链攻击的技术细节与防护建议

APT-X 组织针对能源行业的供应链攻击是近期系列攻击的重要节点，需要技术层面的深入分析。

**攻击手法**：通过工业控制软件更新渠道植入恶意代码，影响 12 家能源企业。关键问题：恶意代码的具体功能是什么（数据窃取、系统破坏、还是潜伏等待）？植入点在软件供应链的哪个环节（源代码、编译过程、还是分发渠道）？

**微软响应**：Supply Chain Guard 检测工具快速发布，时间上与攻击披露接近。需验证：该工具能否检测本次攻击植入的恶意代码？还是通用供应链风险扫描？微软是否有受影响客户？

**防护建议**：能源行业供应链安全需要多层防护——软件来源验证、更新渠道加密、运行时行为监控。建议追踪后续受影响企业名单和补救措施。

**相关情报卡片**：[[20260406-aptx-supplychain]]、[[20260406-microsoft-supplychain-tool]]

---

### AI 安全治理指南合规解读

中国工信部《AI 安全治理指南》首次明确 AI 模型上线前的安全评估要求，对国内 AI 产品厂商影响显著。

**评估要求**：公告要求 AI 模型上线前进行安全评估，但具体流程和标准未公开。需关注后续细则发布——评估主体是厂商自评还是第三方机构？评估标准涉及哪些维度（数据安全、算法透明性、对抗攻击）？

**合规成本**：安全评估将增加 AI 产品上线周期和成本。对于安全厂商，AI 安全产品本身是否需要评估？评估要求与产品功能（如威胁检测 AI）是否存在矛盾？

**国际对比**：中国 AI 安全治理指南与欧盟 AI Act 的监管思路差异是什么？国内厂商出海产品是否需要同时满足两套合规要求？

**相关情报卡片**：[[20260406-china-ai-security-guide]]

---

## 工作统计

| 指标 | 数量 |
|------|------|
| 新增情报卡片 | 10 |
| 情报领域覆盖 | 4 |
| 来源数量 | 6 |
| 重点关注情报 | 4 |

**领域分布**：威胁态势 3 条，厂商情报 3 条，资本动态 2 条，行业分析 2 条
```