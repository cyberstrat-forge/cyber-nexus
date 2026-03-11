/**
 * Preprocessing module type definitions
 *
 * Handles file conversion and content cleaning for intel-distill pipeline
 */

/**
 * Error codes for preprocessing failures
 */
export type PreprocessErrorCode =
  | 'READ_FAILED'        // Source file cannot be read
  | 'CONVERSION_FAILED'  // PDF/DOCX conversion failed
  | 'CLEAN_FAILED'       // Content cleaning failed
  | 'DEPENDENCY_MISSING'; // Required dependency (e.g., pandoc) not installed

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
 * Result of preprocessing a single file
 */
export interface PreprocessResult {
  success: boolean;
  markdown?: string;         // Cleaned markdown content
  error?: PreprocessError;
  stats?: PreprocessStats;
}

/**
 * Metadata for tracking processed files
 * Stored in {source_dir}/converted/.meta/{filename}.json
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
 * Preprocessing options
 */
export interface PreprocessOptions {
  sourceDir: string;         // Source directory path
  convertedDir: string;      // Output directory for converted files
  metaDir: string;           // Metadata directory path
  preprocessorVersion: string; // Current preprocessor version
  force?: boolean;           // Force reprocess all files
}

/**
 * Batch processing result
 */
export interface BatchResult {
  total: number;             // Total files scanned
  processed: number;         // Files processed in this run
  skipped: number;           // Files skipped (already processed)
  failed: number;            // Files that failed
  results: Map<string, PreprocessResult>; // Per-file results
}