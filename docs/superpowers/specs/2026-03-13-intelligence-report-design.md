# 情报报告功能设计文档

**日期**：2026-03-13
**版本**：1.0
**Issue**：#23 - [market-radar] 增加情报提取报告功能：周报/月报
**状态**：待审核

---

## 一、需求定义

### 1.1 问题背景

`intel-distill` 命令目前仅输出处理统计，缺乏对情报内容的组织和呈现。用户需要一个**结构化的情报简报**，便于在组织中分发和阅读。

### 1.2 核心价值

| 维度 | 当前状态 | 目标状态 |
|------|---------|---------|
| **可分发性** | 碎片化（一堆卡片） | ✅ 结构化简报 |
| **阅读体验** | 需自行归纳筛选 | ✅ 优化组织和排序 |
| **客观性** | 原始卡片，分散 | ✅ 完整汇总，保持客观 |

### 1.3 功能定位

**情报阶段报告 ≠ 主题分析报告**

| 维度 | 情报报告 | 主题分析报告 |
|------|---------|------------|
| **定位** | 信息整理层 | 深度分析层 |
| **目标** | 优化阅读体验 | 输出战略洞察 |
| **内容** | 客观分类+统计 | 趋势分析+关联发现 |
| **读者** | 全员分发 | 决策层/分析员 |

---

## 二、功能设计

### 2.1 触发方式

- ✅ `/intel-distill` 执行后**自动输出简短统计**
- ✅ 支持 `--report weekly [参数]` 或 `--report monthly [参数]` **直接从现有情报卡片生成报告**
- ❌ 不创建独立命令

### 2.2 周期粒度

**第一阶段**：
- `weekly` - 周报（周一至周日）
- `monthly` - 月报（1日至月末）

**默认行为**：
- 无额外参数：当前周/当前月
- 指定参数：用户指定的周/月

### 2.3 报告参数

```bash
# 当前周/当前月（默认）
/intel-distill --report weekly
/intel-distill --report monthly

# 指定周（ISO 8601 格式）
/intel-distill --report weekly 2026-W10

# 指定月
/intel-distill --report monthly 2026-03

# 指定年+周
/intel-distill --report weekly 2026 10

# 指定年+月
/intel-distill --report monthly 2026 03

# 指定情报卡片位置
/intel-distill --report weekly --output ./intel
```

**参数说明**：

| 参数 | 必填 | 说明 |
|------|------|------|
| `--report` | 是 | 报告类型：`weekly` / `monthly` |
| `[period]` | 否 | 周期参数：`2026-W10` / `2026-03` |
| `--output <dir>` | 否 | 情报卡片目录（默认：当前目录） |

### 2.4 时间范围计算

**周报**：
- 起始：指定周的周一（00:00:00）
- 结束：指定周的周日（23:59:59）
- 如果指定周是当前周且未结束：只统计到执行命令时

**月报**：
- 起始：指定月的 1日（00:00:00）
- 结束：指定月的月末（23:59:59）
- 如果指定月是当前月且未结束：只统计到执行命令时

### 2.5 报告内容结构

报告包含**三个核心部分**：

#### **A. 执行摘要**

- 情报总数
- 覆盖领域数量和分布
- 时间范围
- 关键统计指标

**示例**：
```markdown
## 📊 执行摘要

- **情报数量**：15 条
- **覆盖领域**：3 个（威胁态势、厂商动态、政策法规）
- **时间范围**：2026-03-01 ~ 2026-03-07
```

#### **B. 情报综述**

**定位**：情报卡片内容的提炼和组织
**生成方式**：覆盖时间区间内的**所有情报**，追求客观性和完整性
**排序规则**：
1. 按七大领域分组（固定顺序）
2. 同领域内按情报日期倒序（最新在前）

**七大领域固定顺序**：
1. Threat-Landscape（威胁态势）
2. Industry-Analysis（行业分析）
3. Vendor-Intelligence（厂商情报）
4. Emerging-Tech（新兴技术）
5. Customer-Market（客户与市场）
6. Policy-Regulation（政策法规）
7. Capital-Investment（资本动态）

