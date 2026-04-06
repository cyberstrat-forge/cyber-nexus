# Intelligence Daily Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add daily intelligence report feature to market-radar plugin, enabling team members to quickly discover intelligence cards worth deep research.

**Architecture:** Extend scan-cards.ts with --date parameter, create intelligence-daily-writer Agent for content aggregation and analysis, update intel-distill command with --report daily support.

**Tech Stack:** TypeScript, Commander.js, glob, Agent system

---

## File Structure

```
plugins/market-radar/
├── agents/
│   └── intelligence-daily-writer.md    # NEW: Daily report Agent
├── commands/
│   └── intel-distill.md                # MODIFY: Add --report daily
├── scripts/
│   └── reporting/
│       └── scan-cards.ts               # MODIFY: Add --date, --format, --preview params
└── skills/
    └── intelligence-output-templates/
        ├── SKILL.md                    # MODIFY: Add daily report reference
        └── references/
            └── daily-report-template.md  # NEW: Daily report template
```

---

## Task 1: Extend scan-cards.ts with Daily Mode

**Files:**
- Modify: `plugins/market-radar/scripts/reporting/scan-cards.ts`

### Step 1: Add new CLI parameters

Add `--date`, `--format`, `--preview` parameters to the program definition:

```typescript
program
  .name('scan-cards')
  .description('Scan intelligence cards within a time range')
  .option('--period <type>', 'Period type: weekly, monthly, or daily', 'weekly')
  .option('--param <value>', 'Period parameter: 2026-W10, 2026-03, or 2026-04-06 (for daily)')
  .option('--date <date>', 'Specific date for daily report (YYYY-MM-DD), takes priority over --param')
  .option('--format <format>', 'Output format: list or json', 'list')
  .option('--preview', 'Preview mode: output to terminal without writing file', false)
  .option('--output-dir <dir>', 'Intelligence cards output directory', '.')
  .parse(process.argv);
```

- [ ] **Step 1: Add new CLI parameters**

### Step 2: Update calculateDateRange function with daily mode and parameter priority

Modify `calculateDateRange` to handle daily mode with proper parameter priority (`--date` > `--param` > today):

```typescript
function calculateDateRange(period: string, param?: string, dateParam?: string): { start: string; end: string } {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (period === 'daily') {
    // Daily mode: single date
    // Priority: --date > --param > today
    const targetDate = dateParam || param || todayStr;
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      throw new Error(`Invalid date format: ${targetDate}. Expected YYYY-MM-DD`);
    }
    return { start: targetDate, end: targetDate };
  }

  // ... existing weekly/monthly logic remains unchanged ...
}
```

- [ ] **Step 2: Update calculateDateRange for daily mode with parameter priority**

### Step 3: Update main function to pass date parameter

Modify the main function to pass `dateParam` to `calculateDateRange`:

```typescript
const options = program.opts();

const period = options.period as string;
const periodParam = options.param as string | undefined;
const dateParam = options.date as string | undefined;
const format = options.format as string;
const preview = options.preview as boolean;
const outputDir = options.outputDir as string;

// 验证 period 参数
if (!['weekly', 'monthly', 'daily'].includes(period)) {
  console.error(JSON.stringify({
    error: true,
    message: `Invalid period type: ${period}. Must be 'weekly', 'monthly', or 'daily'`
  }));
  process.exit(1);
}

try {
  // 计算时间范围，传入 dateParam
  const dateRange = calculateDateRange(period, periodParam, dateParam);
  
  // ... rest of main function ...
}
```

- [ ] **Step 3: Update main function parameter handling**

### Step 4: Add CardMetadataFull interface for JSON output

Add a new interface for full metadata (used only in JSON format, does not affect existing list format):

```typescript
// 现有接口保持不变
interface CardMetadata {
  title: string;
  created_date: string;
  primary_domain: string;
}

// 新增：完整元数据接口（仅用于 JSON 输出）
interface CardMetadataFull {
  intelligence_id: string;
  title: string;
  created_date: string;
  primary_domain: string;
  secondary_domains: string[];
  security_relevance: string;
  tags: string[];
  published_at?: string;
  source_name?: string;
  source_tier?: string;
  item_id?: string;
  item_title?: string;
  original_url?: string;
  completeness_score?: number;
  archived_file?: string;
  converted_file?: string;
  card_path: string;
  body_summary?: string;
  // Domain-specific fields for aggregation
  threat_type?: string;
  threat_actor?: string;
  target_sector?: string;
  target_region?: string;
  vendor_name?: string;
  tech_name?: string;
  policy_name?: string;
  company?: string;
  investors?: string;
  event_type?: string;
}

// 新增：JSON 输出结构
interface ScanResultJson {
  date: string;
  intelligence_cards: CardMetadataFull[];
  stats: {
    total_count: number;
    domains_distribution: Record<string, number>;
    sources_distribution: Record<string, number>;
  };
}
```

