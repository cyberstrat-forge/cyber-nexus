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