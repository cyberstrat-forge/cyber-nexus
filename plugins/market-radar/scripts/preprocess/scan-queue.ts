#!/usr/bin/env tsx
/**
 * Scan converted files and build processing queue
 *
 * Scans converted directory for markdown files, calculates content hashes,
 * and checks processed_status to determine which files need processing.
 *
 * Usage:
 *   pnpm exec tsx scan-queue.ts --source <dir> [--output json|text]
 *
 * Output (JSON format):
 * {
 *   "total": 100,
 *   "already_processed": 85,
 *   "needs_processing": 10,
 *   "pending_review": 5,
 *   "queue": [...]
 * }
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { parseFrontmatter } from '../utils/frontmatter';
import { PendingItem } from './types/pending';

// Threshold for recommending script usage
const RECOMMENDED_SCRIPT_THRESHOLD = 50;

/**
 * Status of a file in the processing queue
 */
export type QueueItemStatus =
  | 'needs_processing'   // New file or content changed
  | 'pending_review';    // Already in review queue

/**
 * Item in the processing queue
 */
export interface QueueItem {
  file: string;           // Relative path from source_dir
  content_hash: string;   // MD5 hash of file content
  source_hash?: string;   // MD5 hash of original source file (from frontmatter)
  archived_source?: string; // Path to archived source file (from frontmatter)
  status: QueueItemStatus;
}

/**
 * Result of scan and queue building
 */
export interface ScanQueueResult {
  source_dir: string;
  total: number;
  already_processed: number;
  needs_processing: number;
  pending_review: number;
  queue: QueueItem[];
  threshold: number;
  recommendation: 'glob' | 'script';
}

/**
 * Processed status in converted file frontmatter
 */
type ProcessedStatus = 'pending' | 'passed' | 'rejected';

/**
 * Converted file frontmatter (new fields)
 */
interface ConvertedFrontmatter {
  sourceHash?: string;
  processed_status?: ProcessedStatus;
  processed_at?: string | null;
  archivedSource?: string;
}

/**
 * Intelligence card frontmatter (for converted_file lookup)
 */
interface IntelligenceFrontmatter {
  converted_file?: string;
  converted_content_hash?: string;
}

/**
 * Get pending.json path
 */
function getPendingPath(sourceDir: string): string {
  return path.join(sourceDir, '.intel', 'pending.json');
}

/**
 * Load pending.json
 */
function loadPending(pendingPath: string): {
  review: { items: PendingItem[] };
  pulse: { cursors: Record<string, unknown> };
} | null {
  if (!fs.existsSync(pendingPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(pendingPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Cannot read pending.json at ${pendingPath}: ${errMsg}`);
    return null;
  }
}

/**
 * Scan intelligence cards to build converted_file lookup
 */
function scanIntelligenceCards(sourceDir: string): Map<string, string> {
  const convertedToHash = new Map<string, string>();
  const intelligenceDir = path.join(sourceDir, 'intelligence');

  if (!fs.existsSync(intelligenceDir)) {
    return convertedToHash;
  }

  // Recursively scan intelligence/**/*.md
  const scanDir = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const frontmatter = parseFrontmatter(content) as IntelligenceFrontmatter | null;
          if (frontmatter?.converted_file) {
            // Extract converted_file from WikiLink format: [[path]]
            const convertedFile = frontmatter.converted_file
              .replace(/^\[\[/, '')
              .replace(/\]\]$/, '');
            convertedToHash.set(
              convertedFile,
              frontmatter.converted_content_hash || ''
            );
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Cannot read intelligence card ${fullPath}: ${errMsg}`);
        }
      }
    }
  };

  scanDir(intelligenceDir);
  return convertedToHash;
}

/**
 * Recursively scan directory for markdown files
 */
