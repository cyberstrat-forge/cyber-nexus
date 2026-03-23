/**
 * Preprocessing module type definitions
 *
 * Handles file conversion and content cleaning for intel-distill pipeline
 *
 * v2.1: Metadata stored in converted file frontmatter (not separate .meta files)
 * v2.0: Supports inbox/archive/converted directory structure
 */

/**
 * Error codes for preprocessing failures
 */
export type PreprocessErrorCode =
  | 'READ_FAILED'        // Source file cannot be read
  | 'CONVERSION_FAILED'  // PDF/DOCX conversion failed
  | 'CLEAN_FAILED'       // Content cleaning failed
  | 'DEPENDENCY_MISSING' // Required dependency (e.g., pandoc) not installed
  | 'ARCHIVE_FAILED';    // Failed to archive source file

/**
 * Error information for failed preprocessing
 */
export interface PreprocessError {
  code: PreprocessErrorCode;
  message: string;
}

/**
 * Statistics for preprocessing operation
 */
export interface PreprocessStats {
  originalSize: number;      // Original file size in bytes
  cleanedSize: number;       // Cleaned markdown size in bytes
  compressionRate: number;   // (originalSize - cleanedSize) / originalSize
}

/**
 * Result of preprocessing a single file (v2.1)
 */
export interface PreprocessResult {
  success: boolean;
  markdown?: string;         // Cleaned markdown content
  error?: PreprocessError;
  errorLogPath?: string;     // Path to error log file in inbox (v2.1, for failed conversions)
  stats?: PreprocessStats;
  archivedPath?: string;     // Path to archived source file (v2.0)
  convertedPath?: string;    // Path to converted file (v2.0)
  isDuplicate?: boolean;     // Whether file is a duplicate (v2.0)
  warning?: string;          // Warning message for partial success (e.g., archive failed)
}

/**
 * Metadata for converted files (v2.1)
 * Stored as frontmatter in converted markdown files (converted/YYYY/MM/{filename}.md)
 * @deprecated This interface is kept for reference. Actual frontmatter uses a simpler structure.
 */
export interface ArchiveMeta {
  sourceHash: string;        // MD5 hash of source file content (for deduplication)
  originalPath: string;      // Original path relative to source_dir (e.g., inbox/report.pdf)
  archivedAt: string;        // ISO 8601 timestamp when archived
  archivedSource: string;    // Path to archived source file (relative to source_dir)
}

/**
 * Legacy metadata for tracking processed files (v1.0 compatibility)
 * Stored in {source_dir}/converted/.meta/{filename}.json
 * @deprecated Legacy format. Metadata is now stored in converted file frontmatter.
 *             See ArchiveMeta for the v2.1 frontmatter structure (also deprecated, for reference only).
 */
export interface PreprocessMeta {
  sourcePath: string;        // Relative path to source file
  sourceHash: string;        // MD5 hash of source file content
  preprocessorVersion: string; // Version of preprocessing script
  processedAt: string;       // ISO 8601 timestamp
  detectedSource?: string;   // Detected document source
  appliedRules?: string[];   // Applied cleaning rules
  stats?: PreprocessStats;
}

/**
 * Supported file formats
 */
export type SupportedFormat = '.md' | '.txt' | '.pdf' | '.docx';

/**
 * Converter function type for each format
 */
export type ConverterFn = (filePath: string) => Promise<string>;

/**
 * Preprocessing options (v2.0)
 */
export interface PreprocessOptions {
  sourceDir: string;         // Source directory path
  archiveDir: string;        // Archive directory path (archive/YYYY/MM/)
  convertedDir: string;      // Output directory for converted files (converted/YYYY/MM/)
  preprocessorVersion: string; // Current preprocessor version
  force?: boolean;           // Force reprocess all files
  dateRef?: Date;            // Reference date for archive/converted path (default: now)
}

/**
 * Batch processing result (v2.0)
 */
export interface BatchResult {
  total: number;             // Total files scanned
  processed: number;         // Files processed in this run
  skipped: number;           // Files skipped (already processed)
  duplicates: number;        // Duplicate files detected (v2.0)
  failed: number;            // Files that failed
  results: Map<string, PreprocessResult>; // Per-file results
  archiveDir?: string;       // Archive directory used (v2.0)
  convertedDir?: string;     // Converted directory used (v2.0)
}