**格式**：分条目，提取 `## 核心事实` 部分（1-2 句话）
**关键事实提取**：识别并标注关键数据和事实（加粗或标记）

**示例**：
```markdown
## 📝 情报综述

### 威胁态势

1. **APT组织钓鱼攻击** (2026-03-10)
   威胁组织**APT29**利用伪装成HR邮件的钓鱼攻击，针对**金融机构**，攻击规模较小但精准度高。

2. **LockBit 4.0发布** (2026-03-08)
   勒索软件团伙**LockBit**发布**4.0版本**，新增**Linux加密能力**和防分析机制。

### 厂商动态

3. **Palo Alto新能力** (2026-03-12)
   Palo Alto Networks发布**AI驱动的威胁检测能力**，可识别零日攻击。

4. **微软安全更新** (2026-03-11)
   微软发布**3月安全更新**，修复Exchange服务器高危漏洞。

### 政策法规

5. **数据安全法实施细则** (2026-03-09)
   网信办发布数据安全法实施细则**征求意见稿**，涉及**跨境数据传输要求**。
```

#### **C. 情报目录**

**定位**：按领域分类的索引
**目的**：读者可以快速定位到具体情报卡片
**格式**：表格，带链接

**示例**：
```markdown
## 🗂️ 情报目录

### 威胁态势 (8张)

| 日期 | 标题 | 链接 |
|------|------|------|
| 2026-03-10 | APT组织钓鱼攻击 | [[Threat-Landscape/APT-Phishing-20260310.md]] |
| 2026-03-08 | LockBit 4.0发布 | [[Threat-Landscape/LockBit-4-20260308.md]] |
| ... | ... | ... |

### 厂商动态 (5张)

| 日期 | 标题 | 链接 |
|------|------|------|
| 2026-03-12 | Palo Alto新能力 | [[Vendor-Intelligence/Palo-Alto-AI-Detection-20260312.md]] |
| ... | ... | ... |
```

---

## 三、技术架构

### 3.1 整体架构

```
/intel-distill --report weekly [参数]
    ↓
[命令控制流程]
    ├── 解析参数（period + period_param + output_dir）
    ├── 调用 TypeScript 脚本：scan-cards.ts
    │       ↓
    │   计算时间窗口（起始日期、结束日期）
    │   扫描情报卡片目录（七大领域）
    │   读取 frontmatter（intelligence_date）
    │   筛选符合条件的卡片
    │   返回卡片列表（路径 + 元信息）
    │
    ├── 检查卡片列表
    │   - 空列表：输出"本周/月无情报卡片"，结束
    │   - 非空：继续
    │
    └── 调用 Agent: intelligence-briefing-writer
            ↓
        接收卡片列表（JSON）
        读取并解析每张卡片内容
        提取核心事实并标注关键数据
        生成结构化报告
        创建报告目录（如不存在）
        写入报告文件
        显示报告内容
```

### 3.2 TypeScript 脚本设计

#### **脚本位置**：`scripts/reporting/scan-cards.ts`

#### **脚本职责**：
1. 计算时间窗口（起始日期、结束日期）
2. 扫描情报卡片目录（七大领域）
3. 读取卡片 frontmatter（`intelligence_date`、`title`、`primary_domain`）
4. 筛选符合条件的卡片（时间窗口内）
5. 返回卡片列表（路径 + 元信息）

#### **脚本输入参数**：

```bash
npx tsx scan-cards.ts \
  --period weekly \
  --param "2026-W10" \
  --output-dir ./intel
```

| 参数 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `--period` | 是 | 周期类型 | `weekly` / `monthly` |
| `--param` | 否 | 周期参数 | `2026-W10` / `2026-03` |
| `--output-dir` | 是 | 情报卡片目录 | `./intel` |

**默认值**：
- `--param`：未提供时，使用当前周/月
- `--output-dir`：未提供时，使用当前目录

#### **脚本输出**：

