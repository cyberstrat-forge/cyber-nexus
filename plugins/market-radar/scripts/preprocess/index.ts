#!/usr/bin/env tsx
/**
 * Preprocessing entry point (v2.1)
 *
 * Supports inbox/archive/converted directory structure:
 * - inbox/ - User drops new files here
 * - archive/YYYY/MM/ - Archived source files
 * - converted/YYYY/MM/ - Converted markdown files with frontmatter metadata
 *
 * v2.1 Changes:
 * - Metadata is written to converted file frontmatter (not separate .meta file)
 * - Failed conversions generate .error.md in inbox/
 *
 * Usage:
 *   pnpm exec tsx index.ts --source <dir> [--force]
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  PreprocessResult,
  PreprocessOptions,
  BatchResult,
  SupportedFormat,
  PreprocessErrorCode,
} from './types';
import { convertToMarkdown, isSupportedFormat, isPandocAvailable, getAvailablePdfConverter, isPdfToTextAvailable, isPyMuPdfAvailable } from './convert';
import { cleanMarkdown } from './clean';
import { calculateStats } from './cleaners/types';
import { calculateHash } from '../utils/hash';
import { parseFrontmatter } from '../utils/frontmatter';

// Current preprocessor version - increment when cleaning rules change
const PREPROCESSOR_VERSION = '2.1.0';

/**
 * Generate frontmatter for converted file
 */
function generateFrontmatter(
  sourceHash: string,
  originalPath: string,
  archivedAt: string,
  archivedSource: string
): string {
  return `---
sourceHash: "${sourceHash}"
originalPath: "${originalPath}"
archivedAt: "${archivedAt}"
archivedSource: "${archivedSource}"
---

`;
}

/**
 * Generate error log markdown for failed conversions
 */
function generateErrorLog(
  filename: string,
  errorCode: string,
  errorMessage: string,
  timestamp: string
): string {
  const suggestionMap: Record<string, string[]> = {
    CONVERSION_FAILED: [
      '检查文件是否损坏',
      '尝试用其他工具打开文件',
      '如为扫描版 PDF，请使用 OCR 工具处理',
    ],
    DEPENDENCY_MISSING: [
      '安装缺失的依赖工具',
      'macOS: brew install pandoc poppler',
      'Python: pip install PyMuPDF',
    ],
    READ_FAILED: [
      '检查文件是否存在',
      '检查文件权限',
      '确认文件未被其他程序占用',
    ],
    CLEAN_FAILED: [
      '检查文件内容格式',
      '尝试手动查看文件内容',
    ],
    ARCHIVE_FAILED: [
      '检查输出目录权限',
      '确认磁盘空间充足',
      '检查 converted/ 目录是否可写',
    ],
  };

  const suggestions = suggestionMap[errorCode] || ['检查文件状态'];

  return `# 文件转换失败

**文件名**: ${filename}
**处理时间**: ${timestamp}
**错误码**: ${errorCode}

## 错误原因

${errorMessage}

## 建议操作

${suggestions.map(s => `- [ ] ${s}`).join('\n')}

---

修复后删除此文件，重新运行 \`/intel-distill\`
`;
}

/**
 * Write error log to inbox directory
 * Falls back to console output if file write fails
 */