- [ ] **Step 4: Add CardMetadataFull and ScanResultJson interfaces**

### Step 5: Add scanCardsFull function for JSON output

Add a new function to extract full metadata and body summary (does not modify existing scanCards):

```typescript
/**
 * 扫描卡片并返回完整元数据（用于 Agent）
 * 此函数不影响现有的 scanCards 函数
 */
async function scanCardsFull(
  outputDir: string,
  dateRange: { start: string; end: string }
): Promise<CardMetadataFull[]> {
  const cards: CardMetadataFull[] = [];

  for (const domain of INTELLIGENCE_DOMAINS) {
    const domainPath = join(outputDir, domain);

    try {
      const files = await glob('**/*.md', { cwd: domainPath, absolute: false });

      for (const file of files) {
        const filePath = join(domainPath, file);

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const { data: frontmatter, content: body } = parseFrontmatter(content);

          const createdDate = frontmatter.created_date as string;
          if (!createdDate || !/^\d{4}-\d{2}-\d{2}$/.test(createdDate)) {
            continue;
          }

          if (createdDate >= dateRange.start && createdDate <= dateRange.end) {
            // Extract body summary (first 500 chars, excluding frontmatter)
            const bodySummary = body.slice(0, 500).trim();
            
            // Extract filename from card_path for Obsidian link
            const fileName = file.replace('.md', '');

            cards.push({
              intelligence_id: (frontmatter.intelligence_id as string) || '',
              title: (frontmatter.title as string) || fileName,
              created_date: createdDate,
              primary_domain: domain,
              secondary_domains: (frontmatter.secondary_domains as string[]) || [],
              security_relevance: (frontmatter.security_relevance as string) || 'medium',
              tags: (frontmatter.tags as string[]) || [],
              published_at: frontmatter.published_at as string,
              source_name: frontmatter.source_name as string,
              source_tier: frontmatter.source_tier as string,
              item_id: frontmatter.item_id as string,
              item_title: frontmatter.item_title as string,
              original_url: frontmatter.original_url as string,
              completeness_score: frontmatter.completeness_score as number,
              archived_file: frontmatter.archived_file as string,
              converted_file: frontmatter.converted_file as string,
              card_path: `${domain}/${file}`,
              body_summary: bodySummary,
              // Domain-specific fields
              threat_type: frontmatter.threat_type as string,
              threat_actor: frontmatter.threat_actor as string,
              target_sector: frontmatter.target_sector as string,
              target_region: frontmatter.target_region as string,
              vendor_name: frontmatter.vendor_name as string,
              tech_name: frontmatter.tech_name as string,
              policy_name: frontmatter.policy_name as string,
              company: frontmatter.company as string,
              investors: frontmatter.investors as string,
              event_type: frontmatter.event_type as string,
            });
          }
        } catch (fileErr) {
          const errMsg = fileErr instanceof Error ? fileErr.message : String(fileErr);
          console.warn(`Warning: Failed to process file ${filePath}: ${errMsg}`);
        }
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        console.warn(`Warning: Failed to scan domain ${domain}: ${err.message}`);
      }
    }
  }

  return cards;
}
```

- [ ] **Step 5: Add scanCardsFull function**

### Step 6: Add JSON output format handling in main()

Add format branching in main function (preserves existing list format behavior):

```typescript
// 在 main() 函数中，计算时间范围后添加格式分支

if (format === 'json') {
  // === JSON 输出格式（供 Agent 使用）===
  const fullCards = await scanCardsFull(outputDir, dateRange);
  
  // Build stats
  const domainsDistribution: Record<string, number> = {};
  const sourcesDistribution: Record<string, number> = {};
  
  for (const card of fullCards) {
    domainsDistribution[card.primary_domain] = (domainsDistribution[card.primary_domain] || 0) + 1;
    if (card.source_name) {
      sourcesDistribution[card.source_name] = (sourcesDistribution[card.source_name] || 0) + 1;
    }
  }

  // Determine output date
  let outputDate: string;
  if (period === 'daily') {
    outputDate = dateParam || periodParam || new Date().toISOString().split('T')[0];
  } else {
    outputDate = formatPeriodParam(period, periodParam, dateRange);
  }

  const jsonResult: ScanResultJson = {
    date: outputDate,
    intelligence_cards: fullCards.sort((a, b) => b.created_date.localeCompare(a.created_date)),
    stats: {
      total_count: fullCards.length,
      domains_distribution: domainsDistribution,
      sources_distribution: sourcesDistribution
    }
  };

  console.log(JSON.stringify(jsonResult, null, 2));
} else {
  // === 现有 list 格式（保持不变）===
  const cards = await scanCards(outputDir, dateRange);

  // ... existing list format logic unchanged ...
}
```

- [ ] **Step 6: Add JSON output format handling**