```json
{
  "period": "weekly",
  "period_param": "2026-W10",
  "date_range": {
    "start": "2026-03-02",
    "end": "2026-03-08"
  },
  "cards": [
    {
      "path": "Threat-Landscape/APT-Phishing-20260310.md",
      "metadata": {
        "title": "APT组织钓鱼攻击",
        "intelligence_date": "2026-03-10",
        "primary_domain": "Threat-Landscape"
      }
    },
    {
      "path": "Vendor-Intelligence/Palo-Alto-AI-20260312.md",
      "metadata": {
        "title": "Palo Alto新能力",
        "intelligence_date": "2026-03-12",
        "primary_domain": "Vendor-Intelligence"
      }
    }
  ],
  "stats": {
    "total": 15,
    "by_domain": {
      "Threat-Landscape": 8,
      "Vendor-Intelligence": 5,
      "Policy-Regulation": 2
    }
  }
}
```

#### **性能优化**：
- ✅ 只读取 frontmatter（不读取完整文件内容）
- ✅ 并行扫描多个领域目录
- ✅ 使用 glob 快速定位文件
- ✅ 缓存 frontmatter 信息（可选）

---

### 3.3 Agent 设计

#### **Agent 名称**：`intelligence-briefing-writer`

#### **Agent Frontmatter**
```markdown
---
name: intelligence-briefing-writer
description: |
  Use this agent when intel-distill command needs to generate intelligence briefing reports from scanned card list. This agent reads card content, extracts core facts, and generates structured briefing with executive summary, overview, and directory.

  <example>
  Context: scan-cards script has returned 15 cards for current week
  user: "/intel-distill --report weekly"
  assistant: "I'll generate a weekly intelligence briefing report using the intelligence-briefing-writer agent."
  <commentary>
  User requested weekly report. The intelligence-briefing-writer agent receives card list from scan-cards script and generates briefing.
  </commentary>
  </example>

  <example>
  Context: scan-cards script has returned 0 cards for specified period
  user: "/intel-distill --report monthly 2026-02"
  assistant: "No intelligence cards found for February 2026. Report not generated."
  <commentary>
  No cards found in specified period. Agent should handle empty list case.
  </commentary>
  </example>

model: inherit
color: blue
tools: Read, Write
skills:
  - domain-knowledge
---
```

#### **Agent 系统提示**
```markdown
你是一名专注于情报简报撰写的专业代理。你的职责是读取情报卡片内容，提取核心事实，生成结构化的情报简报。

## 输入参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `card_list` | 扫描脚本返回的卡片列表（JSON） | 包含路径、元信息 |
| `output_dir` | 情报卡片输出目录 | `./intel` |
| `report_date` | 报告生成日期 | `2026-03-13` |

**card_list 结构**：
```json
{
  "period": "weekly",
  "period_param": "2026-W10",
  "date_range": {"start": "2026-03-02", "end": "2026-03-08"},
  "cards": [
    {
      "path": "Threat-Landscape/APT-Phishing-20260310.md",
      "metadata": {
        "title": "APT组织钓鱼攻击",
        "intelligence_date": "2026-03-10",
        "primary_domain": "Threat-Landscape"
      }
    }
  ],
  "stats": {
    "total": 15,
    "by_domain": {"Threat-Landscape": 8, ...}
  }
}
```

## 执行流程

### 步骤 1：检查情报卡片列表

如果 `cards.length == 0`：
- 输出："本周/月无情报卡片"
- 不生成报告文件
- 返回

### 步骤 2：读取并解析卡片内容

遍历 `cards` 列表：
1. 使用 Read 读取每张卡片文件
2. 提取 `## 核心事实` 章节内容
3. 保留 frontmatter 中的元信息（标题、日期、领域）

**关键事实标注规则**：
- **数字/金额**：加粗
- **组织/产品名称**：加粗
- **时间/版本号**：加粗
- **重要关键词**：加粗

### 步骤 3：按领域分组

根据 `primary_domain` 分组：

**七大领域固定顺序**：
1. Threat-Landscape（威胁态势）
2. Industry-Analysis（行业分析）
3. Vendor-Intelligence（厂商情报）
4. Emerging-Tech（新兴技术）
5. Customer-Market（客户与市场）
6. Policy-Regulation（政策法规）
7. Capital-Investment（资本动态）

### 步骤 4：生成执行摘要

**内容**：
- 情报总数：`stats.total`
- 覆盖领域数量和分布：`stats.by_domain`
- 时间范围：`date_range.start` ~ `date_range.end`
- 周期信息：`period` + `period_param`