function scanMarkdownFiles(dir: string, baseDir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Cannot read directory ${dir}: ${errMsg}`);
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      files.push(...scanMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Return relative path from base directory
      files.push(path.relative(baseDir, fullPath));
    }
  }

  return files;
}

/**
 * Scan converted files and build processing queue
 */
function scanAndBuildQueue(
  sourceDir: string,
  pendingPath?: string
): ScanQueueResult {
  // Resolve paths
  const resolvedSourceDir = path.resolve(sourceDir);
  const resolvedPendingPath = pendingPath || getPendingPath(resolvedSourceDir);

  // Load pending items
  const pending = loadPending(resolvedPendingPath);
  const pendingReviewSet = new Set<string>();
  if (pending?.review?.items) {
    for (const item of pending.review.items) {
      pendingReviewSet.add(item.converted_file);
    }
  }

  // Scan intelligence cards for converted_file lookup
  const convertedToHash = scanIntelligenceCards(resolvedSourceDir);

  // Scan converted files
  const convertedDir = path.join(resolvedSourceDir, 'converted');
  const relativeFiles = scanMarkdownFiles(convertedDir, resolvedSourceDir);

  // Build queue
  const queue: QueueItem[] = [];
  let alreadyProcessed = 0;
  let needsProcessing = 0;
  let pendingReview = 0;

  for (const relativePath of relativeFiles) {
    const filePath = path.join(resolvedSourceDir, relativePath);

    // Read file content
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Cannot read file ${relativePath}: ${errMsg}`);
      continue;
    }

    // Calculate content hash
    const contentHash = createHash('md5').update(content).digest('hex');

    // Parse frontmatter
    const frontmatter = parseFrontmatter(content) as ConvertedFrontmatter | null;
    const sourceHash = frontmatter?.sourceHash;
    const archivedSource = frontmatter?.archivedSource;
    const processedStatus = frontmatter?.processed_status;

    // Check if in pending review
    if (pendingReviewSet.has(relativePath)) {
      queue.push({
        file: relativePath,
        content_hash: contentHash,
        source_hash: sourceHash,
        archived_source: archivedSource,
        status: 'pending_review',
      });
      pendingReview++;
      continue;
    }

    // Check processed_status
    if (processedStatus === 'rejected') {
      // Skip rejected files
      alreadyProcessed++;
      continue;
    }

    if (processedStatus === 'passed') {
      // Verify intelligence card exists with matching hash
      const recordedHash = convertedToHash.get(relativePath);
      if (recordedHash && recordedHash === contentHash) {
        // Already processed, content unchanged
        alreadyProcessed++;
        continue;
      }
      // Content changed or card missing - needs reprocessing
    }

    // pending, missing status, or needs reprocessing
    queue.push({
      file: relativePath,
      content_hash: contentHash,
      source_hash: sourceHash,
      archived_source: archivedSource,
      status: 'needs_processing',
    });
    needsProcessing++;
  }

  // Determine recommendation
  const totalNeedsProcessing = needsProcessing + pendingReview;
  const recommendation = totalNeedsProcessing >= RECOMMENDED_SCRIPT_THRESHOLD
    ? 'script'
    : 'glob';

  return {
    source_dir: resolvedSourceDir,
    total: relativeFiles.length,
    already_processed: alreadyProcessed,
    needs_processing: needsProcessing,
    pending_review: pendingReview,
    queue,
    threshold: RECOMMENDED_SCRIPT_THRESHOLD,
    recommendation,
  };
}

/**
 * Format result as text
 */
function formatAsText(result: ScanQueueResult): string {
  const lines: string[] = [
    `Source: ${result.source_dir}`,
    '',
    '【扫描结果】',
    `• 转换文件总数: ${result.total}`,
    `• 已处理（跳过）: ${result.already_processed}`,
    `• 待处理: ${result.needs_processing}`,
    `• 已在审核队列: ${result.pending_review}`,
    '',
    '【处理建议】',
    `• 阈值: ${result.threshold} 个文件`,
    `• 推荐: ${result.recommendation === 'script' ? '脚本处理' : 'Glob 工具'}`,
  ];

  if (result.needs_processing > 0) {
    lines.push('');
    lines.push('【待处理文件】');
    for (const item of result.queue) {
      if (item.status === 'needs_processing') {
        lines.push(`  - ${item.file}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  let sourceDir = '.';
  let outputFormat: 'json' | 'text' = 'json';

  // Parse arguments
  // Note: pending.json path is derived from sourceDir automatically
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && i + 1 < args.length) {
      sourceDir = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputFormat = args[i + 1] as 'json' | 'text';
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Usage: pnpm exec tsx scan-queue.ts --source <dir> [--output json|text]

Scan converted files and build processing queue for intel-distill.

Options:
  --source <dir>   Source directory (default: current directory)
  --output <fmt>   Output format: json or text (default: json)
  --help           Show this help message

Note: pending.json path is automatically derived from source directory
      ({source}/.intel/pending.json)

Threshold: ${RECOMMENDED_SCRIPT_THRESHOLD} files
  - < ${RECOMMENDED_SCRIPT_THRESHOLD}: Recommend using Glob tool directly
  - >= ${RECOMMENDED_SCRIPT_THRESHOLD}: Recommend using this script

Output JSON structure:
  {
    "source_dir": string,
    "total": number,
    "already_processed": number,
    "needs_processing": number,
    "pending_review": number,
    "queue": [{ file, content_hash, status, ... }],
    "threshold": number,
    "recommendation": "glob" | "script"
  }
      `);
      process.exit(0);
    }
  }

  const result = scanAndBuildQueue(sourceDir);

  if (outputFormat === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatAsText(result));
  }
}

// Run if called directly
if (process.argv[1]?.endsWith('scan-queue.ts') || process.argv[1]?.endsWith('scan-queue.js')) {
  main();
}

export {
  scanAndBuildQueue,
  RECOMMENDED_SCRIPT_THRESHOLD,
};