/**
 * Cleaner types definition
 */

import * as path from 'path';

/**
 * Document source types
 */
export type DocumentSource =
  | 'web'        // Web articles
  | 'pdf-report' // PDF reports (Gartner, etc.)
  | 'wechat'     // WeChat official accounts
  | 'social'     // Social media (Twitter/X)
  | 'docx'       // Office documents
  | 'unknown';   // Unknown source

/**
 * Rule scope
 */
export type RuleScope =
  | 'common'     // All sources (including unknown)
  | 'basic'      // unknown + all specific sources
  | 'specific';  // Specific sources only

/**
 * Cleaner context
 */
export interface CleanerContext {
  content: string;
  source: DocumentSource;
  confidence: number;
  filePath: string;
}

/**
 * Cleaner definition
 */
export interface Cleaner {
  name: string;
  priority: number;
  scope: RuleScope;
  sources: DocumentSource[];
  clean(content: string, context: CleanerContext): string;
}

/**
 * Clean statistics
 */
export interface CleanStats {
  originalSize: number;
  cleanedSize: number;
  compressionRate: number;
}

/**
 * Cleaner result
 */
export interface CleanerResult {
  content: string;
  source: DocumentSource;
  appliedRules: string[];
  stats: CleanStats;
}

/**
 * Detection result
 */
export interface DetectionResult {
  source: DocumentSource;
  confidence: number;
  matchedSignals: string[];
}

/**
 * Source detection signal
 */
interface SourceSignal {
  source: DocumentSource;
  patterns: RegExp[];
  contentSignals: RegExp[];
  weight: number;
  signalName: string;
}

/**
 * Source detection signals
 */
const SOURCE_SIGNALS: SourceSignal[] = [
  // WeChat official accounts
  {
    source: 'wechat',
    patterns: [/mmbiz\.qpic\.cn/, /mmbiz\.qlogo\.cn/],
    contentSignals: [/长按识别二维码/, /阅读原文/, /公众号/],
    weight: 0.8,
    signalName: 'wechat-content',
  },

  // PDF reports
  {
    source: 'pdf-report',
    patterns: [],
    contentSignals: [
      /Gartner.*\|.*G\d{8}/,
      /©\s*\d{4}.*Inc\./,
      /Figure\s+\d+\./,
    ],
    weight: 0.7,
    signalName: 'report-format',
  },

  // Social media
  {
    source: 'social',
    patterns: [/pbs\.twimg\.com/, /twitter\.com/, /x\.com/],
    contentSignals: [/Post your reply/, /Retweet/, /^@\w+\s*$/m],
    weight: 0.6,
    signalName: 'social-ui',
  },

  // Web articles
  {
    source: 'web',
    patterns: [],
    contentSignals: [/分享到/, /ICP备案/, /Copyright ©/],
    weight: 0.5,
    signalName: 'web-common',
  },
];

/**
 * Detect document source
 */
export function detectSource(
  content: string,
  filePath: string
): DetectionResult {
  const scores: Map<DocumentSource, { score: number; signals: string[] }> = new Map();

  // Initialize
  for (const signal of SOURCE_SIGNALS) {
    scores.set(signal.source, { score: 0, signals: [] });
  }

  // Check file extension
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const current = scores.get('pdf-report')!;
    current.score += 0.3;
    current.signals.push('file-extension:pdf');
  }

  // Check content signals
  for (const signal of SOURCE_SIGNALS) {
    for (const pattern of signal.contentSignals) {
      if (pattern.test(content)) {
        const current = scores.get(signal.source)!;
        current.score += signal.weight;
        current.signals.push(signal.signalName);
      }
    }
  }

  // Find highest score
  let maxSource: DocumentSource = 'unknown';
  let maxScore = 0;
  let matchedSignals: string[] = [];

  scores.forEach((data, source) => {
    if (data.score > maxScore) {
      maxScore = data.score;
      maxSource = source;
      matchedSignals = data.signals;
    }
  });

  // Threshold: low score = unknown
  if (maxScore < 0.5) {
    return {
      source: 'unknown',
      confidence: maxScore,
      matchedSignals,
    };
  }

  return {
    source: maxSource,
    confidence: maxScore,
    matchedSignals,
  };
}

/**
 * Calculate clean statistics
 */
export function calculateStats(original: string, cleaned: string): CleanStats {
  const originalSize = Buffer.byteLength(original, 'utf-8');
  const cleanedSize = Buffer.byteLength(cleaned, 'utf-8');
  const compressionRate = originalSize > 0
    ? (originalSize - cleanedSize) / originalSize
    : 0;

  return {
    originalSize,
    cleanedSize,
    compressionRate,
  };
}