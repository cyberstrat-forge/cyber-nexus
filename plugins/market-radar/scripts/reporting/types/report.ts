import type { ChangeType } from './change-type';

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