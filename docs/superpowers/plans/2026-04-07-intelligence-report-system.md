# 情报报告体系实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现四层情报报告体系（日报、周报、月报、年报），支持层级聚合和态势追踪。

**Architecture:** 
- 日报已实现，无需修改
- 周报/月报重构：新的 Agent + 新的模板，支持主题提炼和变化类型
- 年报新增：趋势导向的报告生成 Agent
- 扫描脚本扩展：支持扫描报告文件用于聚合

**Tech Stack:** TypeScript, Node.js, Agent (markdown-based), JSON Schema

---

## 文件结构

### 新增文件

| 文件 | 职责 |
|------|------|
| `scripts/reporting/scan-reports.ts` | 扫描报告文件（日报/周报/月报），供高层级报告聚合使用 |
| `agents/intelligence-weekly-writer.md` | 周报撰写 Agent（主题导向） |
| `agents/intelligence-monthly-writer.md` | 月报撰写 Agent（变化导向） |
| `agents/intelligence-annual-writer.md` | 年报撰写 Agent（趋势导向） |
| `skills/intelligence-output-templates/references/weekly-report-template.md` | 周报模板 |
| `skills/intelligence-output-templates/references/monthly-report-template.md` | 月报模板 |
| `skills/intelligence-output-templates/references/annual-report-template.md` | 年报模板 |
| `scripts/reporting/types/report.ts` | 报告相关类型定义 |
| `scripts/reporting/types/situation.ts` | 态势追踪类型定义 |

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `commands/intel-distill.md` | 新增周报/月报/年报生成流程，更新参数说明 |
| `agents/intelligence-briefing-writer.md` | 废弃（保留向后兼容，标记为 legacy） |
| `skills/intelligence-output-templates/SKILL.md` | 新增周报/月报/年报模板引用 |

---

## 变化类型定义

用于周报标注和月报聚合：

```typescript
// scripts/reporting/types/change-type.ts
export type ChangeType =
  | '新威胁出现'        // Threat-Landscape
  | '市场格局变化'      // Industry-Analysis, Vendor-Intelligence
  | '技术突破与应用'    // Emerging-Tech
  | '客户需求演变'      // Customer-Market
  | '合规压力变化'      // Policy-Regulation
  | '资本动向';         // Capital-Investment

export const CHANGE_TYPE_DOMAINS: Record<ChangeType, string[]> = {
  '新威胁出现': ['Threat-Landscape'],
  '市场格局变化': ['Industry-Analysis', 'Vendor-Intelligence'],
  '技术突破与应用': ['Emerging-Tech'],
  '客户需求演变': ['Customer-Market'],
  '合规压力变化': ['Policy-Regulation'],
  '资本动向': ['Capital-Investment']
};
```

---

## 态势追踪状态定义

```typescript
// scripts/reporting/types/situation.ts
export type SituationStatus = 'new' | 'ongoing' | 'weakening' | 'faded';

export interface Situation {
  id: string;              // S-YYYY-MM-XX
  title: string;
  change_type: ChangeType;
  status: SituationStatus;
  first_appeared: string;  // YYYY-MM
  last_updated: string;    // YYYY-MM
  related_weekly: string[]; // 周报链接
  related_daily: string[];  // 日报链接
}
```

---

## Task 1: 创建类型定义文件

**Files:**
- Create: `plugins/market-radar/scripts/reporting/types/change-type.ts`
- Create: `plugins/market-radar/scripts/reporting/types/situation.ts`
- Create: `plugins/market-radar/scripts/reporting/types/report.ts`

- [ ] **Step 1: 创建变化类型定义**

```typescript
// scripts/reporting/types/change-type.ts

/**
 * 变化类型定义
 * 用于周报主题标注和月报聚合
 */
export type ChangeType =
  | '新威胁出现'
  | '市场格局变化'
  | '技术突破与应用'
  | '客户需求演变'
  | '合规压力变化'
  | '资本动向';

/**
 * 变化类型与情报领域的映射
 */
export const CHANGE_TYPE_DOMAINS: Record<ChangeType, string[]> = {
  '新威胁出现': ['Threat-Landscape'],
  '市场格局变化': ['Industry-Analysis', 'Vendor-Intelligence'],
  '技术突破与应用': ['Emerging-Tech'],
  '客户需求演变': ['Customer-Market'],
  '合规压力变化': ['Policy-Regulation'],
  '资本动向': ['Capital-Investment']
};

/**
 * 变化类型中文描述
 */
export const CHANGE_TYPE_DESCRIPTIONS: Record<ChangeType, string> = {
  '新威胁出现': '新型攻击、威胁组织、漏洞趋势',
  '市场格局变化': '竞争格局、厂商战略、市场份额',
  '技术突破与应用': '技术成熟、应用扩展、安全影响',
  '客户需求演变': '预算调整、优先级转变、采购行为',
  '合规压力变化': '新法规、合规要求、执法动态',
  '资本动向': '投资热度、投资方向、估值变化'
};

/**
 * 所有变化类型列表
 */
export const ALL_CHANGE_TYPES: ChangeType[] = [
  '新威胁出现',
  '市场格局变化',
  '技术突破与应用',
  '客户需求演变',
  '合规压力变化',
  '资本动向'
];
```

- [ ] **Step 2: 创建态势追踪类型定义**