function writeErrorLog(
  sourcePath: string,
  sourceDir: string,
  errorCode: string,
  errorMessage: string
): string {
  const inboxDir = path.join(sourceDir, 'inbox');
  const filename = path.basename(sourcePath);
  const errorLogPath = path.join(inboxDir, `${filename}.error.md`);

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const content = generateErrorLog(filename, errorCode, errorMessage, timestamp);

  try {
    // Ensure inbox directory exists
    if (!fs.existsSync(inboxDir)) {
      fs.mkdirSync(inboxDir, { recursive: true });
    }
    fs.writeFileSync(errorLogPath, content, 'utf-8');
    return errorLogPath;
  } catch (writeError) {
    // Fallback: output to console if file write fails
    console.error('⚠️  无法写入错误日志文件:', errorLogPath);
    console.error('原始错误:', writeError instanceof Error ? writeError.message : String(writeError));
    console.error('---');
    console.error(content);
    return errorLogPath; // Return path even if write failed
  }
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
 * Get archive path for a source file
 */
function getArchivePath(sourcePath: string, archiveDir: string): string {
  const filename = path.basename(sourcePath);
  return path.join(archiveDir, filename);
}

/**
 * Collect known source hashes from converted files' frontmatter
 */
function collectKnownHashes(sourceDir: string): Map<string, string> {
  const knownHashes = new Map<string, string>(); // hash -> converted path
  const convertedBase = path.join(sourceDir, 'converted');

  if (!fs.existsSync(convertedBase)) {
    return knownHashes;
  }

  // Walk through converted/YYYY/MM/ directories
  let years: string[];
  try {
    years = fs.readdirSync(convertedBase, { withFileTypes: true })
      .filter(e => e.isDirectory() && /^\d{4}$/.test(e.name))
      .map(e => e.name);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Cannot read converted directory ${convertedBase}: ${errMsg}`);
    return knownHashes;
  }

  for (const year of years) {
    let months: string[];
    try {
      months = fs.readdirSync(path.join(convertedBase, year), { withFileTypes: true })
        .filter(e => e.isDirectory() && /^\d{2}$/.test(e.name))
        .map(e => e.name);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Cannot read year directory ${year}: ${errMsg}`);
      continue;
    }

    for (const month of months) {
      const monthDir = path.join(convertedBase, year, month);
      let files: string[];
      try {
        files = fs.readdirSync(monthDir, { withFileTypes: true })
          .filter(e => e.isFile() && e.name.endsWith('.md'))
          .map(e => e.name);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Cannot read month directory ${monthDir}: ${errMsg}`);
        continue;
      }

      for (const mdFile of files) {
        const mdPath = path.join(monthDir, mdFile);
        try {
          const content = fs.readFileSync(mdPath, 'utf-8');
          const frontmatter = parseFrontmatter(content);
          if (frontmatter && frontmatter.sourceHash) {
            knownHashes.set(frontmatter.sourceHash, mdPath);
          }
        } catch (error) {
          // Log warning for files that can't be read or parsed
          const errMsg = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Failed to read frontmatter from ${mdPath}: ${errMsg}`);
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

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Cannot read directory ${dir}: ${errMsg}`);
      return;
    }

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
    try {
      const inboxEntries = fs.readdirSync(inboxDir, { withFileTypes: true });
      for (const entry of inboxEntries) {
        const fullPath = path.join(inboxDir, entry.name);
        if (entry.isFile() && isSupportedFormat(fullPath)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Cannot read inbox directory ${inboxDir}: ${errMsg}`);
    }
  }

  // Priority 2: Scan root directory (for backward compatibility)
  scan(sourceDir, true);

  return files;
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

  // Get archive path
  const archivePath = getArchivePath(sourcePath, archiveDir);

  // Check for duplicate based on existing converted files with frontmatter
  // (knownHashes now collects from converted files, not .meta files)
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

    // Write error log to inbox
    const errorLogPath = writeErrorLog(sourcePath, sourceDir, code, message);

    return {
      success: false,
      error: { code, message },
      errorLogPath,
    };
  }

  // Phase 2: Cleaning
  let cleanResult: { content: string; source: string; appliedRules: string[]; stats: { originalSize: number; cleanedSize: number; compressionRate: number } };
  try {
    cleanResult = await cleanMarkdown(rawContent, sourcePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Write error log to inbox
    const errorLogPath = writeErrorLog(sourcePath, sourceDir, 'CLEAN_FAILED', message);

    return {
      success: false,
      error: { code: 'CLEAN_FAILED', message },
      errorLogPath,
    };
  }

  const cleanedContent = cleanResult.content;

  // Phase 3: Write converted file with frontmatter
  // (Write converted file BEFORE archiving source to ensure atomicity)
  const now = new Date().toISOString();
  const relativeSourcePath = path.relative(sourceDir, sourcePath);
  const filename = path.basename(sourcePath, path.extname(sourcePath));
  const convertedPath = path.join(convertedDir, `${filename}.md`);

  try {
    // Ensure converted directory exists
    if (!fs.existsSync(convertedDir)) {
      fs.mkdirSync(convertedDir, { recursive: true });
    }

    // Generate frontmatter
    const relativeArchivePath = path.relative(sourceDir, archivePath);

    const frontmatter = generateFrontmatter(
      sourceHash,
      relativeSourcePath,
      now,
      relativeArchivePath
    );

    // Write converted file with frontmatter
    const fullContent = frontmatter + cleanedContent;
    fs.writeFileSync(convertedPath, fullContent, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Write error log to inbox
    const errorLogPath = writeErrorLog(sourcePath, sourceDir, 'ARCHIVE_FAILED', `Failed to write converted file: ${message}`);

    return {
      success: false,
      error: { code: 'ARCHIVE_FAILED', message: `Failed to write converted file: ${message}` },
      errorLogPath,
    };
  }

  // Phase 4: Archive source file (only after successful conversion)
  const relativeArchivePath = path.relative(sourceDir, archivePath);

  // Ensure archive directory exists
  try {
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Note: Converted file already written, but source not archived
    // This is recoverable - user can manually archive later
    console.warn(`Warning: Failed to create archive directory, source file not archived: ${message}`);
    // Still return success since converted file was written
    return {
      success: true,
      markdown: cleanedContent,
      stats: cleanResult.stats,
      archivedPath: sourcePath, // Source remains in place
      convertedPath,
      isDuplicate: false,
    };
  }

  // Move file to archive
  if (archivePath !== sourcePath && fs.existsSync(sourcePath)) {
    try {
      fs.renameSync(sourcePath, archivePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Handle cross-device link error by falling back to copy + delete
      if ((error as NodeJS.ErrnoException).code === 'EXDEV') {
        try {
          fs.copyFileSync(sourcePath, archivePath);
          fs.unlinkSync(sourcePath);
        } catch (copyError) {
          const copyMessage = copyError instanceof Error ? copyError.message : String(copyError);
          // Log warning but don't fail - converted file was written successfully
          console.warn(`Warning: Failed to archive source file: ${copyMessage}`);
          return {
            success: true,
            markdown: cleanedContent,
            stats: cleanResult.stats,
            archivedPath: sourcePath,
            convertedPath,
            isDuplicate: false,
          };
        }
      } else {
        // Log warning but don't fail - converted file was written successfully
        console.warn(`Warning: Failed to move source file to archive: ${message}`);
        return {
          success: true,
          markdown: cleanedContent,
          stats: cleanResult.stats,
          archivedPath: sourcePath,
          convertedPath,
          isDuplicate: false,
        };
      }
    }
  }

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
Usage: pnpm exec tsx index.ts --source <dir> [--force]

Directory Structure (v2.1):
  {source_dir}/
  ├── inbox/              # Drop new files here (recommended)
  ├── archive/YYYY/MM/    # Archived source files
  └── converted/YYYY/MM/  # Converted markdown files (with frontmatter)

Frontmatter fields in converted files:
  sourceHash, originalPath, archivedAt, archivedSource

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