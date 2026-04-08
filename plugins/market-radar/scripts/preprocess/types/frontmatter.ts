/**
 * Unified frontmatter types for converted files
 *
 * Design goal: Same structure for both local files and cyber-pulse files
 * - Local files: generated fields with null for missing data
 * - cyber-pulse files: inherited fields from intel-pull
 */

/**
 * Item source tracing fields (Group 1)
 */
export interface ItemSourceFields {
  item_id: string;
  item_title: string;
  author: string | null;
  original_url: string | null;
  published_at: string | null;
  fetched_at: string;
  completeness_score: number | null;
}

/**
 * Intelligence source tracing fields (Group 2)
 */
export interface IntelligenceSourceFields {
  source_id: string | null;
  source_name: string | null;
  source_url: string | null;
  source_tier: string | null;
  source_score: number | null;
}

/**
 * File tracing fields (Group 3)
 */
export interface FileTracingFields {
  archived_file: string;  // WikiLink format: [[path]]
  content_hash: string;   // MD5 of converted body
  source_hash: string;    // MD5 of source file (for deduplication)
  archivedAt: string;
}

/**
 * Processing status fields (Group 4)
 */
export interface ProcessingStatusFields {
  processed_status: 'pending' | 'passed' | 'rejected';
  processed_at: string | null;
}

/**
 * Unified converted file frontmatter
 */
export interface ConvertedFileFrontmatter
  extends ItemSourceFields, IntelligenceSourceFields, FileTracingFields, ProcessingStatusFields {
  // Reserved fields for cyber-pulse files (identification and compatibility)
  source_type?: 'cyber-pulse';
  first_seen_at?: string;
  tags?: string[];
}

/**
 * Generate item_id from content hash
 */
export function generateItemId(contentHash: string): string {
  return `item_${contentHash.slice(0, 8)}`;
}

/**
 * Convert path to WikiLink format
 */
export function toWikiLink(path: string): string {
  return `[[${path}]]`;
}

/**
 * Extract path from WikiLink format
 */
export function fromWikiLink(wikiLink: string): string {
  return wikiLink.replace(/^\[\[/, '').replace(/\]\]$/, '');
}