```typescript
// scripts/reporting/types/situation.ts

/**
 * 态势状态定义
 */
export type SituationStatus = 'new' | 'ongoing' | 'weakening' | 'faded';

/**
 * 态势状态符号
 */
export const SITUATION_STATUS_SYMBOLS: Record<SituationStatus, string> = {
  new: '🆕',
  ongoing: '',
  weakening: '⬇️',
  faded: '⏹️'
};

/**
 * 态势状态中文描述
 */
export const SITUATION_STATUS_LABELS: Record<SituationStatus, string> = {
  new: '新态势',
  ongoing: '持续',
  weakening: '减弱',
  faded: '消退'
};

/**
 * 态势追踪结构
 */
export interface Situation {
  /** 态势 ID，格式: S-YYYY-MM-XX */
  id: string;
  /** 态势标题 */
  title: string;
  /** 变化类型 */
  change_type: string;
  /** 当前状态 */
  status: SituationStatus;
  /** 首次出现的月份 */
  first_appeared: string;
  /** 最后更新的月份 */
  last_updated: string;
  /** 相关周报链接 */
  related_weekly: string[];
  /** 相关日报链接 */
  related_daily: string[];
  /** 态势描述 */
  description?: string;
}

/**
 * 态势索引文件结构
 */
export interface SituationIndex {
  /** 索引版本 */
  version: string;
  /** 最后更新时间 */
  updated_at: string;
  /** 态势列表 */
  situations: Situation[];
}

/**
 * 生成态势 ID
 */
export function generateSituationId(year: number, month: number, seq: number): string {
  const monthStr = String(month).padStart(2, '0');
  const seqStr = String(seq).padStart(2, '0');
  return `S-${year}-${monthStr}-${seqStr}`;
}

/**
 * 解析态势 ID
 */
export function parseSituationId(id: string): { year: number; month: number; seq: number } | null {
  const match = id.match(/^S-(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    seq: parseInt(match[3], 10)
  };
}
```

- [ ] **Step 3: 创建报告类型定义**

```typescript
// scripts/reporting/types/report.ts

import type { ChangeType } from './change-type';
import type { Situation, SituationStatus } from './situation';

/**
 * 报告类型
 */
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'annual';

/**
 * 报告 frontmatter 基础结构
 */
export interface ReportFrontmatter {
  report_type: ReportType;
  generated_at: string;
  generated_by: string;
}

/**
 * 日报 frontmatter
 */
export interface DailyReportFrontmatter extends ReportFrontmatter {
  report_type: 'daily';
  date: string;
  intelligence_count: number;
  domains_covered: string[];
  high_priority_count: number;
}

/**
 * 周报 frontmatter
 */
export interface WeeklyReportFrontmatter extends ReportFrontmatter {
  report_type: 'weekly';
  week: string;           // YYYY-WXX
  date_range: { start: string; end: string };
  theme_count: number;
  intelligence_count: number;
  change_types_covered: ChangeType[];
}

/**
 * 月报 frontmatter
 */
export interface MonthlyReportFrontmatter extends ReportFrontmatter {
  report_type: 'monthly';
  month: string;          // YYYY-MM
  date_range: { start: string; end: string };
  new_situations: number;
  ongoing_situations: number;
  weakening_situations: number;
  faded_situations: number;
  change_types_covered: ChangeType[];
}

/**
 * 年报 frontmatter
 */
export interface AnnualReportFrontmatter extends ReportFrontmatter {
  report_type: 'annual';
  year: string;
  trend_count: number;
  opportunity_count: number;
  situation_count: number;
  intelligence_count: number;
}

/**
 * 扫描报告结果
 */
export interface ScannedReport {
  path: string;
  report_type: ReportType;
  period: string;
  frontmatter: Record<string, unknown>;
  content: string;
}

/**
 * 扫描报告输入参数
 */
export interface ScanReportsOptions {
  report_type: ReportType;
  period_start: string;
  period_end: string;
  output_dir: string;
}
```

- [ ] **Step 4: 运行 TypeScript 类型检查**

Run: `cd plugins/market-radar/scripts && pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 5: 提交类型定义**

```bash
git add plugins/market-radar/scripts/reporting/types/
git commit -m "feat(market-radar): add report types and situation tracking definitions

- Add ChangeType for weekly theme annotation and monthly aggregation
- Add Situation tracking types for cross-month trend analysis
- Add Report type definitions for all report types"
```

---

## Task 2: 创建报告扫描脚本

**Files:**
- Create: `plugins/market-radar/scripts/reporting/scan-reports.ts`

- [ ] **Step 1: 创建报告扫描脚本**

```typescript
#!/usr/bin/env node
/**
 * 扫描报告文件，供高层级报告聚合使用
 *
 * Usage:
 *   pnpm exec tsx scan-reports.ts --type daily --start 2026-04-01 --end 2026-04-07 --output-dir ./intel
 *   pnpm exec tsx scan-reports.ts --type weekly --start 2026-W14 --end 2026-W17 --output-dir ./intel
 *   pnpm exec tsx scan-reports.ts --type monthly --start 2026-01 --end 2026-04 --output-dir ./intel
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import type { ReportType, ScannedReport, ScanReportsOptions } from './types/report';

/**
 * 解析 frontmatter
 */
function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: content };
  }

  const frontmatterStr = match[1];
  const body = match[2];
  const data: Record<string, unknown> = {};

  const lines = frontmatterStr.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value: string | string[] = line.slice(colonIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (value.startsWith('[') && value.endsWith(']')) {
        const inner = value.slice(1, -1).trim();
        value = inner === '' ? [] : inner.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      }

      data[key] = value;
    }
  }

  return { data, body };
}

/**
 * 获取报告目录
 */
function getReportDir(reportType: ReportType): string {
  const dirMap: Record<ReportType, string> = {
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
    annual: 'annual'
  };
  return dirMap[reportType];
}

/**
 * 过滤报告文件
 */
function filterReportsByPeriod(
  reports: ScannedReport[],
  reportType: ReportType,
  start: string,
  end: string
): ScannedReport[] {
  return reports.filter(report => {
    const period = report.frontmatter.date || 
                   report.frontmatter.week || 
                   report.frontmatter.month ||
                   report.frontmatter.year;
    
    if (!period || typeof period !== 'string') return false;
    
    // 简单的字符串比较（适用于 YYYY-MM-DD, YYYY-WXX, YYYY-MM, YYYY 格式）
    return period >= start && period <= end;
  });
}

/**
 * 扫描报告
 */