### Step 7: Commit scan-cards.ts changes

```bash
git add plugins/market-radar/scripts/reporting/scan-cards.ts
git commit -m "feat(market-radar): add daily mode and JSON output to scan-cards

- Add --date parameter with priority over --param for daily mode
- Add --format json for Agent consumption with full metadata
- Add --preview flag (infrastructure for future use)
- Add scanCardsFull function for body_summary extraction
- Preserve existing list format behavior unchanged"
```

- [ ] **Step 7: Commit scan-cards.ts changes**

---

## Task 2: Create Daily Report Agent

**Files:**
- Create: `plugins/market-radar/agents/intelligence-daily-writer.md`

### Step 1: Create Agent file with frontmatter

Create the Agent file with YAML frontmatter:

```markdown
---
name: intelligence-daily-writer
description: |
  Use this agent when intel-distill command needs to generate daily 
  intelligence reports from scanned card list. This agent analyzes 
  cards, identifies aggregation patterns, and generates structured 
  daily reports with executive summary, overview, and key focus sections.

  <example>
  Context: scan-cards script has returned 12 cards for today
  user: "/intel-distill --report daily"
  assistant: "I'll generate a daily intelligence report using the 
  intelligence-daily-writer agent."
  <commentary>
  User requested daily report. The intelligence-daily-writer agent 
  receives card list from scan-cards script and generates daily report.
  </commentary>
  </example>

  <example>
  Context: scan-cards script has returned 0 cards for specified date
  user: "/intel-distill --report daily --date 2026-04-05"
  assistant: "No intelligence cards found for 2026-04-05. Report not generated."
  <commentary>
  No cards found for specified date. Agent should handle empty list case.
  </commentary>
  </example>

model: inherit
color: blue
tools: ["Read", "Write"]
skills:
  - cybersecurity-domain-knowledge
  - intelligence-output-templates
---
```

- [ ] **Step 1: Create Agent frontmatter**

### Step 2: Add Agent task mission and input parameters

```markdown
你是一名专注于情报日报撰写的专业代理。你的职责是分析情报卡片内容，识别聚合模式，生成结构化的情报日报。

## 任务使命

根据扫描脚本返回的情报卡片列表，生成包含执行摘要、情报概览、重点关注和工作统计的日报。

## 输入参数

你将收到以下信息作为 prompt 输入：

```
生成情报日报：

**cards_data**:
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
      "card_path": "Vendor-Intelligence/2026/04/20260406-crowdstrike-falcon-xdr.md",
      "body_summary": "...(正文前 500 字摘要)",
      "vendor_name": "CrowdStrike",
      "tech_name": "Falcon XDR"
    }
  ],
  "stats": {
    "total_count": 10,
    "domains_distribution": {...},
    "sources_distribution": {...}
  }
}
```

**output_dir**: ./intelligence
**date**: 2026-04-06
```

**cards_data 字段说明**：

| 字段 | 说明 | 用途 |
|------|------|------|
| `card_path` | 卡片相对路径 | 生成 Obsidian 链接 `[[filename]]` |
| `body_summary` | 正文前 500 字摘要 | 理解卡片内容进行聚合 |
| `vendor_name`, `company` | 厂商/公司名称 | 主体聚合识别 |
| `threat_actor` | 威胁组织名称 | 主体聚合识别 |
| `tech_name` | 技术名称 | 主体/主题聚合识别 |
| `tags` | 标签数组 | 地域聚合（geo/）、商业模式聚合（business/） |
| `primary_domain` | 主领域 | 领域分布统计 |
```

- [ ] **Step 2: Add input parameters documentation**

### Step 3: Add aggregation logic with 8 dimensions

```markdown
## 执行流程

### 步骤 1：检查情报卡片列表

如果 `intelligence_cards.length == 0`：
- 输出："今日无新增情报卡片"
- 不生成报告文件
- 结束任务

### 步骤 2：聚合判断逻辑

按优先级依次判断情报卡片间的关联关系：

#### 优先级 1（强关联）

1. **主体聚合**：同一实体（厂商/组织/技术）在多张卡片出现
   - 识别字段：`vendor_name`, `threat_actor`, `tech_name`, `policy_name`, `company`, `investors`
   - 从 `tags` 中提取厂商名称（如 "CrowdStrike"、"Palo-Alto"）
   - 示例：CrowdStrike 的产品发布 + 融资消息

2. **事件链条聚合**：多张卡片构成因果/时间序列关系
   - 识别方式：分析 body_summary 中的因果关系描述
   - 示例：漏洞披露 → 攻击利用 → 厂商响应

#### 优先级 2（中等关联）

