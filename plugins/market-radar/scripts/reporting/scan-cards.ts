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
import { parseFrontmatter as parseFrontmatterBase } from '../utils/frontmatter';

/**
 * Parse frontmatter and return both data and body content
 * Wraps the shared parseFrontmatter for compatibility with this script
 */
function parseFrontmatter(content: string): { data: Record<string, unknown>; content: string } {
  // Extract body content first
  const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
  const body = match ? match[1] : content;

  const data = parseFrontmatterBase(content);
  return { data: data || {}, content: body };
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
  archived_file?: string | null;
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

// 新增：Agent 格式元数据（轻量级，无正文摘要）
// 用于传递给 Agent，由 Agent 决定读取哪些卡片
interface CardMetadataAgent {
  // === 核心标识 ===
  intelligence_id: string;
  card_path: string;          // 关键：用于 Agent Read

  // === 基础元数据 ===
  title: string;
  created_date: string;       // YYYY-MM-DD
  primary_domain: string;
  secondary_domains: string[];
  security_relevance: string; // critical/high/medium/low
  tags: string[];

  // === 来源追溯 ===
  source_name?: string;
  source_tier?: string;       // T1/T2/T3
  published_at?: string;

  // === 领域特定字段（用于聚合判断）===
  vendor_name?: string;       // Vendor-Intelligence
  tech_name?: string;         // Vendor-Intelligence, Emerging-Tech
  threat_actor?: string;      // Threat-Landscape
  threat_type?: string;       // Threat-Landscape
  company?: string;           // Capital-Investment
  investors?: string;         // Capital-Investment
  policy_name?: string;       // Policy-Regulation
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

// 七大情报领域（类型定义）
type IntelligenceDomain =
  | 'Threat-Landscape'
  | 'Industry-Analysis'
  | 'Vendor-Intelligence'
  | 'Emerging-Tech'
  | 'Customer-Market'
  | 'Policy-Regulation'
  | 'Capital-Investment';

const INTELLIGENCE_DOMAINS: IntelligenceDomain[] = [
  'Threat-Landscape',
  'Industry-Analysis',
  'Vendor-Intelligence',
  'Emerging-Tech',
  'Customer-Market',
  'Policy-Regulation',
  'Capital-Investment'
];

// === 运行时类型验证辅助函数 ===

/**
 * 安全获取字符串值
 */
function safeString(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * 安全获取字符串数组值
 */
function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

/**
 * 安全获取可选字符串值
 */
function safeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * 安全获取可选数值
 */
function safeOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

/**
 * 验证日期格式 (YYYY-MM-DD)
 */
function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

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
 * 扫描卡片基础函数（泛型实现）
 *
 * 提取公共的目录迭代、错误处理、日期验证逻辑，通过回调函数处理不同格式的卡片转换。
 *
 * @param outputDir - 输出目录
 * @param dateRange - 日期范围
 * @param transformCard - 卡片转换回调，返回 null 表示跳过该卡片
 * @param options - 可选配置
 */
async function scanCardsBase<T>(
  outputDir: string,
  dateRange: { start: string; end: string },
  transformCard: (
    frontmatter: Record<string, unknown>,
    body: string,
    domain: string,
    file: string
  ) => T | null,
  options?: {
    /** 是否需要读取 body 内容，默认 false */
    includeBody?: boolean;
  }
): Promise<T[]> {
  const cards: T[] = [];
  const includeBody = options?.includeBody ?? false;

  for (const domain of INTELLIGENCE_DOMAINS) {
    const domainPath = join(outputDir, domain);

    try {
      const files = await glob('**/*.md', { cwd: domainPath, absolute: false });

      for (const file of files) {
        const filePath = join(domainPath, file);

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const { data: frontmatter, content: body } = parseFrontmatter(content);

          const createdDate = safeString(frontmatter.created_date);
          if (!createdDate) {
            continue;
          }

          if (!isValidDateFormat(createdDate)) {
            console.warn(`Warning: Invalid date format "${createdDate}" in ${filePath}`);
            continue;
          }

          if (createdDate >= dateRange.start && createdDate <= dateRange.end) {
            const card = transformCard(
              frontmatter,
              includeBody ? body : '',
              domain,
              file
            );
            if (card !== null) {
              cards.push(card);
            }
          }
        } catch (fileErr) {
          const errMsg = fileErr instanceof Error ? fileErr.message : String(fileErr);
          console.warn(`Warning: Failed to process file ${filePath}: ${errMsg}`);
        }
      }
    } catch (error) {
      const isEnoent = error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
      if (isEnoent) {
        console.warn(`Info: Domain directory not found: ${domainPath} (skipping)`);
      } else {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Failed to scan domain ${domain} at ${domainPath}: ${errMsg}`);
      }
    }
  }

  return cards;
}

/**
 * 扫描卡片（基础格式，用于 list 输出）
 */
async function scanCards(
  outputDir: string,
  dateRange: { start: string; end: string }
): Promise<ScanResult['cards']> {
  return scanCardsBase(outputDir, dateRange, (frontmatter, _body, domain, file) => ({
    path: `${domain}/${file}`,
    metadata: {
      title: safeString(frontmatter.title) || file.replace('.md', ''),
      created_date: safeString(frontmatter.created_date),
      primary_domain: domain
    }
  }));
}

/**
 * 扫描卡片（完整格式，用于 JSON 输出）
 */
async function scanCardsFull(
  outputDir: string,
  dateRange: { start: string; end: string }
): Promise<CardMetadataFull[]> {
  return scanCardsBase(
    outputDir,
    dateRange,
    (frontmatter, body, domain, file) => {
      const bodySummary = body.slice(0, 500).trim();

      return {
        intelligence_id: safeString(frontmatter.intelligence_id),
        title: safeString(frontmatter.title) || file.replace('.md', ''),
        created_date: safeString(frontmatter.created_date),
        primary_domain: domain,
        secondary_domains: safeStringArray(frontmatter.secondary_domains),
        security_relevance: safeString(frontmatter.security_relevance) || 'medium',
        tags: safeStringArray(frontmatter.tags),
        published_at: safeOptionalString(frontmatter.published_at),
        source_name: safeOptionalString(frontmatter.source_name),
        source_tier: safeOptionalString(frontmatter.source_tier),
        item_id: safeOptionalString(frontmatter.item_id),
        item_title: safeOptionalString(frontmatter.item_title),
        original_url: safeOptionalString(frontmatter.original_url),
        completeness_score: safeOptionalNumber(frontmatter.completeness_score),
        archived_file: safeOptionalString(frontmatter.archived_file),
        converted_file: safeOptionalString(frontmatter.converted_file),
        card_path: `${domain}/${file}`,
        body_summary: bodySummary,
        // Domain-specific fields
        threat_type: safeOptionalString(frontmatter.threat_type),
        threat_actor: safeOptionalString(frontmatter.threat_actor),
        target_sector: safeOptionalString(frontmatter.target_sector),
        target_region: safeOptionalString(frontmatter.target_region),
        vendor_name: safeOptionalString(frontmatter.vendor_name),
        tech_name: safeOptionalString(frontmatter.tech_name),
        policy_name: safeOptionalString(frontmatter.policy_name),
        company: safeOptionalString(frontmatter.company),
        investors: safeOptionalString(frontmatter.investors),
        event_type: safeOptionalString(frontmatter.event_type),
      };
    },
    { includeBody: true }  // JSON 格式需要读取 body 用于生成摘要
  );
}

/**
 * 扫描卡片（Agent 格式，轻量元数据，无正文摘要）
 *
 * 设计说明：
 * - 不读取 body 内容，减少文件 I/O
 * - 输出仅包含路径和元数据，由 Agent 按需读取卡片内容
 * - 保护主会话上下文，避免被大量卡片摘要占满
 */
async function scanCardsAgent(
  outputDir: string,
  dateRange: { start: string; end: string }
): Promise<CardMetadataAgent[]> {
  return scanCardsBase(outputDir, dateRange, (frontmatter, _body, domain, file) => ({
    intelligence_id: safeString(frontmatter.intelligence_id),
    card_path: `${domain}/${file}`,
    title: safeString(frontmatter.title) || file.replace('.md', ''),
    created_date: safeString(frontmatter.created_date),
    primary_domain: domain,
    secondary_domains: safeStringArray(frontmatter.secondary_domains),
    security_relevance: safeString(frontmatter.security_relevance) || 'medium',
    tags: safeStringArray(frontmatter.tags),
    source_name: safeOptionalString(frontmatter.source_name),
    source_tier: safeOptionalString(frontmatter.source_tier),
    published_at: safeOptionalString(frontmatter.published_at),
    // Domain-specific fields for aggregation
    vendor_name: safeOptionalString(frontmatter.vendor_name),
    tech_name: safeOptionalString(frontmatter.tech_name),
    threat_actor: safeOptionalString(frontmatter.threat_actor),
    threat_type: safeOptionalString(frontmatter.threat_type),
    company: safeOptionalString(frontmatter.company),
    investors: safeOptionalString(frontmatter.investors),
    policy_name: safeOptionalString(frontmatter.policy_name),
  }));
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
    .option('--format <format>', 'Output format: list, json, or agent', 'list')
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
  if (!['list', 'json', 'agent'].includes(options.format)) {
    console.error(JSON.stringify({
      error: true,
      message: `Invalid format: ${options.format}. Must be 'list', 'json', or 'agent'`
    }));
    process.exit(1);
  }

  const period = options.period as string;
  const periodParam = options.param as string | undefined;
  const dateParam = options.date as string | undefined;
  const format = options.format as string;
  const outputDir = options.outputDir as string;

  // 验证 outputDir 目录是否存在且可访问
  try {
    await fs.access(outputDir);
  } catch (error) {
    const isEnoent = error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
    const message = isEnoent
      ? `Output directory does not exist: ${outputDir}`
      : `Cannot access output directory: ${outputDir}. ${error instanceof Error ? error.message : String(error)}`;
    console.error(JSON.stringify({
      error: true,
      message
    }));
    process.exit(1);
  }

  try {
    // 计算时间范围，传入 dateParam
    const dateRange = calculateDateRange(period, periodParam, dateParam);

    if (format === 'agent') {
      // === Agent 输出格式（轻量级，无正文摘要）===
      const agentCards = await scanCardsAgent(outputDir, dateRange);

      // Build stats
      const domainsDistribution: Record<string, number> = {};
      const sourcesDistribution: Record<string, number> = {};

      for (const card of agentCards) {
        domainsDistribution[card.primary_domain] =
          (domainsDistribution[card.primary_domain] || 0) + 1;
        if (card.source_name) {
          sourcesDistribution[card.source_name] =
            (sourcesDistribution[card.source_name] || 0) + 1;
        }
      }

      // Determine output date
      let outputDate: string;
      if (period === 'daily') {
        outputDate = dateParam || periodParam || new Date().toISOString().split('T')[0];
      } else {
        outputDate = formatPeriodParam(period, periodParam, dateRange);
      }

      console.log(JSON.stringify({
        date: outputDate,
        cards: agentCards.sort((a, b) => b.created_date.localeCompare(a.created_date)),
        stats: {
          total_count: agentCards.length,
          domains_distribution: domainsDistribution,
          sources_distribution: sourcesDistribution
        }
      }, null, 2));
    } else if (format === 'json') {
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