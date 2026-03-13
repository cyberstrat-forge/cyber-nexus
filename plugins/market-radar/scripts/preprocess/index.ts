#!/usr/bin/env npx tsx
/**
 * Preprocessing entry point (v2.0)
 *
 * Supports inbox/archive/converted directory structure:
 * - inbox/ - User drops new files here
 * - archive/YYYY/MM/ - Archived source files with .meta metadata
 * - converted/YYYY/MM/ - Converted markdown files
 *
 * Usage:
 *   npx tsx index.ts --source <dir> [--force]
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  PreprocessResult,
  ArchiveMeta,
  PreprocessOptions,
  BatchResult,
  SupportedFormat,
  PreprocessErrorCode,
} from './types';
import { convertToMarkdown, isSupportedFormat, isPandocAvailable, getAvailablePdfConverter, isPdfToTextAvailable, isPyMuPdfAvailable } from './convert';
import { cleanMarkdown } from './clean';
import { calculateStats } from './cleaners/types';
import { calculateHash } from '../utils/hash';

// Current preprocessor version - increment when cleaning rules change
const PREPROCESSOR_VERSION = '2.0.0';

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Get archive directory path based on date
 */
function getArchiveDir(sourceDir: string, dateRef: Date): string {
  const year = dateRef.getFullYear();
  const month = String(dateRef.getMonth() + 1).padStart(2, '0');
  return path.join(sourceDir, 'archive', String(year), month);
}

/**
 * Get converted directory path based on date
 */
function getConvertedDir(sourceDir: string, dateRef: Date): string {
  const year = dateRef.getFullYear();
  const month = String(dateRef.getMonth() + 1).padStart(2, '0');
  return path.join(sourceDir, 'converted', String(year), month);
}

/**
 * Get archive metadata file path
 */
function getArchiveMetaPath(archivePath: string): string {
  return `${archivePath}.meta`;
}

/**
 * Load existing archive metadata
 */