3. **商业模式聚合**：情报对网络安全商业模式产生共同影响
   - 影响类型：模式重构、模式扩展、新模式兴起、模式衰退
   - 识别依据：
     - `tags` 中的 `business/` 标签（如 `business/MSSP`, `business/SECaaS`）
     - 领域特定内容分析：
       - `Emerging-Tech`: 技术创新驱动模式变革（如 AI Agent）
       - `Industry-Analysis`: 市场趋势反映模式变化
       - `Vendor-Intelligence`: 厂商战略转型
       - `Customer-Market`: 客户需求变化驱动模式调整
       - `Policy-Regulation`: 合规要求催生新模式
       - `Capital-Investment`: 投资热点反映模式趋势

4. **跨领域关联聚合**：卡片间存在领域间关联关系
   - 技术-威胁关联：新技术创造新攻击面/防御能力
   - 厂商-资本关联：融资驱动厂商战略动向
   - 政策-客户关联：法规驱动客户需求变化
   - 行业背景关联：多条情报共享同一市场背景

#### 优先级 3（弱关联）

5. **主题聚合**：多张卡片涉及同一主题/类型
   - 识别字段：`threat_type`, `tech_name`, 从 `tags` 提取共同关键词
   - 示例：多条勒索软件相关情报（`ransomware` 标签）

6. **地域聚合**：多张卡片聚焦同一地理区域
   - 识别字段：`tags` 中的 `geo/` 标签，`target_region`
   - 示例：多条 `geo/china` 相关的政策/厂商情报

7. **时间序列聚合**：同一主题/主体在不同时间点的演变
   - 对于日报，当日卡片通常日期相同，此聚合较少使用
   - 如有不同日期的卡片（历史日报补生成），可用于展示演变

#### 兜底处理

8. **独立展示**：无明显关联的情报，单独列出，按领域标注

**聚合输出格式**：

```markdown
### {聚合标题}

{关联分析描述，自然语言段落，关键数据加粗}

- {卡片标题简述}... [[{card_path中的文件名}]]
- {卡片标题简述}... [[{card_path中的文件名}]]

**商业模式影响**：{仅商业模式聚合时添加，描述对商业模式的影响}
```

**聚合标题要求**：
- 带语义概要（如"CrowdStrike 发布新产品并获得战略投资"）
- 不暴露内部聚合类型标注
```

- [ ] **Step 3: Add aggregation logic**

### Step 4: Add key focus judgment criteria with quantity limit

```markdown
### 步骤 3：重点关注判断标准

从情报卡片中识别高价值情报进入重点关注板块。

**判断标准**（任一满足即可）：
- 情报涉及头部厂商重大动态（产品发布、融资、战略调整）
- 情报揭示行业趋势变化（新技术兴起、市场格局变化）
- 情报涉及高影响力威胁事件（大规模攻击、新型攻击手法）
- 情报涉及合规政策变化（影响厂商运营、产品合规）
- 情报涉及商业模式变革（新模式兴起、传统模式衰退）

**筛选规则**：
- 从聚合后的情报中筛选，而非原始卡片
- **重点关注数量控制**：
  - 理想数量：3-5 条
  - 最多不超过 5 条
  - 如果高价值情报超过 5 条，选择影响最大、时效性最强的 5 条
- 每条重点关注需深入分析，提出研究问题

**输出格式**：

```markdown
### {重点关注标题}

{深入分析描述，200-300 字}

**关键问题**：{提出 2-3 个研究问题}

**相关情报卡片**：[[{card_path文件名}]]、[[{card_path文件名}]]
```
```

- [ ] **Step 4: Add key focus criteria with quantity limit**

### Step 5: Add output requirements for all sections

```markdown
### 步骤 4：生成日报内容

#### 4.1 执行摘要（编辑点评视角）

以自然语言段落形式撰写，不使用列表：

**内容要素**：
- 今日情报总体情况（数量、领域覆盖）
- 2-3 个关键动向概述
- 潜在影响提示
- 战略意义总结

**写作要求**：
- 单一段落，流畅自然
- 突出趋势和关联
- 编辑点评视角，非机械汇总

**示例**：
```markdown
今日情报呈现三个值得关注的方向。厂商层面，CrowdStrike 动作密集——产品发布与融资同步推进，显示出在 AI 安全赛道上的加速姿态。威胁层面，供应链攻击持续发酵，攻防博弈的时间差值得关注。政策层面，AI 安全治理指南的出台将重塑合规格局。总体而言，AI 正在成为安全市场竞争的核心变量。
```

#### 4.2 情报概览

按聚合维度组织内容，遍历所有聚合后的情报组：

**格式**：
```markdown
### {聚合标题}

{关联分析描述}

- {卡片简述}... [[{文件名}]]
- {卡片简述}... [[{文件名}]]

**商业模式影响**：{仅商业模式聚合时添加}
```

**Obsidian 链接格式**：
- 从 `card_path` 提取文件名：`Vendor-Intelligence/2026/04/20260406-crowdstrike.md` → `[[20260406-crowdstrike]]`
- 使用 `[[filename]]` 格式，不含路径