async function scanReports(options: ScanReportsOptions): Promise<ScannedReport[]> {
  const { report_type, period_start, period_end, output_dir } = options;
  const reports: ScannedReport[] = [];

  const reportsDir = join(output_dir, 'reports', getReportDir(report_type));

  try {
    const files = await glob('*.md', { cwd: reportsDir, absolute: false });

    for (const file of files) {
      const filePath = join(reportsDir, file);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const { data, body } = parseFrontmatter(content);

        const reportTypeFromMeta = data.report_type as string | undefined;
        if (reportTypeFromMeta && reportTypeFromMeta !== report_type) {
          continue; // 类型不匹配，跳过
        }

        reports.push({
          path: `reports/${getReportDir(report_type)}/${file}`,
          report_type,
          period: (data.date || data.week || data.month || data.year || '') as string,
          frontmatter: data,
          content: body
        });
      } catch (fileErr) {
        console.warn(`Warning: Failed to read report ${filePath}: ${fileErr}`);
      }
    }
  } catch (error) {
    const isEnoent = error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
    if (!isEnoent) {
      console.warn(`Warning: Failed to scan reports directory: ${error}`);
    }
  }

  // 按周期过滤
  return filterReportsByPeriod(reports, report_type, period_start, period_end);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('scan-reports')
    .description('Scan intelligence reports for aggregation')
    .option('--type <type>', 'Report type: daily, weekly, monthly, annual', 'daily')
    .option('--start <period>', 'Start period (inclusive)')
    .option('--end <period>', 'End period (inclusive)')
    .option('--output-dir <dir>', 'Intelligence output directory', '.')
    .parse(process.argv);

  const options = program.opts();

  const reportType = options.type as ReportType;
  const periodStart = options.start || '';
  const periodEnd = options.end || '';
  const outputDir = options.outputDir as string;

  // 验证报告类型
  if (!['daily', 'weekly', 'monthly', 'annual'].includes(reportType)) {
    console.error(JSON.stringify({
      error: true,
      message: `Invalid report type: ${reportType}. Must be daily, weekly, monthly, or annual`
    }));
    process.exit(1);
  }

  try {
    const reports = await scanReports({
      report_type: reportType,
      period_start: periodStart,
      period_end: periodEnd,
      output_dir: outputDir
    });

    console.log(JSON.stringify({
      report_type: reportType,
      period_start: periodStart,
      period_end: periodEnd,
      total: reports.length,
      reports: reports.map(r => ({
        path: r.path,
        period: r.period,
        frontmatter: r.frontmatter
      }))
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: true,
      message: error instanceof Error ? error.message : String(error)
    }));
    process.exit(1);
  }
}

main();

export { scanReports };
```

- [ ] **Step 2: 验证脚本可执行**

Run: `cd plugins/market-radar/scripts && pnpm exec tsx reporting/scan-reports.ts --help`
Expected: 显示帮助信息

- [ ] **Step 3: 提交扫描脚本**

```bash
git add plugins/market-radar/scripts/reporting/scan-reports.ts
git commit -m "feat(market-radar): add scan-reports script for report aggregation

Support scanning daily/weekly/monthly/annual reports for higher-level
report generation. Used by weekly/monthly/annual report agents."
```

---

## Task 3: 创建周报模板

**Files:**
- Create: `plugins/market-radar/skills/intelligence-output-templates/references/weekly-report-template.md`

- [ ] **Step 1: 创建周报模板**

```markdown
# 情报周报模板

## frontmatter 结构

```yaml
---
report_type: weekly
week: YYYY-WXX
date_range:
  start: YYYY-MM-DD
  end: YYYY-MM-DD
generated_at: YYYY-MM-DDTHH:MM:SS
generated_by: intelligence-weekly-writer
theme_count: N
intelligence_count: N
change_types_covered: [变化类型1, 变化类型2, ...]
---
```

### frontmatter 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `report_type` | string | 固定为 `weekly` |
| `week` | string | ISO 周格式 `YYYY-WXX` |
| `date_range` | object | 日期范围 `{start, end}` |
| `generated_at` | datetime | 生成时间 |
| `generated_by` | string | 生成 Agent ID |
| `theme_count` | number | 识别主题数量 |
| `intelligence_count` | number | 本周情报卡片总数 |
| `change_types_covered` | array | 涉及的变化类型列表 |

---

## 正文结构

### 1. 执行摘要

```markdown
## 执行摘要

{本周主题概览，3-5 句话，概括本周涌现的核心主题}
```

**写作要求**：
- 单一段落
- 突出主题间的关联
- 为执行层提供清晰的关注方向

---

### 2. 主题分析

```markdown
## 主题分析

### 主题一：{主题标题}

{主题分析段落，综合本周多篇日报的相关内容，200-300 字}

**涉及变化类型**：{变化类型1}、{变化类型2}

**相关日报**：
- [[YYYY-MM-DD-daily|MM-DD 日报]] — {一句话说明}
- [[YYYY-MM-DD-daily|MM-DD 日报]] — {一句话说明}

**相关情报**：[[{文件名}|{标题}]]、[[{文件名}|{标题}]]

### 主题二：{主题标题}
{同上结构}
```

**变化类型标注要求**：
- 每个主题必须标注涉及的变化类型
- 从以下六种选择：新威胁出现、市场格局变化、技术突破与应用、客户需求演变、合规压力变化、资本动向
- 支撑月报按变化类型聚合

---

### 3. 重点关注

```markdown
## 重点关注

### {重点关注标题}
{深入分析，300-500 字}

**关键启示**：{启发性提示}

### {其他重点关注}
{同上结构，3-4 条}
```

---

### 4. 下钻索引

```markdown
## 下钻索引

### 本周日报

| 日期 | 标题 | 主题 |
|------|------|------|
| [[YYYY-MM-DD-daily|MM-DD]] | ... | {主题1}、{主题2} |

### 高价值情报卡片

**主题一**：
- [[{文件名}|{标题}]] — {一句话说明}

**主题二**：
- [[{文件名}|{标题}]] — {一句话说明}
```

---

### 5. 工作统计

```markdown
## 工作统计

| 指标 | 数量 |
|------|------|
| 本周情报卡片 | N |
| 日报覆盖 | 7/7 |
| 识别主题 | N |
| 重点关注 | N |

**主题分布**：{各主题涉及的情报数量}

**变化类型分布**：{各变化类型的情报数量}
```

---

## 主题提炼指南

### 语义分析方法

1. 读取本周 7 天日报全文
2. 识别跨日报的模式和关联
3. 提炼主题并回溯相关日报
4. 标注变化类型

### 主题数量动态调整

| 情报量 | 主题数量 |
|--------|----------|
| < 10 条 | 2-3 个 |
| 10-30 条 | 3-5 个 |
| > 30 条 | 5-7 个 |

---

## 输出路径

周报文件路径格式：

