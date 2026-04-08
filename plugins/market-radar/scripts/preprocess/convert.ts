/**
 * Format conversion module
 *
 * Converts PDF and DOCX files to Markdown, reads MD/TXT directly
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { SupportedFormat, ConverterFn } from './types';

// Cache for PyMuPDF availability check
let _pyMuPdfAvailable: boolean | undefined;

/**
 * Check if a dependency is available (using --version or -v)
 */
export function isDependencyAvailable(name: string, versionFlag: string = '--version'): boolean {
  try {
    const result = spawnSync(name, [versionFlag], {
      encoding: 'utf-8',
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return result.status === 0;
  } catch (error) {
    console.warn(`Dependency check failed for ${name}:`, error);
    return false;
  }
}

/**
 * Check if pdftotext is available (uses -v instead of --version)
 */
export function isPdfToTextAvailable(): boolean {
  try {
    // pdftotext uses -v for version, not --version
    const result = spawnSync('pdftotext', ['-v'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    // pdftotext returns 1 for -v (it shows version but also an error about missing file)
    // So we check if the command runs at all, not the exit code
    return result.error === undefined;
  } catch (error) {
    console.warn('pdftotext check failed:', error);
    return false;
  }
}

/**
 * Check if PyMuPDF (fitz) is available for PDF conversion
 * Note: Only caches successful checks; failures are re-checked on next call
 */
export function isPyMuPdfAvailable(): boolean {
  // Return cached success result
  if (_pyMuPdfAvailable === true) {
    return true;
  }
  try {
    const result = spawnSync('uv', ['run', '--with', 'PyMuPDF', 'python3', '-c', 'import fitz; print(fitz.__version__)'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'ignore', 'ignore'],
      timeout: 30000, // 30 seconds timeout
    });
    // Only cache successful checks, let failures be re-checked
    if (result.status === 0) {
      _pyMuPdfAvailable = true;
      return true;
    }
    return false;
  } catch (error) {
    console.warn('PyMuPDF check failed:', error);
    // Don't cache failures - transient issues may resolve
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
 * Get PDF converter preference
 * Priority: PyMuPDF (better structure) > pdftotext (lighter)
 */
export function getAvailablePdfConverter(): 'pymupdf' | 'pdftotext' | null {
  if (isPyMuPdfAvailable()) {
    return 'pymupdf';
  }
  if (isPdfToTextAvailable()) {
    return 'pdftotext';
  }
  return null;
}

/**
 * Convert PDF to Markdown using pdftotext
 */
async function convertPdfWithPdftotext(filePath: string): Promise<string> {
  const result = execFileSync(
    'pdftotext',
    [filePath, '-', '-layout'],
    { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 } // 50MB buffer
  );
  return result;
}

/**
 * Convert PDF to Markdown using PyMuPDF (better structure)
 */
async function convertPdfWithPyMuPdf(filePath: string): Promise<string> {
  const script = `
import fitz
import sys

doc = fitz.open(sys.argv[1])
text_parts = []

for page_num, page in enumerate(doc):
    # Extract text with better formatting
    text = page.get_text("text")
    if text.strip():
        text_parts.append(f"--- Page {page_num + 1} ---\\n")
        text_parts.append(text)
        text_parts.append("\\n")

doc.close()
print("".join(text_parts))
`;

  const result = execFileSync(
    'uv',
    ['run', '--with', 'PyMuPDF', 'python3', '-c', script, filePath],
    { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout: 120000 } // 50MB buffer, 2min timeout
  );
  return result;
}

/**
 * Convert PDF to Markdown (auto-select best available tool)
 */
async function convertPdf(filePath: string): Promise<string> {
  const converter = getAvailablePdfConverter();

  if (converter === 'pymupdf') {
    return convertPdfWithPyMuPdf(filePath);
  }

  if (converter === 'pdftotext') {
    return convertPdfWithPdftotext(filePath);
  }

  throw new Error('No PDF converter available. Ensure:\n' +
    '  - PyMuPDF: auto-installed via "uv run --with PyMuPDF" (recommended)\n' +
    '  - pdftotext: brew install poppler (macOS) or apt-get install poppler-utils (Linux)');
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
      return {
        requiresDependency: true,
        dependencyName: 'PyMuPDF (recommended) or pdftotext (poppler)'
      };
    case '.md':
    case '.txt':
    default:
      return { requiresDependency: false };
  }
}
