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
 * Format: {YYYYMMDD}-{content_id后8位}.md
 * Example: 20260319-a1b2c3d4.md
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
      `Expected format: cnt_YYYYMMDDHHMMSS_xxxxxxxx`
    );
  }

  // Extract last 8 characters from id (format: cnt_YYYYMMDDHHMMSS_xxxxxxxx)
  // Note: API field is id, maps to content_id in frontmatter
  const idParts = content.id.split('_');
  if (idParts.length < 3) {
    throw new Error(
      `Invalid content id format: "${content.id}". ` +
      `Expected format: cnt_YYYYMMDDHHMMSS_xxxxxxxx (3 underscore-separated parts)`
    );
  }
  const idSuffix = idParts[idParts.length - 1]; // Last 8 characters

  return `${dateStr}-${idSuffix}.md`;
}

/**
 * Generate frontmatter YAML string
 *
 * @param content - PulseContent item
 * @param sourceName - Source name for pulse_source field
 * @returns YAML frontmatter string
 */
function generateFrontmatter(content: PulseContent, sourceName: string): string {
  const lines: string[] = [
    '---',
    // Core fields (mapped from API v1.3.0) - use escaped strings
    `content_id: "${escapeYamlString(content.id)}"`,
    `canonical_hash: "${escapeYamlString(content.canonical_hash)}"`,
    `first_seen_at: "${escapeYamlString(content.fetched_at)}"`,
    `pulse_source: "${escapeYamlString(sourceName)}"`,
  ];

  // Optional fields from API v1.3.0 - use escaped strings
  if (content.url) {
    lines.push(`url: "${escapeYamlString(content.url)}"`);
  }
  if (content.author) {
    lines.push(`author: "${escapeYamlString(content.author)}"`);
  }
  if (content.tags && content.tags.length > 0) {
    // Tags array: escape each tag and join
    const escapedTags = content.tags.map(t => `"${escapeYamlString(t)}"`).join(', ');
    lines.push(`tags: [${escapedTags}]`);
  }
  if (content.published_at) {
    lines.push(`published_at: "${escapeYamlString(content.published_at)}"`);
  }
  if (content.quality_score !== undefined) {
    lines.push(`quality_score: ${content.quality_score}`);
  }

  // Source info - validate each nested field before writing
  if (content.source) {
    if (content.source.id) {
      lines.push(`source_id: "${escapeYamlString(content.source.id)}"`);
    }
    if (content.source.name) {
      lines.push(`source_name: "${escapeYamlString(content.source.name)}"`);
    }
    if (content.source.tier) {
      lines.push(`source_tier: "${escapeYamlString(content.source.tier)}"`);
    }
  }

  // Placeholder fields for intel-distill processing
  lines.push(`sourceHash: ""`);
  lines.push(`archivedSource: ""`);
  lines.push(`convertedFile: ""`);
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
  const body = content.content || '';

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
 *
 * @param items - Array of PulseContent items to write
 * @param outputDir - Output directory path
 * @param sourceName - Source name for pulse_source field
 * @returns Array of absolute paths to written files
 */
export async function writeContentFiles(
  items: PulseContent[],
  outputDir: string,
  sourceName: string
): Promise<string[]> {
  const filePaths: string[] = [];

  for (const item of items) {
    const filePath = await writeContentFile(item, outputDir, sourceName);
    filePaths.push(filePath);
  }

  return filePaths;
}