function loadArchiveMeta(metaPath: string): ArchiveMeta | null {
  if (!fs.existsSync(metaPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Save archive metadata
 */
function saveArchiveMeta(metaPath: string, meta: ArchiveMeta): void {
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

/**
 * Collect known source hashes from all archive metadata files
 */
function collectKnownHashes(sourceDir: string): Map<string, string> {
  const knownHashes = new Map<string, string>(); // hash -> archive path
  const archiveBase = path.join(sourceDir, 'archive');

  if (!fs.existsSync(archiveBase)) {
    return knownHashes;
  }

  // Walk through archive/YYYY/MM/ directories
  const years = fs.readdirSync(archiveBase, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^\d{4}$/.test(e.name))
    .map(e => e.name);

  for (const year of years) {
    const months = fs.readdirSync(path.join(archiveBase, year), { withFileTypes: true })
      .filter(e => e.isDirectory() && /^\d{2}$/.test(e.name))
      .map(e => e.name);

    for (const month of months) {
      const monthDir = path.join(archiveBase, year, month);
      const files = fs.readdirSync(monthDir, { withFileTypes: true })
        .filter(e => e.isFile() && e.name.endsWith('.meta'))
        .map(e => e.name);

      for (const metaFile of files) {
        const metaPath = path.join(monthDir, metaFile);
        const meta = loadArchiveMeta(metaPath);
        if (meta && meta.sourceHash) {
          knownHashes.set(meta.sourceHash, metaPath);
        }
      }
    }
  }

  return knownHashes;
}

/**
 * Scan directory for files to process
 * Priority: inbox/ first, then root directory (excluding special dirs)
 */
function scanDirectory(sourceDir: string): string[] {
  const files: string[] = [];
  const excludeDirs = new Set(['inbox', 'archive', 'converted', 'intelligence', '.intel']);

  function scan(dir: string, isRoot: boolean = false) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip hidden directories and special directories
      if (entry.name.startsWith('.') || excludeDirs.has(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && isSupportedFormat(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  // Priority 1: Scan inbox/ directory
  const inboxDir = path.join(sourceDir, 'inbox');
  if (fs.existsSync(inboxDir)) {
    const inboxEntries = fs.readdirSync(inboxDir, { withFileTypes: true });
    for (const entry of inboxEntries) {
      const fullPath = path.join(inboxDir, entry.name);
      if (entry.isFile() && isSupportedFormat(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  // Priority 2: Scan root directory (for backward compatibility)
  scan(sourceDir, true);

  return files;
}

/**
 * Get archive paths for a source file
 */
function getArchivePaths(
  sourcePath: string,
  archiveDir: string
): { archivePath: string; metaPath: string } {
  const filename = path.basename(sourcePath);
  const archivePath = path.join(archiveDir, filename);
  const metaPath = getArchiveMetaPath(archivePath);
  return { archivePath, metaPath };
}

/**
 * Check if file is duplicate based on existing archive metadata
 */
function checkDuplicate(
  metaPath: string,
  sourceHash: string
): boolean {
  const existingMeta = loadArchiveMeta(metaPath);
  return existingMeta !== null && existingMeta.sourceHash === sourceHash;
}

/**
 * Move source file to archive (only called after successful conversion)
 */
function archiveSourceFile(
  sourcePath: string,
  archiveDir: string,
  archivePath: string,
  metaPath: string,
  sourceHash: string,
  convertedPath: string,
  sourceDir: string
): void {
  // Ensure archive directory exists
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  // Move file to archive (not copy)
  if (archivePath !== sourcePath) {
    // Check if source file still exists (might have been moved already)
    if (fs.existsSync(sourcePath)) {
      // Use rename to move the file
      fs.renameSync(sourcePath, archivePath);
    }
  }

  // Save metadata
  const now = new Date().toISOString();
  const relativeSourcePath = path.relative(sourceDir, sourcePath);
  const relativeConvertedPath = path.relative(sourceDir, convertedPath);

  const meta: ArchiveMeta = {
    sourceHash,
    originalPath: relativeSourcePath,
    archivedAt: now,
    fileSize: fs.statSync(archivePath).size,
    mimeType: getMimeType(sourcePath),
    conversionInfo: {
      convertedPath: relativeConvertedPath,
      convertedAt: now,
      conversionSuccess: true,
    },
  };

  saveArchiveMeta(metaPath, meta);
}

/**
 * Process a single file
 */
async function processFile(
  sourcePath: string,
  archiveDir: string,
  convertedDir: string,
  sourceDir: string,
  currentVersion: string,
  knownHashes: Map<string, string>,
  dateRef: Date
): Promise<PreprocessResult> {
  // Calculate source hash for deduplication
  const sourceHash = calculateHash(sourcePath);

  // Get archive paths
  const { archivePath, metaPath } = getArchivePaths(sourcePath, archiveDir);

  // Check for duplicate based on existing archive
  if (checkDuplicate(metaPath, sourceHash)) {
    return {
      success: true,
      isDuplicate: true,
      archivedPath: archivePath,
    };
  }

  // Check for duplicate in known hashes (from current batch)
  if (knownHashes.has(sourceHash)) {
    return {
      success: true,
      isDuplicate: true,
      archivedPath: knownHashes.get(sourceHash),
    };
  }

  // Phase 1: Conversion (before archiving)
  let rawContent: string;
  try {
    rawContent = await convertToMarkdown(sourcePath);
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

  // Phase 2: Cleaning
  let cleanResult: { content: string; source: string; appliedRules: string[]; stats: { originalSize: number; cleanedSize: number; compressionRate: number } };
  try {
    cleanResult = await cleanMarkdown(rawContent, sourcePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: { code: 'CLEAN_FAILED', message },
    };
  }

  const cleanedContent = cleanResult.content;

  // Phase 3: Write converted file
  const filename = path.basename(sourcePath, path.extname(sourcePath));
  const convertedPath = path.join(convertedDir, `${filename}.md`);

  try {
    // Ensure converted directory exists
    if (!fs.existsSync(convertedDir)) {
      fs.mkdirSync(convertedDir, { recursive: true });
    }

    // Write converted file
    fs.writeFileSync(convertedPath, cleanedContent, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: { code: 'ARCHIVE_FAILED', message: `Failed to write converted file: ${message}` },
    };
  }

  // Phase 4: Archive source file (only after successful conversion)
  archiveSourceFile(
    sourcePath,
    archiveDir,
    archivePath,
    metaPath,
    sourceHash,
    convertedPath,
    sourceDir
  );

  return {
    success: true,
    markdown: cleanedContent,
    stats: cleanResult.stats,
    archivedPath: archivePath,
    convertedPath,
    isDuplicate: false,
  };
}

/**
 * Batch process all files in source directory
 */
async function batchProcess(options: PreprocessOptions): Promise<BatchResult> {
  const {
    sourceDir,
    archiveDir,
    convertedDir,
    preprocessorVersion,
    force = false,
    dateRef = new Date(),
  } = options;

  // Collect known hashes for deduplication
  const knownHashes = force ? new Map<string, string>() : collectKnownHashes(sourceDir);

  // Scan for files
  const files = scanDirectory(sourceDir);
  const results = new Map<string, PreprocessResult>();
  let processed = 0;
  let skipped = 0;
  let duplicates = 0;
  let failed = 0;

  for (const sourcePath of files) {
    const sourceHash = calculateHash(sourcePath);

    // Check if already processed (unless force)
    if (!force && knownHashes.has(sourceHash)) {
      duplicates++;
      results.set(sourcePath, {
        success: true,
        isDuplicate: true,
        archivedPath: knownHashes.get(sourceHash),
      });
      continue;
    }

    // Process file
    const result = await processFile(
      sourcePath,
      archiveDir,
      convertedDir,
      sourceDir,
      preprocessorVersion,
      knownHashes,
      dateRef
    );

    results.set(sourcePath, result);

    if (result.isDuplicate) {
      duplicates++;
    } else if (result.success) {
      processed++;
      // Add to known hashes to avoid re-processing in same batch
      knownHashes.set(sourceHash, result.archivedPath || '');
    } else {
      failed++;
      console.error(`Failed: ${sourcePath} - ${result.error?.message}`);
    }
  }

  return {
    total: files.length,
    processed,
    skipped,
    duplicates,
    failed,
    results,
    archiveDir,
    convertedDir,
  };
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  let sourceDir = '.';
  let force = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      sourceDir = args[i + 1];
      i++;
    } else if (args[i] === '--force') {
      force = true;
    } else if (args[i] === '--help') {
      console.log(`
Usage: npx tsx index.ts --source <dir> [--force]

Directory Structure (v2.0):
  {source_dir}/
  ├── inbox/              # Drop new files here (recommended)
  ├── archive/YYYY/MM/    # Archived source files with .meta
  └── converted/YYYY/MM/  # Converted markdown files

Options:
  --source <dir>  Source directory (default: current directory)
  --force         Force reprocess all files
  --help          Show this help message
      `);
      process.exit(0);
    }
  }

  // Resolve paths
  sourceDir = path.resolve(sourceDir);
  const dateRef = new Date();
  const archiveDir = getArchiveDir(sourceDir, dateRef);
  const convertedDir = getConvertedDir(sourceDir, dateRef);

  console.log(`Source: ${sourceDir}`);
  console.log(`Archive: ${archiveDir}`);
  console.log(`Converted: ${convertedDir}`);
  console.log(`Version: ${PREPROCESSOR_VERSION}`);
  console.log('');

  // Check inbox directory
  const inboxDir = path.join(sourceDir, 'inbox');
  if (!fs.existsSync(inboxDir)) {
    console.log('💡 Tip: Create an inbox/ directory for better file management:');
    console.log('   mkdir -p inbox');
    console.log('   Then drop files into inbox/ for processing.');
    console.log('');
  }

  // Check optional dependencies
  if (!isPandocAvailable()) {
    console.log('Note: pandoc not available. DOCX files will be skipped.');
    console.log('Install pandoc to process DOCX files:');
    console.log('  macOS: brew install pandoc');
    console.log('  Linux: sudo apt-get install pandoc');
    console.log('');
  }

  const pdfConverter = getAvailablePdfConverter();
  if (!pdfConverter) {
    console.log('Note: No PDF converter available. PDF files will be skipped.');
    console.log('Install one of the following to process PDF files:');
    console.log('  PyMuPDF (recommended, better structure): pip install PyMuPDF');
    console.log('  pdftotext (lighter): brew install poppler (macOS) or apt-get install poppler-utils (Linux)');
    console.log('');
  } else if (pdfConverter === 'pymupdf') {
    console.log('PDF converter: PyMuPDF (recommended)');
    console.log('');
  } else {
    console.log('PDF converter: pdftotext (consider installing PyMuPDF for better structure)');
    console.log('  Install: pip install PyMuPDF');
    console.log('');
  }

  // Run batch processing
  const result = await batchProcess({
    sourceDir,
    archiveDir,
    convertedDir,
    preprocessorVersion: PREPROCESSOR_VERSION,
    force,
    dateRef,
  });

  // Print summary
  console.log('---');
  console.log(`Total files: ${result.total}`);
  console.log(`Processed: ${result.processed}`);
  console.log(`Duplicates: ${result.duplicates}`);
  console.log(`Failed: ${result.failed}`);

  // Output JSON for integration
  const output = {
    sourceDir,
    archiveDir: result.archiveDir,
    convertedDir: result.convertedDir,
    preprocessorVersion: PREPROCESSOR_VERSION,
    stats: {
      total: result.total,
      processed: result.processed,
      duplicates: result.duplicates,
      failed: result.failed,
    },
    files: Array.from(result.results.entries()).map(([filePath, res]) => ({
      sourcePath: filePath,
      success: res.success,
      isDuplicate: res.isDuplicate,
      archivedPath: res.archivedPath,
      convertedPath: res.convertedPath,
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
  getArchiveDir,
  getConvertedDir,
  collectKnownHashes,
  PREPROCESSOR_VERSION,
};