### 步骤 5：生成情报综述

遍历分组后的卡片列表，为每张卡片生成条目：

**格式**：
```
{序号}. **{标题}** ({日期})
   {核心事实内容（标注关键事实）}
```

**要求**：
- 覆盖所有情报卡片（不筛选）
- 保持客观，不添加主观解读
- 摘要控制在 1-2 句话

### 步骤 6：生成情报目录

按领域分组，为每个领域生成表格：

**格式**：
```
### {领域中文名称} ({数量}张)

| 日期 | 标题 | 链接 |
|------|------|------|
| {intelligence_date} | {标题} | [[{primary_domain}/{filename}.md]] |
```

**领域中文名称映射**：
- Threat-Landscape → 威胁态势
- Industry-Analysis → 行业分析
- Vendor-Intelligence → 厂商动态
- Emerging-Tech → 新兴技术
- Customer-Market → 客户与市场
- Policy-Regulation → 政策法规
- Capital-Investment → 资本动态

### 步骤 7：组装完整报告

按顺序组合三部分：

```markdown
# 网络安全情报简报

## 基本信息
- **周期**：{period} ({period_param})
- **时间范围**：{date_range.start} ~ {date_range.end}
- **生成日期**：{report_date}

## 执行摘要
[步骤 4 的输出]

## 情报综述
[步骤 5 的输出]

## 情报目录
[步骤 6 的输出]
```

### 步骤 8：创建报告目录

检查 `{output_dir}/reports/` 是否存在：
- 不存在：创建 `reports/`、`reports/weekly/`、`reports/monthly/`
- 已存在：直接使用

### 步骤 9：写入报告文件并显示

使用 Write 工具写入：

```
{output_dir}/reports/{period}/{period_param}-briefing.md
```

**文件命名规则**：
- 周报：`2026-W10-briefing.md`
- 月报：`2026-03-briefing.md`

**覆盖规则**：
- 如果文件已存在，直接覆盖（不保留历史版本）
- 同一周期的多次生成，以最后一次为准

**显示报告内容**：
- 将完整报告内容展示给用户
- 同时显示报告文件路径

## 输出

直接向用户展示完整的报告内容（Markdown 格式），并显示报告文件位置。

**示例输出**：
```
情报简报已生成：

# 网络安全情报简报
...

报告文件位置：./intel/reports/weekly/2026-W10-briefing.md
```

## 质量要求

### 数据准确性
- 所有数字来自实际扫描结果
- 不编造或估算数据
- 时间范围与卡片列表一致

### 格式规范
- 使用标准 Markdown
- WikiLink 格式：`[[路径]]`
- 表格对齐
- 有序列表使用阿拉伯数字

### 完整性
- 覆盖所有扫描到的情报卡片
- 无遗漏
- 无重复

### 客观性
- 不添加主观解读
- 不进行趋势分析
- 不输出战略建议
```

---

## 四、实现细节

### 4.1 目录结构

```
{output_dir}/
├── Threat-Landscape/          # 情报卡片（七大领域）
├── Vendor-Intelligence/
├── ...
├── .intel/                    # 管理目录（隐藏）
│   ├── state.json
│   └── history/
└── reports/                   # 【新增】报告目录（用户可见）
    ├── weekly/                # 周报
    │   ├── 2026-W09-briefing.md
    │   ├── 2026-W10-briefing.md
    │   └── 2026-W11-briefing.md
    └── monthly/               # 月报
        ├── 2026-01-briefing.md
        ├── 2026-02-briefing.md
        └── 2026-03-briefing.md
```

### 4.2 命令参数扩展

更新 `commands/intel-distill.md`：

```markdown
## 参数与使用示例

| 参数 | 必填 | 说明 |
|------|------|------|
| `--source <dir>` | 否 | 包含文档的源目录（默认：当前目录） |
| `--output <dir>` | 否 | 情报卡片输出目录（默认：当前目录） |
| `--report <type> [period]` | 否 | 生成情报简报：<br>- `weekly` - 周报（从现有卡片生成）<br>- `monthly` - 月报（从现有卡片生成）<br>- 可选周期参数：`2026-W10` 或 `2026-03` |
| `--help` | 否 | 显示使用帮助 |