#### 4.3 重点关注

遍历筛选出的重点关注情报（最多 5 条）：

**格式**：
```markdown
### {重点关注标题}

{深入分析，200-300 字}

**关键问题**：{研究问题}

**相关情报卡片**：[[{文件名}]]、[[{文件名}]]
```

**深入分析要求**：
- 提出研究问题而非重复内容
- 包含技术细节追问
- 包含对比分析建议
- 包含后续跟踪方向

#### 4.4 工作统计

数据表格格式：

```markdown
| 指标 | 数量 |
|------|------|
| 新增情报卡片 | {stats.total_count} |
| 情报领域覆盖 | {Object.keys(stats.domains_distribution).length} |
| 来源数量 | {Object.keys(stats.sources_distribution).length} |
| 重点关注情报 | {重点关注数量} |

**领域分布**：{从 stats.domains_distribution 生成，如"威胁态势 3 条，厂商情报 3 条..."}
```
```

- [ ] **Step 5: Add output requirements**

### Step 6: Add file output steps

```markdown
### 步骤 5：创建报告目录

使用 Write 工具前，检查并创建目录：

1. 检查 `{output_dir}/reports/daily/` 是否存在
2. 如不存在，创建目录结构

### 步骤 6：写入报告文件

使用 Write 工具写入日报文件：

**文件路径**：`{output_dir}/reports/daily/{date}-daily.md`

**文件命名规则**：
- 格式：`YYYY-MM-DD-daily.md`
- 示例：`2026-04-06-daily.md`

**frontmatter 结构**：

```yaml
---
report_type: daily
date: {date}
generated_at: {当前时间 ISO 8601}
generated_by: intelligence-daily-writer
intelligence_count: {卡片总数}
domains_covered: [{领域列表}]
high_priority_count: {重点关注数量}
---
```

### 步骤 7：显示报告内容

完成写入后：
1. 显示报告文件路径
2. 显示完整的报告 Markdown 内容
```

- [ ] **Step 6: Add file output steps**

### Step 7: Commit Agent file

```bash
git add plugins/market-radar/agents/intelligence-daily-writer.md
git commit -m "feat(market-radar): add intelligence-daily-writer agent

- 8 aggregation dimensions with priority ordering
- Business model aggregation for cybersecurity industry
- Key focus selection with max 5 items limit
- Executive summary in editorial perspective
- Natural language output format with Obsidian links"
```

- [ ] **Step 7: Commit Agent file**

---

## Task 3: Update intel-distill Command

**Files:**
- Modify: `plugins/market-radar/commands/intel-distill.md`

### Step 1: Update argument-hint and parameter table

Update the frontmatter argument-hint:

```yaml
argument-hint: "[--source <目录>] [--output <目录>] [--review <list|approve|reject> [pending_id] [--reason <原因>]] [--report <daily|weekly|monthly> [周期]] [--date <日期>]"
```

Update the parameter table in the command body:

```markdown
| 参数 | 必填 | 说明 |
|------|------|------|
| `--source <dir>` | 否 | 待扫描的源文件目录（默认：./inbox） |
| `--output <dir>` | 否 | 情报卡片输出目录（默认：./intelligence） |
| `--review <action>` | 否 | 审核操作：`list`/`approve`/`reject` |
| `--reason <text>` | 条件 | 审核原因（approve/reject 时推荐） |
| `--report <type> [period]` | 否 | 生成情报报告：`daily`/`weekly`/`monthly` |
| `--date <date>` | 否 | 日报日期（YYYY-MM-DD，仅 daily 模式） |
| `--help` | 否 | 显示使用帮助 |
```

- [ ] **Step 1: Update argument-hint and parameter table**

### Step 2: Add daily report examples

Add daily report examples after the existing examples:

```markdown
```bash
# === 报告模式 ===

# 生成今日日报
/intel-distill --report daily

# 生成指定日期日报
/intel-distill --report daily --date 2026-04-05

# 生成当前周报
/intel-distill --report weekly

# 生成指定周报
/intel-distill --report weekly 2026-W10

# 生成当前月报
/intel-distill --report monthly

# 生成指定月报
/intel-distill --report monthly 2026-03

# 显示帮助
/intel-distill --help
```

**注意**：
- `--report daily` 默认今天日期
- `--date` 参数仅对 daily 模式有效
- `--report` 参数仅从现有情报卡片生成报告，不执行新的情报提取
```

- [ ] **Step 2: Add daily report examples**

### Step 3: Add daily report flow documentation

Add detailed daily report flow after the existing report flow (步骤 R0-R5):

```markdown
### 步骤 R1.1：日报模式参数处理

当 `--report daily` 时：