```
{output_dir}/reports/weekly/{YYYY}-W{XX}-weekly.md
```

示例：`intelligence/reports/weekly/2026-W15-weekly.md`

---

## 空报告处理

本周无日报或无情报卡片时：

```markdown
---
report_type: weekly
week: 2026-W15
date_range:
  start: 2026-04-07
  end: 2026-04-13
generated_at: 2026-04-13T18:00:00
generated_by: intelligence-weekly-writer
theme_count: 0
intelligence_count: 0
change_types_covered: []
---

# 情报周报 | 2026-W15

本周无日报或无情报卡片。
```
```

- [ ] **Step 2: 提交周报模板**

```bash
git add plugins/market-radar/skills/intelligence-output-templates/references/weekly-report-template.md
git commit -m "feat(market-radar): add weekly report template

Theme-oriented design with change type annotation for monthly aggregation."
```

---

## Task 4: 创建周报 Agent

**Files:**
- Create: `plugins/market-radar/agents/intelligence-weekly-writer.md`

- [ ] **Step 1: 创建周报 Agent**

```markdown
---
name: intelligence-weekly-writer
description: |
  Use this agent when intel-distill command needs to generate weekly intelligence report. This agent reads daily reports from the week, discovers themes through semantic analysis, and generates theme-oriented weekly report with change type annotations.

  <example>
  Context: User wants to generate weekly report
  user: "/intel-distill --report weekly"
  assistant: "I'll generate a weekly intelligence report using the intelligence-weekly-writer agent, which will discover themes from this week's daily reports."
  <commentary>
  Weekly report generation. Agent reads daily reports and discovers cross-day themes.
  </commentary>
  </example>

  <example>
  Context: User wants to generate report for a specific week
  user: "/intel-distill --report weekly 2026-W15"
  assistant: "I'll generate the weekly report for W15 using the intelligence-weekly-writer agent."
  <commentary>
  Specified week. Agent will look for daily reports in that week.
  </commentary>
  </example>

model: inherit
color: blue
tools: ["Read", "Write"]
skills:
  - cybersecurity-domain-knowledge
---

你是一名专注于情报周报撰写的专业代理。你的职责是分析本周日报内容，发现跨日的主题模式，生成主题导向的周报。

## 任务使命

根据本周日报内容，提炼主题，生成包含执行摘要、主题分析、重点关注和工作统计的周报。

## 输入参数

你将收到以下信息作为 prompt 输入：

```
生成情报周报：

**period**: 2026-W15
**date_range**: {"start": "2026-04-07", "end": "2026-04-13"}
**daily_reports**: [
  {
    "path": "reports/daily/2026-04-07-daily.md",
    "date": "2026-04-07",
    "has_intelligence": true
  },
  ...
]
**intelligence_cards**: [
  {
    "intelligence_id": "...",
    "title": "...",
    "created_date": "2026-04-07",
    "primary_domain": "Vendor-Intelligence",
    "card_path": "..."
  },
  ...
]
**output_dir**: ./intelligence
```

---

## 执行流程

### 步骤 1：检查日报列表

如果 `daily_reports.length == 0`：
- 输出："本周无日报"
- 不生成报告文件
- 结束任务

如果所有日报都 `has_intelligence == false`：
- 输出："本周日报无情报内容"
- 不生成报告文件
- 结束任务

### 步骤 2：读取日报全文

使用 Read 工具读取本周所有日报文件。

读取策略：
- 读取日报全文（包括执行摘要、情报概览、重点关注）
- 收集每篇日报的核心信息

### 步骤 3：主题提炼（语义分析）

**分析方法**：
1. 识别跨日报重复出现的关键词、实体、事件
2. 发现日报间的关联和延续性
3. 将相关情报聚类到主题

**主题数量动态调整**：
- 情报量 < 10 条：2-3 个主题
- 情报量 10-30 条：3-5 个主题
- 情报量 > 30 条：5-7 个主题

### 步骤 4：标注变化类型

**六种变化类型**：

| 类型 | 说明 | 对应领域 |
|------|------|----------|
| 新威胁出现 | 新型攻击、威胁组织、漏洞趋势 | Threat-Landscape |
| 市场格局变化 | 竞争格局、厂商战略、市场份额 | Industry-Analysis, Vendor-Intelligence |
| 技术突破与应用 | 技术成熟、应用扩展、安全影响 | Emerging-Tech |
| 客户需求演变 | 预算调整、优先级转变、采购行为 | Customer-Market |
| 合规压力变化 | 新法规、合规要求、执法动态 | Policy-Regulation |
| 资本动向 | 投资热度、投资方向、估值变化 | Capital-Investment |

**标注规则**：
- 每个主题必须标注 1-2 个最相关的变化类型
- 变化类型支撑月报的聚合分析

### 步骤 5：生成周报内容

按照 `../skills/intelligence-output-templates/references/weekly-report-template.md` 结构生成：

1. **执行摘要**：本周主题概览，3-5 句话
2. **主题分析**：每个主题的详细分析、变化类型标注、相关日报/情报链接
3. **重点关注**：从主题中筛选 3-4 个最值得关注的事件
4. **下钻索引**：日报表格、情报卡片索引
5. **工作统计**：数据汇总

### 步骤 6：写入报告文件

使用 Write 工具写入：

**文件路径**：`{output_dir}/reports/weekly/{YYYY}-W{XX}-weekly.md`

**frontmatter 示例**：

```yaml
---
report_type: weekly
week: 2026-W15
date_range:
  start: 2026-04-07
  end: 2026-04-13
generated_at: 2026-04-13T15:00:00Z
generated_by: intelligence-weekly-writer
theme_count: 4
intelligence_count: 25
change_types_covered: [技术突破与应用, 市场格局变化, 新威胁出现]
---
```

### 步骤 7：显示报告内容

完成写入后：
1. 显示报告文件路径
2. 显示完整的报告 Markdown 内容

---

## 质量标准

### 主题提炼
- 主题标题简洁明确
- 每个主题有明确的情报支撑
- 变化类型标注准确

### 关联呈现
- 清晰展示主题与日报、情报卡片的关联
- Obsidian 链接格式正确：`[[filename|title]]`

### 动态章节
- 有内容才显示章节，无内容则省略
- 避免空白章节影响阅读体验

