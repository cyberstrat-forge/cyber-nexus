#!/usr/bin/env node
/**
 * Pulse output module
 *
 * File output utilities for writing PulseContent to Markdown files
 *
 * Usage:
 *   import { writeContentFile, writeContentFiles } from './output';
 *   const filePath = await writeContentFile(content, './output', 'local');
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { PulseContent } from './types.js';

// ==================== YAML Utilities ====================

/**
 * Escape special characters for YAML double-quoted strings
 *
 * Handles: backslash, double quotes, newlines, tabs
 *
 * @param str - Raw string to escape
 * @returns YAML-safe escaped string
 */
function escapeYamlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')    // Escape backslashes first
    .replace(/"/g, '\\"')       // Escape double quotes
    .replace(/\n/g, '\\n')      // Escape newlines
    .replace(/\r/g, '\\r')      // Escape carriage returns
    .replace(/\t/g, '\\t');     // Escape tabs
}

// ==================== Helper Functions ====================

/**
 * Generate filename from PulseContent
 *
 * Format: {YYYYMMDD}-{content_id}.md
 * Example: 20260319-item_a1b2c3d4.md
 *
 * @param content - PulseContent item
 * @returns Generated filename
 * @throws Error if fetched_at or id format is invalid
 */
export function generateFilename(content: PulseContent): string {
  // Validate fetched_at exists
  if (!content.fetched_at) {
    throw new Error(
      `Missing fetched_at field in content ${content.id || 'unknown'}. ` +
      `Expected ISO 8601 format (e.g., 2026-03-19T14:30:52Z)`
    );
  }

  // Extract YYYYMMDD from fetched_at (ISO 8601 format: 2026-03-19T14:30:52Z)
  // Note: API field is fetched_at, maps to first_seen_at in frontmatter
  const dateMatch = content.fetched_at.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) {
    throw new Error(
      `Invalid fetched_at format for content ${content.id}: "${content.fetched_at}". ` +
      `Expected ISO 8601 format (e.g., 2026-03-19T14:30:52Z)`
    );
  }
  const dateStr = `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}`;

  // Validate id exists
  if (!content.id) {
    throw new Error(
      `Missing id field in content. ` +
      `Expected format: item_{8位hex}`
    );
  }

  // New ID format: item_{8位hex}, use directly
  return `${dateStr}-${content.id}.md`;
}

/**
 * Generate frontmatter YAML string
 *
 * Uses 5-group structured format for better organization:
 * 1. Core identity (required)
 * 2. Content metadata
 * 3. Source info
 * 4. Quality indicators
 * 5. Processing trace (placeholder for preprocess script)
 *
 * @param content - PulseContent item
 * @param sourceName - Source name (unused in new format)
 * @returns YAML frontmatter string
 */
function generateFrontmatter(content: PulseContent, sourceName: string): string {
  const lines: string[] = [
    '---',
    '# ============================================',
    '# 第一组：核心标识（必须填写）',
    '# ============================================',
    `item_id: "${escapeYamlString(content.id)}"`,
    `source_type: "cyber-pulse"`,
    `first_seen_at: "${escapeYamlString(content.fetched_at)}"`,
    '',
    '# ============================================',
    '# 第二组：内容元数据',
    '# ============================================',
    `title: "${escapeYamlString(content.title || '')}"`,
  ];

  if (content.url) {
    lines.push(`url: "${escapeYamlString(content.url)}"`);
  }
  if (content.author) {
    lines.push(`author: "${escapeYamlString(content.author)}"`);
  }
  if (content.tags && content.tags.length > 0) {
    const escapedTags = content.tags.map(t => `"${escapeYamlString(t)}"`).join(', ');
    lines.push(`tags: [${escapedTags}]`);
  }
  if (content.published_at) {
    lines.push(`published_at: "${escapeYamlString(content.published_at)}"`);
  }

  lines.push('');
  lines.push('# ============================================');
  lines.push('# 第三组：来源信息');
  lines.push('# ============================================');

  if (content.source) {
    if (content.source.source_id) {
      lines.push(`source_id: "${escapeYamlString(content.source.source_id)}"`);
    }
    if (content.source.source_name) {
      lines.push(`source_name: "${escapeYamlString(content.source.source_name)}"`);
    }
    if (content.source.source_url) {
      lines.push(`source_url: "${escapeYamlString(content.source.source_url)}"`);
    }
    if (content.source.source_tier) {
      lines.push(`source_tier: "${escapeYamlString(content.source.source_tier)}"`);
    }
    if (content.source.source_score !== undefined) {
      lines.push(`source_score: ${content.source.source_score}`);
    }
  }

  lines.push('');
  lines.push('# ============================================');
  lines.push('# 第四组：质量指标');
  lines.push('# ============================================');

  if (content.completeness_score !== undefined) {
    lines.push(`completeness_score: ${content.completeness_score}`);
  }
  if (content.word_count !== undefined) {
    lines.push(`word_count: ${content.word_count}`);
  }

  lines.push('');
  lines.push('# ============================================');
  lines.push('# 第五组：处理追溯（预处理脚本填充）');
  lines.push('# ============================================');
  lines.push('content_hash: ""');
  lines.push('archived_path: ""');
  lines.push('---');

  return lines.join('\n');
}