```bash
# 解析日期参数
date_param = --date 参数值 || --report 后的周期参数 || 今天日期

# 验证日期格式
if (date_param 不匹配 YYYY-MM-DD 格式) {
  输出错误："Invalid date format: {date_param}. Expected YYYY-MM-DD"
  结束流程
}
```

### 步骤 R1.2：调用扫描脚本（日报模式）

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx reporting/scan-cards.ts \
  --period daily \
  --date "{date_param}" \
  --format json \
  --output-dir {output}
```

**参数说明**：
- `--period daily`：日报模式
- `--date {date_param}`：指定日期（已验证格式）
- `--format json`：输出 JSON 格式供 Agent 使用
- `--output-dir {output}`：情报卡片目录

### 步骤 R2.1：解析扫描结果

1. 捕获 scan-cards.ts 的 JSON 输出
2. 解析为 JavaScript 对象
3. 提取 `intelligence_cards` 数组和 `stats` 对象

### 步骤 R3.1：日报卡片检查

| 条件 | 操作 |
|------|------|
| `intelligence_cards.length == 0` | 输出"今日（{date}）无新增情报卡片"，结束流程 |
| `intelligence_cards.length > 0` | 继续调用 Agent |

### 步骤 R4.1：调用日报 Agent

使用 Agent 工具调用日报 Agent：

```
subagent_type: intelligence-daily-writer
prompt: |
  生成情报日报：

  **cards_data**:
  ```json
  {扫描脚本的完整 JSON 输出}
  ```

  **output_dir**: {output}
  **date**: {date_param}
```

**Agent 职责**：
- 分析情报卡片内容
- 识别聚合模式
- 生成执行摘要、情报概览、重点关注
- 写入日报文件到 `reports/daily/`

### 步骤 R5.1：显示日报位置和内容

1. 显示日报文件路径
2. 显示完整的日报 Markdown 内容

```
✅ 情报日报已生成

报告文件: {output}/reports/daily/{date}-daily.md

--- 报告内容 ---

[展示完整 Markdown 内容]
```
```

- [ ] **Step 3: Add daily report flow documentation**

### Step 4: Commit intel-distill changes

```bash
git add plugins/market-radar/commands/intel-distill.md
git commit -m "feat(market-radar): add --report daily support to intel-distill

- Add daily report parameter documentation
- Add --date parameter for daily mode
- Add detailed daily report flow (R1.1-R5.1)
- Update argument-hint with daily option"
```

- [ ] **Step 4: Commit command changes**

---

## Task 4: Update Output Templates Skill

**Files:**
- Modify: `plugins/market-radar/skills/intelligence-output-templates/SKILL.md`
- Create: `plugins/market-radar/skills/intelligence-output-templates/references/daily-report-template.md`

### Step 1: Add daily report section to SKILL.md

Add the following section to SKILL.md after the existing content:

```markdown
## 日报模板

日报模板定义参见：

- **`references/daily-report-template.md`**

### 日报输出特点

| 特性 | 日报 | 周报/月报 |
|------|------|---------|
| 组织逻辑 | Agent 动态聚合 | 领域分组 |
| 执行摘要 | 编辑点评视角 | 统计汇总 |
| 输出风格 | 自然语言叙述 | 结构化报告 |
| 目标读者 | 团队情报成员 | 管理层/决策者 |

### 日报聚合维度

Agent 按优先级识别 8 种聚合维度：

1. **主体聚合**（优先级 1）：同一厂商/组织/技术
2. **事件链条聚合**（优先级 1）：因果关系
3. **商业模式聚合**（优先级 2）：对网络安全商业模式的影响
4. **跨领域关联聚合**（优先级 2）：技术-威胁、厂商-资本等
5. **主题聚合**（优先级 3）：同一主题/类型
6. **地域聚合**（优先级 3）：同一地理区域
7. **时间序列聚合**（优先级 3）：不同时间点的演变
8. **独立展示**（兜底）：无明显关联
```

- [ ] **Step 1: Add daily report section to SKILL.md**

### Step 2: Create daily-report-template.md

Create the template file:

```markdown
# Daily Report Template

> 情报日报模板定义（v1.0）

## Frontmatter 结构

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

## 正文结构

1. **执行摘要**（编辑点评，自然语言段落）
   - 今日情报总体情况
   - 2-3 个关键动向概述
   - 潜在影响提示
   - 战略意义总结

2. **情报概览**（有机聚合 + 卡片跳转）
   - 按聚合维度组织
   - 每组包含关联分析和 Obsidian 链接

3. **重点关注**（深入分析，提出研究问题）
   - 最多 5 条
   - 每条 200-300 字
   - 提出研究问题

4. **工作统计**（数据表格）
   - 新增情报卡片数量
   - 领域分布
   - 来源分布

---

## 完整示例

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

- 行业分析：Gartner 预测 2026 年 AI 安全市场达 85 亿美元... [[20260406-gartner-ai-security-market]]
- 厂商情报：OpenAI 与 Palo Alto Networks 达成 AI 安全合作... [[20260406-openai-paloalto-collab]]
- 政策法规：中国工信部发布 AI 安全治理指南... [[20260406-china-ai-security-guide]]

**商业模式影响**：MSSP 需从"人力密集型"转向"AI 增强型"，否则面临成本劣势。

### 供应链安全风险持续升温

近期供应链攻击事件频发，引发行业高度关注。**APT-X 组织**针对能源行业发起供应链攻击，通过工业控制软件更新渠道植入恶意代码，影响 **12 家** 能源企业。微软随即发布供应链安全检测工具 Supply Chain Guard，可扫描第三方组件依赖关系并识别潜在风险。两者时间上的关联性值得关注——攻击事件可能催生防御工具的快速发布。

- 威胁态势：APT-X 组织针对能源行业供应链攻击... [[20260406-aptx-supplychain]]
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

**关键问题**：竞争格局将从 XDR 功能竞争转向 AI 能力竞争，建议跟踪三家厂商的技术路线对比。

**相关情报卡片**：[[20260406-crowdstrike-falcon-xdr]]、[[20260406-crowdstrike-funding]]

---

### APT-X 供应链攻击的技术细节与防护建议

APT-X 组织针对能源行业的供应链攻击是近期系列攻击的重要节点，需要技术层面的深入分析。

**攻击手法**：通过工业控制软件更新渠道植入恶意代码，影响 12 家能源企业。关键问题：恶意代码的具体功能是什么（数据窃取、系统破坏、还是潜伏等待）？植入点在软件供应链的哪个环节（源代码、编译过程、还是分发渠道）？

**微软响应**：Supply Chain Guard 检测工具快速发布，时间上与攻击披露接近。需验证：该工具能否检测本次攻击植入的恶意代码？还是通用供应链风险扫描？

**关键问题**：建议追踪后续受影响企业名单和补救措施，评估攻击影响范围。

**相关情报卡片**：[[20260406-aptx-supplychain]]、[[20260406-microsoft-supplychain-tool]]

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
```

- [ ] **Step 2: Create daily-report-template.md**

### Step 3: Commit template changes

```bash
git add plugins/market-radar/skills/intelligence-output-templates/
git commit -m "feat(market-radar): add daily report template documentation

- Add daily report section to SKILL.md with aggregation dimensions
- Create daily-report-template.md with full structure and example"
```

- [ ] **Step 3: Commit template changes**

---

## Task 5: Update Report File Naming Convention

**Files:**
- Modify: `plugins/market-radar/agents/intelligence-briefing-writer.md` (周报/月报命名)

### Step 1: Update weekly/monthly report naming in briefing-writer Agent

Modify the file naming section in `intelligence-briefing-writer.md`:

```markdown
### 步骤 9：写入报告文件并显示

使用 Write 工具写入：

```
{output_dir}/reports/{period}/{period_param}-{period}.md
```

**文件命名规则**：
- 周报：`2026-W15-weekly.md`（格式：`YYYY-WXX-weekly.md`）
- 月报：`2026-03-monthly.md`（格式：`YYYY-MM-monthly.md`）

**命名格式统一**：
- 日报：`YYYY-MM-DD-daily.md`
- 周报：`YYYY-WXX-weekly.md`
- 月报：`YYYY-MM-monthly.md`
```

- [ ] **Step 1: Update file naming convention**

### Step 2: Commit naming convention update

```bash
git add plugins/market-radar/agents/intelligence-briefing-writer.md
git commit -m "refactor(market-radar): unify report file naming convention

- Weekly: YYYY-WXX-weekly.md
- Monthly: YYYY-MM-monthly.md
- Daily: YYYY-MM-DD-daily.md (new)"
```

- [ ] **Step 2: Commit naming convention update**

---

## Task 6: Version Update

**Files:**
- Modify: `plugins/market-radar/.claude-plugin/plugin.json`
- Modify: `plugins/market-radar/CHANGELOG.md`
- Modify: `plugins/market-radar/README.md`
- Modify: `CHANGELOG.md`
- Modify: `README.md`

### Step 1: Update plugin.json version

```json
{
  "name": "market-radar",
  "version": "1.8.0",
  ...
}
```

- [ ] **Step 1: Update plugin version**

### Step 2: Update plugin CHANGELOG.md

Add new version entry at the top:

```markdown
## [1.8.0] - 2026-04-06

### 新增

- **情报日报功能**：新增 `--report daily` 参数，生成每日情报监测报告
  - 有机聚合：按主体/主题/事件链条等 8 种维度动态聚合情报卡片
  - 商业模式聚合：识别情报对网络安全商业模式的影响
  - 重点关注：深入分析，提出研究问题，最多 5 条
  - 执行摘要：编辑点评视角，自然语言段落

- **scan-cards.ts 扩展**
  - 新增 `--date` 参数：按指定日期过滤情报卡片（优先于 --param）
  - 新增 `--format json` 参数：输出 JSON 格式供 Agent 使用
  - 新增 `--preview` 参数：预览模式（基础设施）
  - 包含 body_summary 正文摘要（前 500 字）
  - 新增 scanCardsFull 函数：提取完整元数据

- **intelligence-daily-writer Agent**
  - 8 种聚合维度（主体、事件链条、商业模式、跨领域、主题、地域、时间序列、独立）
  - 重点关注判断标准和数量限制（最多 5 条）
  - 自然语言输出格式

### 变更

- intel-distill 命令新增 `--report daily` 和 `--date` 参数支持
- 报告文件命名格式统一：`YYYY-WXX-weekly.md`、`YYYY-MM-monthly.md`、`YYYY-MM-DD-daily.md`
```

- [ ] **Step 2: Update plugin CHANGELOG**

### Step 3: Update plugin README.md

Add daily report section:

```markdown
### 情报日报

生成今日情报日报：

```bash
/intel-distill --report daily
```

生成指定日期日报：

```bash
/intel-distill --report daily --date 2026-04-05
```

日报特点：
- **有机聚合**：按主体/主题/事件链条等维度动态聚合
- **商业模式洞察**：识别对网络安全商业模式的影响
- **重点关注**：深入分析，提出研究问题
- **编辑点评**：执行摘要以自然语言段落呈现

日报与周报/月报差异：
- 组织逻辑：Agent 动态聚合 vs 领域分组
- 输出风格：自然语言叙述 vs 结构化报告
- 目标读者：团队情报成员 vs 管理层
```

- [ ] **Step 3: Update plugin README**

### Step 4: Update root CHANGELOG.md

Add new version entry:

```markdown
## [1.0.28] - 2026-04-06

### 插件更新

#### market-radar v1.8.0

**新增**
- 情报日报功能：`--report daily` 参数，生成每日情报监测报告
- 8 种聚合维度（主体、事件链条、商业模式、跨领域等）
- 商业模式聚合：识别对网络安全商业模式的影响
- 重点关注：深入分析，提出研究问题（最多 5 条）
- scan-cards.ts 扩展：`--date`、`--format json` 参数
- intelligence-daily-writer Agent

**变更**
- 报告文件命名格式统一
```

- [ ] **Step 4: Update root CHANGELOG**

### Step 5: Update root README.md

Update plugin version in table:

```markdown
| [market-radar](./plugins/market-radar) | 1.8.0 | ✅ 可用 | 从文档中提取战略情报，生成情报卡片、日报和主题分析报告 |
```

- [ ] **Step 5: Update root README**

### Step 6: Commit version updates

```bash
git add -A
git commit -m "chore(market-radar): release v1.8.0 with daily report feature"
```

- [ ] **Step 6: Commit version updates**

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Task | Status |
|--------------|------|--------|
| 功能概述 | Task 2 (Agent), Task 4 (Template) | ✅ |
| 需求分析 | Task 2 (Aggregation logic) | ✅ |
| 技术架构 | Task 1, 2, 3, 4 | ✅ |
| scan-cards.ts 扩展 | Task 1 | ✅ |
| --date 参数 | Task 1 Step 1-2 | ✅ |
| --format json 参数 | Task 1 Step 4-6 | ✅ |
| --preview 参数 | Task 1 Step 1 | ✅ |
| intelligence-daily-writer Agent | Task 2 | ✅ |
| 日报模板 | Task 4 | ✅ |
| intel-distill 命令扩展 | Task 3 | ✅ |
| Agent 调用细节 | Task 3 Step 3 | ✅ |
| 重点关注数量限制 | Task 2 Step 4 | ✅ |
| 周报/月报命名格式 | Task 5 | ✅ |
| 版本更新 | Task 6 | ✅ |

### Correctness Checks

| Issue | Fix Location | Status |
|-------|--------------|--------|
| --date 和 --param 优先级 | Task 1 Step 2 | ✅ Fixed |
| JSON 输出格式说明 | Task 1 Step 4-6 | ✅ Fixed |
| Agent 调用细节 | Task 3 Step 3 | ✅ Fixed |
| 重点关注数量限制 | Task 2 Step 4 | ✅ Fixed |
| --preview 参数遗漏 | Task 1 Step 1 | ✅ Fixed |
| 周报/月报命名格式 | Task 5 | ✅ Fixed |

### Placeholder Scan

- No "TBD" found
- No "TODO" found  
- No "implement later" found
- All code blocks contain complete implementations

### Type Consistency

- `CardMetadataFull` interface defined in Task 1 Step 4
- `ScanResultJson` interface defined in Task 1 Step 4
- Agent input format matches scan-cards output
- File paths follow existing patterns