#!/usr/bin/env npx tsx
/**
 * Preprocessing entry point
 *
 * Scans source directory, processes files, outputs clean Markdown
 *
 * Usage:
 *   npx tsx index.ts --source <dir> [--output <dir>] [--force]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  PreprocessResult,
  PreprocessMeta,
  PreprocessOptions,
  BatchResult,
  SupportedFormat,
  PreprocessErrorCode,
} from './types';
import { convertToMarkdown, isSupportedFormat, isPandocAvailable, isPdfToTextAvailable } from './convert';
import { cleanMarkdown } from './clean';
import { calculateStats } from './cleaners/types';

// Current preprocessor version - increment when cleaning rules change
const PREPROCESSOR_VERSION = '1.0.0';

/**
 * Calculate MD5 hash of file content
 */
function calculateHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Get metadata file path for a source file
 * Uses relative path to preserve directory structure and avoid name collisions
 */
function getMetaPath(metaDir: string, sourceRelPath: string): string {
  // Convert path separators to underscores for flat storage
  const safePath = sourceRelPath.replace(/\//g, '_').replace(/\\/g, '_');
  return path.join(metaDir, `${safePath}.json`);
}

/**
 * Get converted file path for a source file
 * Preserves directory structure to avoid name collisions
 */
function getConvertedPath(convertedDir: string, sourceRelPath: string): string {
  // Remove extension and add .md
  const ext = path.extname(sourceRelPath);
  const baseName = sourceRelPath.slice(0, -ext.length);
  return path.join(convertedDir, `${baseName}.md`);
}

/**
 * Check if file needs preprocessing
 */
function needsPreprocessing(
  sourcePath: string,
  metaPath: string,
  currentVersion: string
): boolean {
  if (!fs.existsSync(metaPath)) {
    return true; // No metadata = not processed
  }

  try {
    const meta: PreprocessMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const currentHash = calculateHash(sourcePath);

    // Reprocess if source changed or version updated
    return meta.sourceHash !== currentHash || meta.preprocessorVersion !== currentVersion;
  } catch {
    return true; // Invalid metadata = reprocess
  }
}

/**
 * Process a single file
 */
async function processFile(
  sourcePath: string,
  convertedPath: string,
  metaPath: string,
  currentVersion: string
): Promise<PreprocessResult> {
  try {
    // Read and convert
    const rawContent = await convertToMarkdown(sourcePath);

    // Clean with source-aware rules
    const cleanResult = await cleanMarkdown(rawContent, sourcePath);
    const cleanedContent = cleanResult.content;

    // Ensure output directory exists
    const outputDir = path.dirname(convertedPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write converted file
    fs.writeFileSync(convertedPath, cleanedContent, 'utf-8');

    // Write metadata
    const sourceRelPath = path.relative(sourceDir, sourcePath);
    const meta: PreprocessMeta = {
      sourcePath: sourceRelPath,
      sourceHash: calculateHash(sourcePath),
      preprocessorVersion: currentVersion,
      processedAt: new Date().toISOString(),
      detectedSource: cleanResult.source,
      appliedRules: cleanResult.appliedRules,
      stats: cleanResult.stats,
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    return {
      success: true,
      markdown: cleanedContent,
      stats: cleanResult.stats,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let code: PreprocessErrorCode = 'CONVERSION_FAILED';

    if (message.includes('not found') || message.includes('not installed')) {
      code = 'DEPENDENCY_MISSING';
    } else if (message.includes('Cannot read') || message.includes('ENOENT')) {
      code = 'READ_FAILED';
    }

    return {
      success: false,
      error: { code, message },
    };
  }
}

/**
 * Scan directory for supported files
 */
function scanDirectory(sourceDir: string): string[] {
  const files: string[] = [];

  function scan(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip converted directory and hidden directories
      if (entry.name === 'converted' || entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && isSupportedFormat(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  scan(sourceDir);
  return files;
}

/**
 * Batch process all files in source directory
 */
async function batchProcess(options: PreprocessOptions): Promise<BatchResult> {
  const {
    sourceDir,
    convertedDir,
    metaDir,
    preprocessorVersion,
    force = false,
  } = options;

  // Ensure output directories exist
  if (!fs.existsSync(convertedDir)) {
    fs.mkdirSync(convertedDir, { recursive: true });
  }
  if (!fs.existsSync(metaDir)) {
    fs.mkdirSync(metaDir, { recursive: true });
  }

  // Scan for files
  const files = scanDirectory(sourceDir);
  const results = new Map<string, PreprocessResult>();
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const sourcePath of files) {
    // Calculate relative path from sourceDir for unique identification
    const sourceRelPath = path.relative(sourceDir, sourcePath);
    const convertedPath = getConvertedPath(convertedDir, sourceRelPath);
    const metaPath = getMetaPath(metaDir, sourceRelPath);

    // Check if processing needed
    if (!force && !needsPreprocessing(sourcePath, metaPath, preprocessorVersion)) {
      skipped++;
      results.set(sourcePath, { success: true });
      continue;
    }

    // Process file
    const result = await processFile(
      sourcePath,
      convertedPath,
      metaPath,
      preprocessorVersion
    );
    results.set(sourcePath, result);

    if (result.success) {
      processed++;
    } else {
      failed++;
      console.error(`Failed: ${sourcePath} - ${result.error?.message}`);
    }
  }

  return {
    total: files.length,
    processed,
    skipped,
    failed,
    results,
  };
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  let sourceDir = '.';
  let outputDir: string | undefined;
  let force = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      sourceDir = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputDir = args[i + 1];
      i++;
    } else if (args[i] === '--force') {
      force = true;
    } else if (args[i] === '--help') {
      console.log(`
Usage: npx tsx index.ts --source <dir> [--output <dir>] [--force]

Options:
  --source <dir>  Source directory containing documents (default: current directory)
  --output <dir>  Output directory for converted files (default: {source}/converted)
  --force         Force reprocess all files
  --help          Show this help message
      `);
      process.exit(0);
    }
  }

  // Resolve paths
  sourceDir = path.resolve(sourceDir);
  const convertedDir = outputDir
    ? path.resolve(outputDir)
    : path.join(sourceDir, 'converted');
  const metaDir = path.join(convertedDir, '.meta');

  console.log(`Source: ${sourceDir}`);
  console.log(`Output: ${convertedDir}`);
  console.log(`Version: ${PREPROCESSOR_VERSION}`);
  console.log('');

  // Check optional dependencies
  if (!isPandocAvailable()) {
    console.log('Note: pandoc not available. DOCX files will be skipped.');
    console.log('Install pandoc to process DOCX files:');
    console.log('  macOS: brew install pandoc');
    console.log('  Linux: sudo apt-get install pandoc');
    console.log('');
  }

  if (!isPdfToTextAvailable()) {
    console.log('Note: pdftotext not available. PDF files will be skipped.');
    console.log('Install poppler to process PDF files:');
    console.log('  macOS: brew install poppler');
    console.log('  Linux: sudo apt-get install poppler-utils');
    console.log('');
  }

  // Run batch processing
  const result = await batchProcess({
    sourceDir,
    convertedDir,
    metaDir,
    preprocessorVersion: PREPROCESSOR_VERSION,
    force,
  });

  // Print summary
  console.log('---');
  console.log(`Total files: ${result.total}`);
  console.log(`Processed: ${result.processed}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Failed: ${result.failed}`);

  // Output JSON for integration
  const output = {
    sourceDir,
    convertedDir,
    metaDir,
    preprocessorVersion: PREPROCESSOR_VERSION,
    stats: {
      total: result.total,
      processed: result.processed,
      skipped: result.skipped,
      failed: result.failed,
    },
    files: Array.from(result.results.entries()).map(([path, res]) => ({
      sourcePath: path,
      success: res.success,
      error: res.error,
      stats: res.stats,
    })),
  };

  console.log('\n--- JSON OUTPUT ---');
  console.log(JSON.stringify(output, null, 2));

  // Exit with error code if any failures
  process.exit(result.failed > 0 ? 1 : 0);
}

// Run if called directly as main module
if (process.argv[1]?.endsWith('preprocess/index.ts') || process.argv[1]?.endsWith('preprocess/index.js')) {
  main().catch(console.error);
}

export {
  batchProcess,
  processFile,
  needsPreprocessing,
  calculateHash,
  PREPROCESSOR_VERSION,
};
