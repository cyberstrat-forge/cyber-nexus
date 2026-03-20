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

// ==================== Helper Functions ====================

/**
 * Generate filename from PulseContent
 *
 * Format: {YYYYMMDD}-{content_id后8位}.md
 * Example: 20260319-a1b2c3d4.md
 *
 * @param content - PulseContent item
 * @returns Generated filename
 */
export function generateFilename(content: PulseContent): string {
  // Extract YYYYMMDD from first_seen_at (ISO 8601 format: 2026-03-19T14:30:52Z)
  const dateMatch = content.first_seen_at.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) {
    throw new Error(`Invalid first_seen_at format: ${content.first_seen_at}`);
  }
  const dateStr = `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}`;

  // Extract last 8 characters from content_id (format: cnt_YYYYMMDDHHMMSS_xxxxxxxx)
  const idParts = content.content_id.split('_');
  if (idParts.length < 3) {
    throw new Error(`Invalid content_id format: ${content.content_id}`);
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
  const lines = [
    '---',
    `content_id: "${content.content_id}"`,
    `canonical_hash: "${content.canonical_hash}"`,
    `first_seen_at: "${content.first_seen_at}"`,
    `last_seen_at: "${content.last_seen_at}"`,
    `source_count: ${content.source_count}`,
    `pulse_source: "${sourceName}"`,
    `sourceHash: ""`,
    `archivedSource: ""`,
    `convertedFile: ""`,
    '---',
  ];
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
  const title = content.normalized_title || '(无标题)';
  const body = content.normalized_body || '';

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