**注意**：`--report` 参数仅从现有情报卡片生成报告，不执行新的情报提取。

```bash
# 生成当前周报（从现有卡片，默认当前目录）
/intel-distill --report weekly

# 生成指定周报
/intel-distill --report weekly 2026-W10

# 生成指定周报（年+周）
/intel-distill --report weekly 2026 10

# 生成当前月报
/intel-distill --report monthly

# 生成指定月报
/intel-distill --report monthly 2026-03

# 生成指定月报（年+月）
/intel-distill --report monthly 2026 03

# 指定情报卡片位置
/intel-distill --report weekly --output ./intel

# 扫描并提取情报（不生成报告）
/intel-distill --source ./docs
```
```

### 4.3 TypeScript 脚本实现细节

#### **脚本位置**：`scripts/reporting/scan-cards.ts`

#### **脚本逻辑**：

```typescript
#!/usr/bin/env node
/**
 * 扫描情报卡片，筛选指定时间范围内的卡片
 *
 * Usage: pnpm exec tsx scan-cards.ts --period weekly --param "2026-W10" --output-dir ./intel
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

interface CardMetadata {
  title: string;
  intelligence_date: string;
  primary_domain: string;
}

interface ScanResult {
  period: string;
  period_param: string;
  date_range: { start: string; end: string };
  cards: { path: string; metadata: CardMetadata }[];
  stats: {
    total: number;
    by_domain: Record<string, number>;
  };
}

// 命令行参数解析
const program = new Command();
program
  .option('--period <type>', '周期类型：weekly/monthly')
  .option('--param <value>', '周期参数：2026-W10 或 2026-03')
  .option('--output-dir <dir>', '情报卡片输出目录')
  .parse(process.argv);

const options = program.opts();
const period = options.period; // 'weekly' | 'monthly'
const periodParam = options.param; // '2026-W10' | '2026-03'
const outputDir = options.outputDir || process.cwd();

// 计算时间范围
function calculateDateRange(period: string, param?: string): { start: string; end: string } {
  const today = new Date();

  if (!param) {
    // 默认：当前周/当前月
    if (period === 'weekly') {
      // 当前周的周一
      const monday = new Date(today);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);

      return {
        start: monday.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      };
    } else {
      // 当前月
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: firstDay.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      };
    }
  } else {
    // 指定参数
    if (period === 'weekly') {
      // ISO 8601 周格式：2026-W10 或 2026 10
      const [year, weekStr] = param.includes('-W')
        ? param.split('-W')
        : param.split(' ');
      const week = parseInt(weekStr);

      // 计算该周的周一和周日
      const jan1 = new Date(parseInt(year), 0, 1);
      const daysToAdd = (week - 1) * 7 - jan1.getDay() + 1;
      const monday = new Date(jan1);
      monday.setDate(jan1.getDate() + daysToAdd);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
      };
    } else {
      // 月格式：2026-03 或 2026 03
      const [year, monthStr] = param.includes('-')
        ? param.split('-')
        : param.split(' ');
      const month = parseInt(monthStr) - 1; // JS 月份从 0 开始

      const firstDay = new Date(parseInt(year), month, 1);
      const lastDay = new Date(parseInt(year), month + 1, 0);

      return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
      };
    }
  }
}

// 扫描卡片
async function scanCards(outputDir: string, dateRange: { start: string; end: string }): Promise<ScanResult['cards']> {
  const domains = [
    'Threat-Landscape',
    'Industry-Analysis',
    'Vendor-Intelligence',
    'Emerging-Tech',
    'Customer-Market',
    'Policy-Regulation',
    'Capital-Investment'
  ];

  const cards: ScanResult['cards'] = [];

  for (const domain of domains) {
    const domainPath = join(outputDir, domain);
    try {
      const files = await fs.readdir(domainPath);

      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const filePath = join(domainPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { data: frontmatter } = matter(content);

        const intelDate = frontmatter.intelligence_date as string;
        if (!intelDate) continue;

        // 检查是否在时间范围内
        if (intelDate >= dateRange.start && intelDate <= dateRange.end) {
          cards.push({
            path: `${domain}/${file}`,
            metadata: {
              title: frontmatter.title as string,
              intelligence_date: intelDate,
              primary_domain: domain
            }
          });
        }
      }
    } catch (error) {
      // 目录不存在，跳过
    }
  }

  return cards;
}

// 主函数
async function main() {
  const dateRange = calculateDateRange(period, periodParam);
  const cards = await scanCards(outputDir, dateRange);

  // 统计
  const stats = {
    total: cards.length,
    by_domain: {} as Record<string, number>
  };

  for (const card of cards) {
    const domain = card.metadata.primary_domain;
    stats.by_domain[domain] = (stats.by_domain[domain] || 0) + 1;
  }

  // 输出结果
  const result: ScanResult = {
    period,
    period_param: periodParam || 'current',
    date_range: dateRange,
    cards,
    stats
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
```

---

## 五、测试计划

### 5.1 功能测试

- [ ] 无 `--report` 参数：仅输出统计，不生成报告
- [ ] `--report weekly`：生成当前周情报简报
- [ ] `--report weekly 2026-W10`：生成指定周情报简报
- [ ] `--report weekly 2026 10`：生成指定周情报简报（年+周）
- [ ] `--report monthly`：生成当前月情报简报
- [ ] `--report monthly 2026-03`：生成指定月情报简报
- [ ] `--report monthly 2026 03`：生成指定月情报简报（年+月）
- [ ] 报告包含执行摘要、情报综述、情报目录三部分
- [ ] 情报综述覆盖所有情报卡片
- [ ] 情报综述按领域→时间正确排序
- [ ] 情报目录按领域分类，链接正确
- [ ] 同一周期多次生成，覆盖原有文件

### 5.2 边界测试

- [ ] 无情报卡片：报告应显示"本周/月无情报"
- [ ] 只有 1 个领域的情报：目录只显示该领域
- [ ] 情报跨多个周期：正确筛选时间范围
- [ ] 当前周/月未结束：只统计到执行命令时
- [ ] 未来日期的情报：不包含在报告中
- [ ] 情报日期格式错误：跳过该卡片，记录警告

### 5.3 集成测试

- [ ] TypeScript 脚本与命令层无缝集成
- [ ] TypeScript 脚本与 Agent 无缝集成
- [ ] 性能测试：扫描 100+ 卡片，响应时间 < 2秒
- [ ] 与现有 `intel-distill` 流程兼容
- [ ] 与 `.intel/` 管理目录兼容

---

## 六、验收标准

### 6.1 功能验收

- [ ] 报告三部分结构完整
- [ ] 情报综述覆盖所有情报卡片
- [ ] 排序规则正确实施（领域→日期）
- [ ] 情报目录链接可点击跳转
- [ ] 参数解析正确（默认/指定周/月）
- [ ] 时间范围计算准确

### 6.2 质量验收

- [ ] Markdown 格式规范
- [ ] 链接路径正确
- [ ] 无重复内容
- [ ] 无遗漏情报
- [ ] 关键事实标注正确

### 6.3 性能验收

- [ ] TypeScript 脚本扫描 100+ 卡片，响应时间 < 2秒
- [ ] Agent 生成报告，响应时间 < 3秒
- [ ] 不读取非必要文件内容

### 6.4 体验验收

- [ ] 报告可直接用于组织分发
- [ ] 阅读体验优化（结构清晰、重点突出）
- [ ] 便于快速定位情报卡片
- [ ] 参数设计简洁直观
- [ ] 报告内容直接显示给用户

---

## 附录：情报卡片 Frontmatter 规范

报告生成依赖情报卡片包含以下 frontmatter：

```markdown
---
title: "APT组织钓鱼攻击"
source_file: "[[relative/path/to/source.md]]"
intelligence_date: 2026-03-10      # 情报日期（用于报告筛选和排序）
created_date: 2026-03-13
primary_domain: Threat-Landscape   # 领域（七大领域之一，用于分组）
secondary_domains: []
geo_scope: unknown
security_relevance: high
# ... 其他字段
---
```

---

**设计文档版本历史**：
- v1.0 (2026-03-13)：初始版本，基于需求讨论整理
