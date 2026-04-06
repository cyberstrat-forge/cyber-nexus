#!/usr/bin/env node
/**
 * 扫描情报卡片，筛选指定时间范围内的卡片
 *
 * Usage: pnpm exec tsx scan-cards.ts --period weekly --param "2026-W10" --output-dir ./intel
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

// 前端解析库（简化实现，避免额外依赖）
function parseFrontmatter(content: string): { data: Record<string, unknown>; content: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, content };
  }

  const frontmatterStr = match[1];
  const body = match[2];
  const data: Record<string, unknown> = {};

  // 简单的 YAML 解析（支持 key: value 格式）
  const lines = frontmatterStr.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value: string | string[] = line.slice(colonIndex + 1).trim();

      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // 处理数组格式 [item1, item2]
      if (value.startsWith('[') && value.endsWith(']')) {
        const inner = value.slice(1, -1).trim();
        if (inner === '') {
          value = [];
        } else {
          value = inner.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
        }
      }

      data[key] = value;
    }
  }

  return { data, content: body };
}

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

// 七大情报领域
const INTELLIGENCE_DOMAINS = [
  'Threat-Landscape',
  'Industry-Analysis',
  'Vendor-Intelligence',
  'Emerging-Tech',
  'Customer-Market',
  'Policy-Regulation',
  'Capital-Investment'
];

/**
 * 计算时间范围
 */
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

  if (!param) {
    // 默认：当前周/当前月
    if (period === 'weekly') {
      // 当前周的周一
      const monday = new Date(today);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);

      return {
        start: monday.toISOString().split('T')[0],
        end: todayStr
      };
    } else {
      // 当前月
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: firstDay.toISOString().split('T')[0],
        end: todayStr
      };
    }
  } else {
    // 指定参数
    if (period === 'weekly') {
      // ISO 8601 周格式：2026-W10 或 2026 10
      let year: number, week: number;

      if (param.includes('-W')) {
        const parts = param.split('-W');
        year = parseInt(parts[0], 10);
        week = parseInt(parts[1], 10);
      } else if (param.includes(' ')) {
        const parts = param.split(' ');
        year = parseInt(parts[0], 10);
        week = parseInt(parts[1], 10);
      } else {
        // 尝试解析为 YYYY-Www 格式
        const match = param.match(/^(\d{4})-?W?(\d{1,2})$/);
        if (match) {
          year = parseInt(match[1], 10);
          week = parseInt(match[2], 10);
        } else {
          throw new Error(`Invalid weekly period format: ${param}`);
        }
      }

      // 计算该周的周一和周日
      // ISO 8601: 第1周是包含1月4日的那周
      const jan4 = new Date(year, 0, 4);
      const jan4Day = jan4.getDay() || 7; // 周日转为7
      const firstMonday = new Date(jan4);
      firstMonday.setDate(jan4.getDate() - jan4Day + 1);

      const monday = new Date(firstMonday);
      monday.setDate(firstMonday.getDate() + (week - 1) * 7);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
      };
    } else {
      // 月格式：2026-03 或 2026 03
      let year: number, month: number;

      if (param.includes('-')) {
        const parts = param.split('-');
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // JS 月份从 0 开始
      } else if (param.includes(' ')) {
        const parts = param.split(' ');
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
      } else {
        // 尝试解析为 YYYY-MM 格式
        const match = param.match(/^(\d{4})-?(\d{1,2})$/);
        if (match) {
          year = parseInt(match[1], 10);
          month = parseInt(match[2], 10) - 1;
        } else {
          throw new Error(`Invalid monthly period format: ${param}`);
        }
      }

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // 如果是当前月且未结束，使用今天作为结束日期
      const endDay = (year === today.getFullYear() && month === today.getMonth())
        ? todayStr
        : lastDay.toISOString().split('T')[0];

      return {
        start: firstDay.toISOString().split('T')[0],
        end: endDay
      };
    }
  }
}

/**
 * 扫描卡片
 */
