import type { ChangeType } from './change-type';

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
  change_type: ChangeType;
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