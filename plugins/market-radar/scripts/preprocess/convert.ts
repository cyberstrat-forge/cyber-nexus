/**
 * Format conversion module
 *
 * Converts PDF and DOCX files to Markdown, reads MD/TXT directly
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { SupportedFormat, ConverterFn } from './types';

/**
 * Check if a dependency is available
 */
export function isDependencyAvailable(name: string): boolean {
  try {
    const result = spawnSync(name, ['--version'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Check if pandoc is available for DOCX conversion
 */
export function isPandocAvailable(): boolean {
  return isDependencyAvailable('pandoc');
}

/**
 * Check if pdftotext is available for PDF conversion
 */
export function isPdfToTextAvailable(): boolean {
  return isDependencyAvailable('pdftotext');
}

/**
 * Convert PDF to Markdown using pdftotext
 */
async function convertPdf(filePath: string): Promise<string> {
  if (!isPdfToTextAvailable()) {
    throw new Error('pdftotext is not installed. Install it to process PDF files:\n  macOS: brew install poppler\n  Linux: sudo apt-get install poppler-utils');
  }

  const result = execFileSync(
    'pdftotext',
    [filePath, '-', '-layout'],
    { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 } // 50MB buffer
  );
  return result;
}

/**
 * Convert DOCX to Markdown using pandoc
 */
async function convertDocx(filePath: string): Promise<string> {
  if (!isPandocAvailable()) {
    throw new Error('pandoc is not installed. Install it to process DOCX files:\n  macOS: brew install pandoc\n  Linux: sudo apt-get install pandoc');
  }

  const result = execFileSync(
    'pandoc',
    [filePath, '-t', 'markdown', '--wrap=none'],
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
  );
  return result;
}

/**
 * Read Markdown file directly
 */
async function readMarkdown(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Read text file directly
 */
async function readText(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Converter mapping for each format
 */
const converters: Record<SupportedFormat, ConverterFn> = {
  '.md': readMarkdown,
  '.txt': readText,
  '.pdf': convertPdf,
  '.docx': convertDocx,
};

/**
 * Get file extension as SupportedFormat
 */
export function getFileFormat(filePath: string): SupportedFormat | null {
  const ext = path.extname(filePath).toLowerCase() as SupportedFormat;
  return converters[ext] ? ext : null;
}

/**
 * Check if file format is supported
 */
export function isSupportedFormat(filePath: string): boolean {
  return getFileFormat(filePath) !== null;
}

/**
 * Convert a file to Markdown
 */
export async function convertToMarkdown(filePath: string): Promise<string> {
  const format = getFileFormat(filePath);

  if (!format) {
    throw new Error(`Unsupported file format: ${path.extname(filePath)}`);
  }

  const converter = converters[format];
  return converter(filePath);
}

/**
 * Get converter info for error messages
 */
export function getConverterInfo(format: SupportedFormat): {
  requiresDependency: boolean;
  dependencyName?: string;
} {
  switch (format) {
    case '.docx':
      return { requiresDependency: true, dependencyName: 'pandoc' };
    case '.pdf':
      return { requiresDependency: true, dependencyName: 'pdftotext (poppler)' };
    case '.md':
    case '.txt':
    default:
      return { requiresDependency: false };
  }
}