/**
 * Generate complete Markdown content
 *
 * @param content - PulseContent item
 * @param sourceName - Source name
 * @returns Complete Markdown content string
 */
function generateMarkdown(content: PulseContent, sourceName: string): string {
  const frontmatter = generateFrontmatter(content, sourceName);
  const title = content.title || '(无标题)';
  const body = content.body || '';

  return `${frontmatter}

# ${title}

${body}
`;
}

// ==================== File Writing Functions ====================

/**
 * Write a single PulseContent to a Markdown file
 *
 * Creates the output directory if it doesn't exist.
 * Overwrites existing files with the same name.
 *
 * @param content - PulseContent item to write
 * @param outputDir - Output directory path
 * @param sourceName - Source name for pulse_source field
 * @returns Absolute path to the written file
 */
export async function writeContentFile(
  content: PulseContent,
  outputDir: string,
  sourceName: string
): Promise<string> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Generate filename and full path
  const filename = generateFilename(content);
  const filePath = path.resolve(outputDir, filename);

  // Generate and write content
  const markdown = generateMarkdown(content, sourceName);
  await fs.writeFile(filePath, markdown, 'utf-8');

  return filePath;
}

/**
 * Write multiple PulseContent items to Markdown files
 *
 * Creates the output directory if it doesn't exist.
 * Processes items sequentially to avoid file system conflicts.
 * Skips files that already exist (deduplication for incremental pulls).
 *
 * @param items - Array of PulseContent items to write
 * @param outputDir - Output directory path
 * @param sourceName - Source name for pulse_source field
 * @returns Array of absolute paths to written files (excludes skipped files)
 */
export async function writeContentFiles(
  items: PulseContent[],
  outputDir: string,
  sourceName: string
): Promise<string[]> {
  const filePaths: string[] = [];
  let skippedCount = 0;

  for (const item of items) {
    const filename = generateFilename(item);
    const filePath = path.resolve(outputDir, filename);

    // Check if file already exists (deduplication)
    try {
      await fs.access(filePath);
      // File exists, skip it
      skippedCount++;
      continue;
    } catch (error) {
      // Only proceed if file doesn't exist (ENOENT)
      // Log unexpected errors for debugging
      if (error instanceof Error && 'code' in error) {
        const nodeError = error as Error & { code: string };
        if (nodeError.code !== 'ENOENT') {
          console.error(`[pulse] 警告: 无法检查文件 ${filePath}: ${nodeError.message} (${nodeError.code})`);
        }
      }
      // File doesn't exist, proceed to write
    }

    const writtenPath = await writeContentFile(item, outputDir, sourceName);
    filePaths.push(writtenPath);
  }

  if (skippedCount > 0) {
    console.log(`[pulse] 跳过 ${skippedCount} 个已存在的文件`);
  }

  return filePaths;
}