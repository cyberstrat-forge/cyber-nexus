#!/usr/bin/env tsx
/**
 * Preprocessing entry point (v2.2)
 *
 * Supports inbox/archive/converted directory structure:
 * - inbox/ - User drops new files here
 * - archive/YYYY/MM/ - Archived source files
 * - converted/YYYY/MM/ - Converted markdown files with frontmatter metadata
 *
 * v2.2 Changes:
 * - Add cyber-pulse file handling (source_type: cyber-pulse in frontmatter)
 * - cyber-pulse files skip conversion/cleaning, just move to converted/
 * - Deduplication: local files by hash, cyber-pulse files by filename (item_id)
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
import { createHash } from 'crypto';
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
import { parseFrontmatter, generateFrontmatter as generateYamlFrontmatter } from '../utils/frontmatter';

// Current preprocessor version - increment when cleaning rules change
const PREPROCESSOR_VERSION = '2.2.0';

/**
 * Required fields for cyber-pulse files
 */
const CYBER_PULSE_REQUIRED_FIELDS = ['item_id', 'source_type', 'first_seen_at', 'title'];

/**
 * Check if a markdown file is a cyber-pulse output file
 * Detects by frontmatter containing source_type: cyber-pulse
 */
function isCyberPulseFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    return frontmatter?.source_type === 'cyber-pulse';
  } catch {
    return false;
  }
}

/**
 * Validate cyber-pulse file has required fields
 * Returns error message if validation fails, null if valid
 */
