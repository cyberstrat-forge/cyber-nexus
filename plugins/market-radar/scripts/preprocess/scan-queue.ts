#!/usr/bin/env tsx
/**
 * Scan converted files and build processing queue
 *
 * Scans converted directory for markdown files, calculates content hashes,
 * and compares with state.json to determine which files need processing.
 *
 * Usage:
 *   pnpm exec tsx scan-queue.ts --source <dir> [--state <file>] [--output json|text]
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

// Threshold for recommending script usage
const RECOMMENDED_SCRIPT_THRESHOLD = 50;

/**
 * Status of a file in the processing queue
 */
export type QueueItemStatus =
  | 'already_processed'  // Content hash matches, no changes
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
  intelligence_count?: number;  // For already_processed items
  intelligence_ids?: string[];  // For already_processed items
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
 * Processed entry in state file (object value format)
 */
interface ProcessedEntry {
  intelligence_count?: number;
  intelligence_ids?: string[];
  review_status?: string | null;
  content_hash?: string;
  source_hash?: string;
}

/**
 * State file structure (simplified for reading)
 * Supports both v2.0 (object) and legacy (array) formats
 */
interface StateFile {
  version: string;
  processed?: Record<string, ProcessedEntry> | ProcessedEntry[];
  review?: {
    pending?: Array<{
      pending_id: string;
      converted_file: string;
    }>;
  };
}

/**
 * Load state file
 */
function loadState(statePath: string): StateFile | null {
  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errorCode = (error as NodeJS.ErrnoException).code;

    if (errorCode === 'ENOENT') {
      // File was deleted between exists check and read
      console.warn(`Warning: State file disappeared: ${statePath}`);
    } else if (errorCode === 'EACCES') {
      console.error(`Error: Permission denied reading state file: ${statePath}`);
    } else if (error instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in state file: ${statePath} - ${errMsg}`);
    } else {
      console.error(`Warning: Failed to read state file: ${statePath} - ${errMsg}`);
    }
    return null;
  }
}

/**
 * Get state file path
 */
function getStatePath(sourceDir: string): string {
  return path.join(sourceDir, '.intel', 'state.json');
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
  statePath?: string
): ScanQueueResult {
  // Resolve paths
  const resolvedSourceDir = path.resolve(sourceDir);
  const resolvedStatePath = statePath || getStatePath(resolvedSourceDir);

  // Load state
  const state = loadState(resolvedStatePath);

  // Build lookup maps from state
  const processedMap = new Map<string, {
    intelligence_count?: number;
    intelligence_ids?: string[];
    review_status?: string | null;
  }>();

  if (state && state.processed) {
    if (Array.isArray(state.processed)) {
      // Legacy array format
      for (const item of state.processed) {
        processedMap.set((item as ProcessedEntry & { source_file: string }).source_file, {
          intelligence_count: item.intelligence_count,
          intelligence_ids: item.intelligence_ids,
          review_status: item.review_status,
        });
      }
    } else {
      // v2.0 object format
      for (const [filePath, entry] of Object.entries(state.processed)) {
        processedMap.set(filePath, {
          intelligence_count: entry.intelligence_count,
          intelligence_ids: entry.intelligence_ids,
          review_status: entry.review_status,
        });
      }
    }
  }

  // Build pending review set
  const pendingReviewSet = new Set<string>();
  if (state?.review?.pending && Array.isArray(state.review.pending)) {
    for (const item of state.review.pending) {
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
  let readErrors = 0;

  for (const relativePath of relativeFiles) {
    const filePath = path.join(resolvedSourceDir, relativePath);

    // Read file content with error handling
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Cannot read file ${relativePath}: ${errMsg}`);
      readErrors++;
      continue; // Skip files that can't be read
    }

    // Calculate content hash
    const contentHash = createHash('md5').update(content).digest('hex');

    // Parse frontmatter for metadata
    const frontmatter = parseFrontmatter(content);
    const sourceHash = frontmatter?.sourceHash;
    const archivedSource = frontmatter?.archivedSource;

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

    // Check against state
    const processedInfo = processedMap.get(relativePath);

    if (!processedInfo) {
      // New file, needs processing
      queue.push({
        file: relativePath,
        content_hash: contentHash,
        source_hash: sourceHash,
        archived_source: archivedSource,
        status: 'needs_processing',
      });
      needsProcessing++;
    } else {
      // Already processed - include in queue for reference
      queue.push({
        file: relativePath,
        content_hash: contentHash,
        source_hash: sourceHash,
        archived_source: archivedSource,
        status: 'already_processed',
        intelligence_count: processedInfo.intelligence_count,
        intelligence_ids: processedInfo.intelligence_ids,
      });
      alreadyProcessed++;
    }
  }

  // Log summary of read errors
  if (readErrors > 0) {
    console.warn(`Warning: ${readErrors} file(s) could not be read and were skipped`);
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
function main() {
  const args = process.argv.slice(2);
  let sourceDir = '.';
  let statePath: string | undefined;
  let outputFormat: 'json' | 'text' = 'json';

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      sourceDir = args[i + 1];
      i++;
    } else if (args[i] === '--state' && args[i + 1]) {
      statePath = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFormat = args[i + 1] as 'json' | 'text';
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Usage: pnpm exec tsx scan-queue.ts --source <dir> [--state <file>] [--output json|text]

Scan converted files and build processing queue for intel-distill.

Options:
  --source <dir>   Source directory (default: current directory)
  --state <file>   Path to state.json (default: .intel/state.json)
  --output <fmt>   Output format: json or text (default: json)
  --help           Show this help message

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

  // Run scan
  const result = scanAndBuildQueue(sourceDir, statePath);

  // Output result
  if (outputFormat === 'text') {
    console.log(formatAsText(result));
  } else {
    console.log(JSON.stringify(result, null, 2));
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