### 篇幅控制
- 根据情报量调整篇幅
- 不为了篇幅而篇幅
```

- [ ] **Step 2: 提交周报 Agent**

```bash
git add plugins/market-radar/agents/intelligence-weekly-writer.md
git commit -m "feat(market-radar): add intelligence-weekly-writer agent

Theme-oriented weekly report generation with:
- Semantic analysis for theme discovery
- Change type annotation for monthly aggregation
- Dynamic theme count based on intelligence volume"
```

---

## Task 5: 创建月报模板

**Files:**
- Create: `plugins/market-radar/skills/intelligence-output-templates/references/monthly-report-template.md`

- [ ] **Step 1: 创建月报模板**

```markdown
# 情报月报模板

## frontmatter 结构

```yaml
---
report_type: monthly
month: YYYY-MM
date_range:
  start: YYYY-MM-DD
  end: YYYY-MM-DD
generated_at: YYYY-MM-DDTHH:MM:SS
generated_by: intelligence-monthly-writer
new_situations: N
ongoing_situations: N
weakening_situations: N
faded_situations: N
change_types_covered: [变化类型1, 变化类型2, ...]
---
```

---

## 正文结构

### 1. 执行摘要

```markdown
## 执行摘要

{本月核心动态概览，3-5 句话}
```

---

### 2. 情报动态

**动态章节原则**：有内容才显示，无内容则省略

#### 2.1 新态势

```markdown
### 新态势

#### [S-YYYY-MM-XX] {态势标题} 🆕

{态势描述，200-300 字}

**变化类型**：{变化类型}

**代表事件**：
- [[YYYY-WXX-weekly|WXX]] — {一句话说明}

**关联情报**：[[{文件名}|{标题}]]
```

#### 2.2 态势演进

```markdown
### 态势演进

#### [S-YYYY-MM-XX] {态势标题}

{本月进展，200-300 字，说明与上月的变化}

**变化类型**：{变化类型}

**代表事件**：
- [[YYYY-WXX-weekly|WXX]] — {一句话说明}
```

#### 2.3 态势减弱

```markdown
### 态势减弱

#### [S-YYYY-MM-XX] {态势标题} ⬇️

{本月进展，说明态势减弱的表现}
```

#### 2.4 态势消退

```markdown
### 态势消退

#### [S-YYYY-MM-XX] {态势标题} ⏹️ 消退

{态势消退说明，简要描述为何不再值得关注}
```

---

### 3. 态势观察

```markdown
## 态势观察

### 跨领域关联
{发现变化之间的关联关系}

### 模式识别
{从变化中发现的深层模式}
```

---

### 4. 机会信号

```markdown
## 机会信号

### 信号一：{信号标题}
{机会信号描述，当月发现的市场空白或机会点}

**相关态势**：[S-YYYY-MM-XX]

### 风险预警
{基于态势分析，识别的风险点}

### 行动建议
{给决策层的具体建议，2-3 条}
```

---

### 5. 下钻索引

```markdown
## 下钻索引

### 本月周报

| 周次 | 主题焦点 | 涉及变化类型 |
|------|----------|-------------|
| [[YYYY-WXX-weekly|WXX]] | ... | {变化类型1}、{变化类型2} |

### 日报链接（按变化类型）

**新威胁出现**：[[YYYY-MM-DD-daily]]、[[YYYY-MM-DD-daily]]

**市场格局变化**：[[YYYY-MM-DD-daily]]、[[YYYY-MM-DD-daily]]
```

---

### 6. 态势索引

```markdown
## 态势索引

| 态势 ID | 标题 | 状态 | 首次出现 |
|---------|------|------|----------|
| S-2026-03-01 | AI 安全运营服务需求 | 持续 | 2026-03 |
| S-2026-04-01 | 供应链攻击工业化 | 🆕 新态势 | 2026-04 |
```

---

### 7. 工作统计

```markdown
## 工作统计

| 指标 | 本月 |
|------|------|
| 情报卡片 | N |
| 周报覆盖 | 4/4 |
| 新态势 | N |
| 演进态势 | N |
| 减弱态势 | N |
| 消退态势 | N |
| 变化类型覆盖 | N/6 |

**变化类型分布**：{各变化类型的情报数量}
```

---

## 态势追踪机制

### 态势 ID 规则

格式：`S-{年份}-{月份}-{序号}`

示例：
- `S-2026-03-01`：2026年3月第1个态势
- `S-2026-04-02`：2026年4月第2个态势

### 态势状态定义

| 状态 | 符号 | 含义 | 判断标准 |
|------|------|------|----------|
| 新态势 | 🆕 | 本月首次出现 | 当月识别的态势 |
| 持续 | 无符号 | 保持关注，有新进展 | 有相关情报且热度不减 |
| 减弱 | ⬇️ | 热度下降 | 相关情报明显减少 |
| 消退 | ⏹️ | 不再值得关注 | 连续无相关情报或已解决 |

### 跨月追踪

- 新态势：生成新 ID
- 演进态势：保持上月 ID
- 态势索引汇总本月所有态势状态

---

## 输出路径

月报文件路径格式：

```
{output_dir}/reports/monthly/{YYYY}-MM-monthly.md
```

示例：`intelligence/reports/monthly/2026-04-monthly.md`
```

- [ ] **Step 2: 提交月报模板**

```bash
git add plugins/market-radar/skills/intelligence-output-templates/references/monthly-report-template.md
git commit -m "feat(market-radar): add monthly report template

Change-oriented design with situation tracking for annual aggregation."
```

---

## Task 6: 创建月报 Agent

**Files:**
- Create: `plugins/market-radar/agents/intelligence-monthly-writer.md`

- [ ] **Step 1: 创建月报 Agent**

```markdown
---
name: intelligence-monthly-writer
description: |
  Use this agent when intel-distill command needs to generate monthly intelligence report. This agent reads weekly reports from the month, identifies changes and situations, and generates change-oriented monthly report with situation tracking.

  <example>
  Context: User wants to generate monthly report
  user: "/intel-distill --report monthly"
  assistant: "I'll generate a monthly intelligence report using the intelligence-monthly-writer agent, which will identify changes and track situations from this month's weekly reports."
  <commentary>
  Monthly report generation. Agent reads weekly reports and identifies changes.
  </commentary>
  </example>