function validateCyberPulseFile(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) {
      return 'Missing frontmatter';
    }

    const missingFields = CYBER_PULSE_REQUIRED_FIELDS.filter(
      field => !frontmatter[field]
    );

    if (missingFields.length > 0) {
      return `Missing required fields: ${missingFields.join(', ')}`;
    }

    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Failed to read file: ${message}`;
  }
}

/**
 * Collect known filenames from converted directory for cyber-pulse deduplication
 * cyber-pulse files use filename (item_id) for dedup, not hash
 */
function collectKnownFiles(sourceDir: string): Set<string> {
  const knownFiles = new Set<string>();
  const convertedBase = path.join(sourceDir, 'converted');

  if (!fs.existsSync(convertedBase)) {
    return knownFiles;
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
    return knownFiles;
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

      // Add filenames to known set (only cyber-pulse files for dedup)
      for (const mdFile of files) {
        const mdPath = path.join(monthDir, mdFile);
        // Only add if file has source_type: cyber-pulse in frontmatter
        if (isCyberPulseFile(mdPath)) {
          knownFiles.add(mdFile);
        }
      }
    }
  }

  return knownFiles;
}

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
    INVALID_PULSE_FORMAT: [
      '检查文件是否为有效的 cyber-pulse 输出文件',
      '确认 frontmatter 包含必需字段: item_id, source_type, first_seen_at, title',
      '重新运行 intel-pull 命令获取正确格式',
    ],
    WRITE_FAILED: [
      '检查输出目录权限',
      '确认磁盘空间充足',
      '检查文件名是否有效',
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
 * Process a cyber-pulse file
 * - Skip format conversion (already Markdown)
 * - Skip content cleaning (already processed)
 * - Calculate content_hash and update frontmatter
 * - Move to converted/YYYY/MM/
 */
function processCyberPulseFile(
  sourcePath: string,
  convertedDir: string,
  sourceDir: string,
  knownFiles: Set<string>,
  dateRef: Date
): PreprocessResult {
  const filename = path.basename(sourcePath);

  // Check for duplicate by filename (item_id)
  if (knownFiles.has(filename)) {
    return {
      success: true,
      isDuplicate: true,
      convertedPath: path.join(convertedDir, filename),
    };
  }

  // Validate required fields
  const validationError = validateCyberPulseFile(sourcePath);
  if (validationError) {
    return {
      success: false,
      error: { code: 'INVALID_PULSE_FORMAT', message: validationError },
    };
  }

  // Read file content
  let content: string;
  try {
    content = fs.readFileSync(sourcePath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: { code: 'READ_FAILED', message },
    };
  }

  // Parse frontmatter
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter) {
    return {
      success: false,
      error: { code: 'INVALID_PULSE_FORMAT', message: 'Missing frontmatter' },
    };
  }

  // Calculate content_hash from the markdown body (excluding frontmatter)
  // Extract the markdown content after frontmatter
  const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const markdownContent = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;
  const contentHash = createHash('md5').update(markdownContent).digest('hex');

  // Update frontmatter with content_hash
  const updatedFrontmatter: Record<string, string> = {
    ...frontmatter,
    content_hash: contentHash,
  };

  // Generate new frontmatter
  const newFrontmatterStr = generateYamlFrontmatter(updatedFrontmatter);
  const newContent = newFrontmatterStr + markdownContent;

  // Ensure converted directory exists
  try {
    if (!fs.existsSync(convertedDir)) {
      fs.mkdirSync(convertedDir, { recursive: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: { code: 'WRITE_FAILED', message: `Failed to create converted directory: ${message}` },
    };
  }

  // Write to converted directory
  const convertedPath = path.join(convertedDir, filename);
  try {
    fs.writeFileSync(convertedPath, newContent, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: { code: 'WRITE_FAILED', message: `Failed to write converted file: ${message}` },
    };
  }

  // Delete source file (cyber-pulse files don't need archiving)
  try {
    if (fs.existsSync(sourcePath)) {
      fs.unlinkSync(sourcePath);
    }
  } catch (error) {
    // Log warning but don't fail - converted file was written successfully
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Failed to delete source cyber-pulse file: ${message}`);
    // Return success with warning
    return {
      success: true,
      markdown: markdownContent,
      convertedPath,
      isDuplicate: false,
      warning: `Source file deletion failed: ${message}`,
    };
  }

  return {
    success: true,
    markdown: markdownContent,
    convertedPath,
    isDuplicate: false,
  };
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
      warning: `Archive directory creation failed: ${message}`,
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
            warning: `Source file archive failed: ${copyMessage}`,
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
          warning: `Source file move to archive failed: ${message}`,
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

  // Collect known hashes for local file deduplication
  const knownHashes = force ? new Map<string, string>() : collectKnownHashes(sourceDir);

  // Collect known filenames for cyber-pulse file deduplication
  const knownFiles = force ? new Set<string>() : collectKnownFiles(sourceDir);

  // Scan for files
  const files = scanDirectory(sourceDir);
  const results = new Map<string, PreprocessResult>();
  let processed = 0;
  let skipped = 0;
  let duplicates = 0;
  let failed = 0;

  for (const sourcePath of files) {
    // Check if this is a cyber-pulse file
    const isPulseFile = isCyberPulseFile(sourcePath);

    if (isPulseFile) {
      // Handle cyber-pulse files
      const filename = path.basename(sourcePath);

      // Check for duplicate by filename (unless force)
      if (!force && knownFiles.has(filename)) {
        duplicates++;
        results.set(sourcePath, {
          success: true,
          isDuplicate: true,
          convertedPath: path.join(convertedDir, filename),
        });
        continue;
      }

      // Process cyber-pulse file
      const result = processCyberPulseFile(
        sourcePath,
        convertedDir,
        sourceDir,
        knownFiles,
        dateRef
      );

      results.set(sourcePath, result);

      if (result.isDuplicate) {
        duplicates++;
      } else if (result.success) {
        processed++;
        // Add to known files to avoid re-processing in same batch
        knownFiles.add(filename);
      } else {
        failed++;
        console.error(`Failed: ${sourcePath} - ${result.error?.message}`);
      }
    } else {
      // Handle local files (existing logic)
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

Directory Structure (v2.2):
  {source_dir}/
  ├── inbox/              # Drop new files here (recommended)
  ├── archive/YYYY/MM/    # Archived source files
  └── converted/YYYY/MM/  # Converted markdown files (with frontmatter)

Supported file types:
  - Local files: .md, .txt, .pdf, .docx (converted and cleaned)
  - cyber-pulse files: .md with source_type: cyber-pulse (moved directly)

Frontmatter fields in converted files:
  - Local files: sourceHash, originalPath, archivedAt, archivedSource
  - cyber-pulse files: item_id, source_type, first_seen_at, title, content_hash

Deduplication:
  - Local files: by content hash (sourceHash)
  - cyber-pulse files: by filename (item_id)

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
  processCyberPulseFile,
  getArchiveDir,
  getConvertedDir,
  collectKnownHashes,
  collectKnownFiles,
  isCyberPulseFile,
  validateCyberPulseFile,
  PREPROCESSOR_VERSION,
};