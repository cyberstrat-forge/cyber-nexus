#!/usr/bin/env tsx
/**
 * Scan converted files and build processing queue
 *
 * Scans converted directory for markdown files, calculates content hashes,
 * and checks processed_status to determine which files need processing.
 *
 * Design principle: Single source of truth
 * - processed_status is the only indicator of processing state
 * - update-state.ts is the only component that updates this status
 * - This script only reads the status, does not verify intelligence cards
 *
 * Usage:
 *   pnpm exec tsx scan-queue.ts --root <dir> [--output json|text]
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
import { fromWikiLink } from './types/frontmatter';
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
  archived_file?: string | null; // WikiLink path to archived file (from frontmatter), null for cyber-pulse
  status: QueueItemStatus;
}

/**
 * Processed status in converted file frontmatter
 */
type ProcessedStatus = 'pending' | 'passed' | 'rejected';

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
 * Converted file frontmatter (supports new unified fields and legacy fields)
 */
interface ConvertedFrontmatter {
  // New fields (unified format)
  archived_file?: string | null;
  content_hash?: string;
  source_hash?: string;
  archived_at?: string;
  processed_status?: ProcessedStatus;
  processed_at?: string | null;

  // Legacy fields (for backward compatibility)
  sourceHash?: string;
  archivedSource?: string;
  archivedAt?: string;
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
    const data = JSON.parse(content);
    // Validate expected structure
    if (!data || typeof data !== 'object') {
      console.warn(`Warning: Invalid pending.json structure at ${pendingPath}: expected object`);
      return null;
    }
    return data;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error: Cannot parse pending.json at ${pendingPath}: ${errMsg}`);
    console.error('  This may indicate a corrupted state file. Consider backing up and reinitializing.');
    return null;
  }
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
 *
 * Simplified design: Only check processed_status, no intelligence card scanning
 * - passed/rejected → already processed
 * - pending/null → needs processing
 * - in pending.json → pending_review
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

    // Calculate content hash (body only, excluding frontmatter)
    // This matches the preprocessing script's approach in preprocess/index.ts
    const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    const bodyContent = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;
    const contentHash = createHash('md5').update(bodyContent).digest('hex');

    // Parse frontmatter
    const frontmatter = parseFrontmatter(content) as ConvertedFrontmatter | null;

    // Support both new and legacy field names for backward compatibility
    const sourceHash = frontmatter?.source_hash || frontmatter?.sourceHash;

    // archived_file can be: WikiLink string, null (cyber-pulse), or undefined
    // Use 'in' operator to check if key exists, preserving null value
    let archivedFile: string | null | undefined;
    if (frontmatter && 'archived_file' in frontmatter) {
      archivedFile = frontmatter.archived_file;
    } else if (frontmatter?.archivedSource !== undefined) {
      archivedFile = frontmatter.archivedSource;
    } else {
      archivedFile = undefined;
    }
    // Extract path from WikiLink if present (only for string values)
    if (typeof archivedFile === 'string' && archivedFile) {
      const extractedPath = fromWikiLink(archivedFile);
      if (extractedPath !== null) {
        archivedFile = extractedPath;
      } // else: malformed WikiLink, keep original value
    }

    const processedStatus = frontmatter?.processed_status;

    // Check if in pending review (from pending.json)
    if (pendingReviewSet.has(relativePath)) {
      queue.push({
        file: relativePath,
        content_hash: contentHash,
        source_hash: sourceHash,
        archived_file: archivedFile,
        status: 'pending_review',
      });
      pendingReview++;
      continue;
    }

    // Check processed_status (single source of truth)
    if (processedStatus === 'passed' || processedStatus === 'rejected') {
      alreadyProcessed++;
      continue;
    }

    // pending, null, or undefined → needs processing
    queue.push({
      file: relativePath,
      content_hash: contentHash,
      source_hash: sourceHash,
      archived_file: archivedFile,
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

  // Show pending review files
  if (result.pending_review > 0) {
    lines.push('');
    lines.push('【待审核文件】');
    lines.push(`📋 ${result.pending_review} 个文件待人工审核`);
    for (const item of result.queue) {
      if (item.status === 'pending_review') {
        lines.push(`  - ${item.file}`);
      }
    }
    lines.push('💡 使用 /intel-distill --review list 查看详情');
  }

  return lines.join('\n');
}

/**
 * CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  let rootDir = '.';
  let outputFormat: 'json' | 'text' = 'json';

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && i + 1 < args.length) {
      rootDir = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputFormat = args[i + 1] as 'json' | 'text';
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Usage: pnpm exec tsx scan-queue.ts --root <dir> [--output json|text]

Scan converted files and build processing queue for intel-distill.

Options:
  --root <dir>     Project root directory (default: current directory)
  --output <fmt>   Output format: json or text (default: json)
  --help           Show this help message

Note: pending.json path is automatically derived from root directory
      ({root}/.intel/pending.json)

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

  const result = scanAndBuildQueue(rootDir);

  if (outputFormat === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatAsText(result));
  }
}

// Run if called directly
if (process.argv[1]?.endsWith('scan-queue.ts') || process.argv[1]?.endsWith('scan-queue.js')) {
  try {
    main();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Fatal error: ${errMsg}`);
    process.exit(1);
  }
}

export {
  scanAndBuildQueue,
  RECOMMENDED_SCRIPT_THRESHOLD,
};