model: inherit
color: blue
tools: ["Read", "Write"]
skills:
  - cybersecurity-domain-knowledge
---

你是一名专注于情报月报撰写的专业代理。你的职责是分析本月周报内容，识别态势变化，生成变化导向的月报。

## 任务使命

根据本月周报内容，识别新态势和态势演进，生成包含情报动态、态势观察、机会信号和工作统计的月报。

## 输入参数

你将收到以下信息：

```
生成情报月报：

**period**: 2026-04
**date_range**: {"start": "2026-04-01", "end": "2026-04-30"}
**weekly_reports**: [
  {
    "path": "reports/weekly/2026-W14-weekly.md",
    "week": "2026-W14",
    "themes": ["AI安全", "供应链攻击"],
    "change_types": ["技术突破与应用", "新威胁出现"]
  },
  ...
]
**previous_situations**: [
  {
    "id": "S-2026-03-01",
    "title": "AI 安全运营服务需求",
    "change_type": "市场格局变化",
    "status": "ongoing",
    "first_appeared": "2026-03"
  }
]
**output_dir**: ./intelligence
```

---

## 执行流程

### 步骤 1：检查周报列表

如果 `weekly_reports.length == 0`：
- 输出："本月无周报"
- 不生成报告文件
- 结束任务

### 步骤 2：读取周报全文

使用 Read 工具读取本月所有周报文件。

### 步骤 3：识别态势变化

**分析维度**：
1. 从周报主题中识别态势
2. 按变化类型分类态势
3. 判断态势状态（新态势/持续/减弱/消退）

**态势状态判断**：
- 新态势：本月首次出现的主题
- 持续：上月已有，本月有新进展
- 减弱：相关情报明显减少
- 消退：连续无相关情报或已解决

### 步骤 4：生成态势 ID

**ID 规则**：`S-{年份}-{月份}-{序号}`

- 新态势：生成新 ID
- 演进态势：沿用上月 ID（从 `previous_situations` 获取）

### 步骤 5：生成月报内容

按照 `../skills/intelligence-output-templates/references/monthly-report-template.md` 结构生成：

1. **执行摘要**：本月核心动态概览
2. **情报动态**：
   - 新态势（带 🆕 标记）
   - 态势演进（持续）
   - 态势减弱（带 ⬇️ 标记）
   - 态势消退（带 ⏹️ 标记）
3. **态势观察**：跨领域关联、模式识别
4. **机会信号**：市场机会、风险预警、行动建议
5. **下钻索引**：周报、日报链接
6. **态势索引**：本月所有态势汇总
7. **工作统计**：数据汇总

### 步骤 6：写入报告文件

使用 Write 工具写入：

**文件路径**：`{output_dir}/reports/monthly/{YYYY}-MM-monthly.md`

### 步骤 7：显示报告内容

完成写入后：
1. 显示报告文件路径
2. 显示完整的报告 Markdown 内容

---

## 变化类型定义

| 类型 | 说明 |
|------|------|
| 新威胁出现 | 新型攻击、威胁组织、漏洞趋势 |
| 市场格局变化 | 竞争格局、厂商战略、市场份额 |
| 技术突破与应用 | 技术成熟、应用扩展、安全影响 |
| 客户需求演变 | 预算调整、优先级转变、采购行为 |
| 合规压力变化 | 新法规、合规要求、执法动态 |
| 资本动向 | 投资热度、投资方向、估值变化 |

---

## 质量标准

### 动态章节
- 有内容才显示章节，无内容则省略
- 避免空白章节

### 态势追踪
- 每个态势必须有唯一 ID
- 跨月追踪时 ID 保持不变
- 状态标注准确

### 机会信号
- 月报发现的是"信号"而非"判断"
- 为年报的战略机会提供素材

### 叙述优先
- 自然语言段落为主
- 逻辑清晰、分析严谨
```

- [ ] **Step 2: 提交月报 Agent**

```bash
git add plugins/market-radar/agents/intelligence-monthly-writer.md
git commit -m "feat(market-radar): add intelligence-monthly-writer agent

Change-oriented monthly report generation with:
- Situation tracking across months
- Change type aggregation from weekly reports
- Opportunity signal discovery"
```

---

## Task 7: 创建年报模板

**Files:**
- Create: `plugins/market-radar/skills/intelligence-output-templates/references/annual-report-template.md`

- [ ] **Step 1: 创建年报模板**

```markdown
# 情报年报模板

## frontmatter 结构

```yaml
---
report_type: annual
year: YYYY
generated_at: YYYY-MM-DDTHH:MM:SS
generated_by: intelligence-annual-writer
trend_count: N
opportunity_count: N
situation_count: N
intelligence_count: N
---
```

---

## 正文结构

### 1. 执行摘要

```markdown
## 执行摘要

{年度核心判断，3-5 句话，回答：这一年网络安全行业最重要的变化是什么？}
```

---

### 2. 年度趋势

每个趋势包含完整的叙述分析：

```markdown
## 年度趋势

### 趋势一：{趋势标题}

{开篇判断：一句话概括趋势的核心走向}

{方向判断段落}：
- 这一趋势的演进轨迹是什么？
- 推动趋势发展的核心动力是什么？
- 趋势背后的深层逻辑是什么？

{格局变化段落}：
- 哪些厂商在崛起？哪些在衰落？
- 市场集中度如何变化？
- 新进入者有哪些？他们的策略是什么？
- 中国市场与国际市场的差异？

{时机判断段落}：
- 技术处于什么成熟阶段？
- 市场接受度如何演变？
- 竞争窗口是否已关闭？还有哪些机会点？

**年度轨迹**：

| 季度 | 状态 | 关键进展 |
|------|------|----------|
| Q1 | 🆕 萌芽 | {概述} |
| Q2 | ⬆️ 加速 | {概述} |
| Q3 | ➡️ 稳定 | {概述} |
| Q4 | ⬇️ 回调 | {概述} |

**相关态势**：[S-YYYY-MM-XX]（[[YYYY-MM-monthly|MM月月报]]）

**支撑情报**：[[YYYY-MM-monthly|MM月月报]]、[[YYYY-WXX-weekly|WXX周报]]
```