async function scanCards(
  outputDir: string,
  dateRange: { start: string; end: string }
): Promise<ScanResult['cards']> {
  const cards: ScanResult['cards'] = [];

  for (const domain of INTELLIGENCE_DOMAINS) {
    const domainPath = join(outputDir, domain);

    try {
      // 使用 glob 递归查找所有 markdown 文件（支持年月子目录结构）
      const files = await glob('**/*.md', { cwd: domainPath, absolute: false });

      for (const file of files) {
        const filePath = join(domainPath, file);

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const { data: frontmatter } = parseFrontmatter(content);

          const createdDate = frontmatter.created_date as string;
          if (!createdDate) {
            // 没有 created_date 字段，跳过
            continue;
          }

          // 验证日期格式
          if (!/^\d{4}-\d{2}-\d{2}$/.test(createdDate)) {
            console.warn(`Warning: Invalid date format "${createdDate}" in ${filePath}`);
            continue;
          }

          // 检查是否在时间范围内
          if (createdDate >= dateRange.start && createdDate <= dateRange.end) {
            cards.push({
              path: `${domain}/${file}`,
              metadata: {
                title: (frontmatter.title as string) || file.replace('.md', ''),
                created_date: createdDate,
                primary_domain: domain
              }
            });
          }
        } catch (fileErr) {
          // 单个文件读取失败，记录警告但继续处理其他文件
          const errMsg = fileErr instanceof Error ? fileErr.message : String(fileErr);
          console.warn(`Warning: Failed to process file ${filePath}: ${errMsg}`);
        }
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      // 目录不存在是预期情况，静默跳过
      if (err.code !== 'ENOENT') {
        // 其他错误（权限、I/O等）打印警告
        console.warn(`Warning: Failed to scan domain ${domain} at ${domainPath}: ${err.message}`);
      }
    }
  }

  return cards;
}

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

            cards.push({
              intelligence_id: (frontmatter.intelligence_id as string) || '',
              title: (frontmatter.title as string) || file.replace('.md', ''),
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

/**
 * 格式化周期参数用于输出
 */
function formatPeriodParam(period: string, param: string | undefined, dateRange: { start: string; end: string }): string {
  if (param) {
    return param;
  }

  // 根据 date_range 生成周期标识
  if (period === 'weekly') {
    // 计算 ISO 周数
    const start = new Date(dateRange.start);
    const jan4 = new Date(start.getFullYear(), 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - jan4Day + 1);
    const weekNum = Math.ceil(((start.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
    return `${start.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  } else {
    const start = new Date(dateRange.start);
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * 主函数
 */
async function main() {
  const program = new Command();

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

  const options = program.opts();

  // 验证 period 参数
  if (!['weekly', 'monthly', 'daily'].includes(options.period)) {
    console.error(JSON.stringify({
      error: true,
      message: `Invalid period type: ${options.period}. Must be 'weekly', 'monthly', or 'daily'`
    }));
    process.exit(1);
  }

  // 验证 format 参数
  if (options.format !== 'list' && options.format !== 'json') {
    console.error(JSON.stringify({
      error: true,
      message: `Invalid format: ${options.format}. Must be 'list' or 'json'`
    }));
    process.exit(1);
  }

  const period = options.period as string;
  const periodParam = options.param as string | undefined;
  const dateParam = options.date as string | undefined;
  const format = options.format as string;
  const outputDir = options.outputDir as string;

  try {
    // 计算时间范围，传入 dateParam
    const dateRange = calculateDateRange(period, periodParam, dateParam);

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

      // 统计
      const stats = {
        total: cards.length,
        by_domain: {} as Record<string, number>
      };

      for (const card of cards) {
        const domain = card.metadata.primary_domain;
        stats.by_domain[domain] = (stats.by_domain[domain] || 0) + 1;
      }

      // 按日期排序（倒序）
      cards.sort((a, b) => {
        return b.metadata.created_date.localeCompare(a.metadata.created_date);
      });

      // 输出结果
      const result: ScanResult = {
        period,
        period_param: formatPeriodParam(period, periodParam, dateRange),
        date_range: dateRange,
        cards,
        stats
      };

      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(JSON.stringify({
      error: true,
      message: error instanceof Error ? error.message : String(error)
    }));
    process.exit(1);
  }
}

main();