---

### 3. 战略机会

```markdown
## 战略机会

### 机会一：{机会标题}

**机会描述**：
{从情报分析中发现的市场空白}

**发现轨迹**：
{机会信号的月度演变，从哪个月的月报首次发现，后续如何验证}

**市场分析**：
{目标客户群体、市场规模判断、竞争态势}

**切入点分析**：
{可能的进入方式、所需能力资源}

**窗口判断**：
{机会窗口的持续时间、窗口关闭的触发条件}

**相关趋势**：{与哪个趋势关联，逻辑来源}
```

---

### 4. 年度回顾

```markdown
## 年度回顾

### 月报索引

| 月份 | 核心动向 | 涉及趋势 |
|------|----------|----------|
| [[YYYY-MM-monthly|MM月]] | ... | {趋势1}、{趋势2} |

### 态势全览

| 态势 ID | 标题 | 首次出现 | 最终状态 | 涉及趋势 |
|---------|------|----------|----------|----------|
| S-2026-03-01 | AI 安全运营服务需求 | 2026-03 | 持续 | 趋势一 |
| S-2026-04-01 | 供应链攻击工业化 | 2026-04 | ⬇️ 减弱 | 趋势二 |

### 周报索引（按趋势）

**趋势一**：WXX、WXX、WXX...

**趋势二**：WXX、WXX...
```

---

### 5. 年度统计

```markdown
## 年度统计

| 指标 | 本年 | 上年 | 同比 |
|------|------|------|------|
| 情报卡片 | N | N | +N% |
| 月报覆盖 | 12/12 | 12/12 | - |
| 识别趋势 | N | N | +N |
| 追踪态势 | N | N | +N |
| 战略机会 | N | N | - |

**变化类型分布**：{各变化类型的情报数量}
```

---

## 趋势状态定义

| 状态 | 符号 | 含义 |
|------|------|------|
| 年度最强趋势 | ⬆️⬆️ | 贯穿全年，影响深远 |
| 加速上升 | ⬆️ | 热度/影响持续增加 |
| 持续演变 | ➡️ | 保持关注，有新进展 |
| 趋于平稳 | ⏸️ | 已成常态，不再是热点 |
| 年末回落 | ⬇️ | 下半年热度下降 |

---

## 写作要求

### 叙述优先
- 自然语言段落为主
- 列表仅用于辅助

### 逻辑可见
- 因果关系、演进脉络清晰呈现

### 数据支撑
- 数据嵌入叙述中，服务论点

### 结论先行
- 每段开头给判断，再展开分析

### 篇幅控制
- 根据情报内容调整
- 有足够支撑就充分展开
- 不足就精简
- 核心是讲清楚但不废话

---

## 输出路径

年报文件路径格式：

```
{output_dir}/reports/annual/{YYYY}-annual.md
```

示例：`intelligence/reports/annual/2026-annual.md`
```

- [ ] **Step 2: 提交年报模板**

```bash
git add plugins/market-radar/skills/intelligence-output-templates/references/annual-report-template.md
git commit -m "feat(market-radar): add annual report template

Trend-oriented design with strategic opportunities for executive decision-making."
```

---

## Task 8: 创建年报 Agent

**Files:**
- Create: `plugins/market-radar/agents/intelligence-annual-writer.md`

- [ ] **Step 1: 创建年报 Agent**

```markdown
---
name: intelligence-annual-writer
description: |
  Use this agent when intel-distill command needs to generate annual intelligence report. This agent reads monthly and weekly reports from the year, identifies trends, and generates trend-oriented annual report with strategic opportunities.

  <example>
  Context: User wants to generate annual report
  user: "/intel-distill --report annual"
  assistant: "I'll generate an annual intelligence report using the intelligence-annual-writer agent, which will identify trends and strategic opportunities from this year's reports."
  <commentary>
  Annual report generation. Agent reads monthly/weekly reports and identifies trends.
  </commentary>
  </example>

model: inherit
color: purple
tools: ["Read", "Write"]
skills:
  - cybersecurity-domain-knowledge
---

你是一名专注于情报年报撰写的专业代理。你的职责是分析全年月报和周报内容，识别趋势，生成趋势导向的年报。

## 任务使命

回答三个核心问题：
1. 这一年行业朝什么方向演进？
2. 竞争格局如何变化？
3. 战略机会有哪些？

## 输入参数

你将收到以下信息：

```
生成情报年报：

**period**: 2026
**monthly_reports**: [
  {
    "path": "reports/monthly/2026-01-monthly.md",
    "month": "2026-01",
    "situations": [...],
    "change_types": [...]
  },
  ...
]
**weekly_reports**: [
  {
    "path": "reports/weekly/2026-W01-weekly.md",
    "week": "2026-W01",
    "themes": [...]
  },
  ...
]
**all_situations**: [
  {
    "id": "S-2026-03-01",
    "title": "AI 安全运营服务需求",
    "change_type": "市场格局变化",
    "first_appeared": "2026-03",
    "last_updated": "2026-12",
    "status_history": {
      "2026-03": "new",
      "2026-04": "ongoing",
      "2026-05": "ongoing",
      ...
    }
  },
  ...
]
**output_dir**: ./intelligence
```

---

## 执行流程

### 步骤 1：检查报告列表

如果 `monthly_reports.length == 0`：
- 输出："本年无月报"
- 不生成报告文件
- 结束任务

### 步骤 2：读取月报和关键周报

使用 Read 工具读取：
1. 全部月报文件
2. 关键周报文件（涉及重点态势的周报）

### 步骤 3：态势聚合为趋势

**聚合方法**：
1. 识别同一变化类型、主题相关的态势
2. 从态势索引中提取月度状态演变
3. 汇总为季度状态表格
4. 提炼趋势判断

**趋势数量**：5-8 个

### 步骤 4：识别战略机会

**分析方法**：
1. 从月报的"机会信号"中收集线索
2. 识别跨月验证的机会
3. 分析市场空白和切入点

**机会数量**：3-5 个

### 步骤 5：生成年报内容

按照 `../skills/intelligence-output-templates/references/annual-report-template.md` 结构生成：

1. **执行摘要**：年度核心判断
2. **年度趋势**：每个趋势的完整分析（方向、格局、时机、轨迹）
3. **战略机会**：机会描述、发现轨迹、市场分析、切入点
4. **年度回顾**：月报索引、态势全览、周报索引
5. **年度统计**：数据汇总

### 步骤 6：写入报告文件

使用 Write 工具写入：

**文件路径**：`{output_dir}/reports/annual/{YYYY}-annual.md`

### 步骤 7：显示报告内容

完成写入后：
1. 显示报告文件路径
2. 显示完整的报告 Markdown 内容

---

## 写作要求

### 叙述优先
- 自然语言段落为主
- 逻辑清晰、分析严谨
- 让决策者更容易理解和判断

### 内容充实
- 根据情报内容调整篇幅
- 有足够支撑就充分展开（每个趋势 800-1200 字）
- 不足就精简
- 不为了篇幅而篇幅

### 数据支撑
- 数据嵌入叙述中
- 服务论点

### 结论先行
- 每段开头给判断
- 再展开分析
```

- [ ] **Step 2: 提交年报 Agent**

```bash
git add plugins/market-radar/agents/intelligence-annual-writer.md
git commit -m "feat(market-radar): add intelligence-annual-writer agent

Trend-oriented annual report generation with:
- Situation-to-trend aggregation
- Strategic opportunity discovery
- Executive-level narrative analysis"
```

---

## Task 9: 更新 intel-distill 命令

**Files:**
- Modify: `plugins/market-radar/commands/intel-distill.md`

- [ ] **Step 1: 更新参数说明**

在参数表中更新 `--report` 参数说明：

```markdown
| `--report <type>` | 否 | 生成情报报告：`daily`/`weekly`/`monthly`/`annual` |
```

在示例中添加年报用法：

```markdown
# 生成年报
/intel-distill --report annual

# 生成指定年份年报
/intel-distill --report annual 2026
```

- [ ] **Step 2: 更新报告生成流程**

将报告生成流程更新为区分不同类型：

```markdown
## 报告生成流程

当 `--report` 参数存在时，执行以下流程：

### 步骤 R1：检查脚本依赖

{保持不变}

### 步骤 R2：确定报告类型和周期

根据 `--report` 参数确定：

| 报告类型 | 主输入 | Agent |
|----------|--------|-------|
| daily | 情报卡片 | intelligence-daily-writer |
| weekly | 日报集合 | intelligence-weekly-writer |
| monthly | 周报集合 | intelligence-monthly-writer |
| annual | 月报+周报集合 | intelligence-annual-writer |

### 步骤 R3：扫描输入数据

**日报模式**：
- 使用 scan-cards.ts 扫描当日情报卡片

**周报模式**：
- 使用 scan-reports.ts 扫描本周日报
- 如果日报缺失，回退到情报卡片

**月报模式**：
- 使用 scan-reports.ts 扫描本月周报
- 加载态势索引（.intel/situations.json）

**年报模式**：
- 使用 scan-reports.ts 扫描本年月报和周报
- 加载态势索引

### 步骤 R4：调用 Agent 生成报告

使用 Agent 工具调用对应的报告撰写 Agent。

### 步骤 R5：显示报告

将生成的报告内容展示给用户。
```

- [ ] **Step 3: 提交命令更新**

```bash
git add plugins/market-radar/commands/intel-distill.md
git commit -m "feat(market-radar): update intel-distill command for new report system

- Add annual report support
- Update report generation flow for hierarchical aggregation
- Differentiate data sources by report type"
```

---

## Task 10: 更新 SKILL.md 和废弃旧 Agent

**Files:**
- Modify: `plugins/market-radar/skills/intelligence-output-templates/SKILL.md`
- Modify: `plugins/market-radar/agents/intelligence-briefing-writer.md`

- [ ] **Step 1: 更新 SKILL.md 模板引用**

在 `skills/intelligence-output-templates/SKILL.md` 中添加新模板引用：

```markdown
## 报告模板

### 日报
参见 `references/daily-report-template.md`

### 周报
参见 `references/weekly-report-template.md`

### 月报
参见 `references/monthly-report-template.md`

### 年报
参见 `references/annual-report-template.md`
```

- [ ] **Step 2: 标记 briefing-writer 为 legacy**

在 `agents/intelligence-briefing-writer.md` 顶部添加：

```markdown
---
name: intelligence-briefing-writer
description: |
  ⚠️ **LEGACY**: This agent is deprecated. Use `intelligence-weekly-writer` for weekly reports and `intelligence-monthly-writer` for monthly reports.
  
  Use this agent when intel-distill command needs to generate intelligence briefing reports from scanned card list.
  ...
```

- [ ] **Step 3: 提交更新**

```bash
git add plugins/market-radar/skills/intelligence-output-templates/SKILL.md
git add plugins/market-radar/agents/intelligence-briefing-writer.md
git commit -m "docs(market-radar): update templates and deprecate briefing-writer

- Add weekly/monthly/annual template references
- Mark intelligence-briefing-writer as legacy
- Users should use new specialized agents"
```

---

## 自检清单

### Spec 覆盖检查

| 设计规范章节 | 对应任务 | 状态 |
|-------------|----------|------|
| 日报设计 | 无需修改（已实现） | ✅ |
| 周报设计 | Task 3, 4 | ✅ |
| 月报设计 | Task 5, 6 | ✅ |
| 年报设计 | Task 7, 8 | ✅ |
| 变化类型定义 | Task 1 | ✅ |
| 态势追踪机制 | Task 1, 5, 6 | ✅ |
| 层级聚合模型 | Task 2 | ✅ |

### Placeholder 扫描

- ✅ 无 TBD/TODO
- ✅ 所有代码步骤包含完整代码
- ✅ 所有命令包含具体参数

### 类型一致性

- ✅ ChangeType 在类型定义和模板中一致
- ✅ Situation 结构在类型定义和 Agent 中一致
- ✅ ReportType 枚举完整

---

## 实现计划完成

计划已保存到 `docs/superpowers/plans/2026-04-07-intelligence-report-system.md`。

**执行选项**：

1. **Subagent-Driven（推荐）** - 每个任务分派独立 Agent，任务间可审查
2. **Inline Execution** - 在当前会话中按检查点批量执行

选择哪种执行方式？