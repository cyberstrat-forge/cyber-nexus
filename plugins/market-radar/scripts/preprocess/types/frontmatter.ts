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
  archived_file: string | null;  // WikiLink format for local files, null for cyber-pulse
  content_hash: string;   // MD5 of converted body
  source_hash: string;    // MD5 of source file (for deduplication)
  archived_at: string;    // snake_case, consistent with other fields
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
  // Source type identification (required for all files)
  source_type: 'local' | 'cyber-pulse';
  // Additional fields for cyber-pulse files
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
 * Convert path to WikiLink format with optional alias
 *
 * @param path - File path
 * @param alias - Optional display alias (if not provided, uses filename)
 * @returns WikiLink string in format [[path|alias]]
 */
export function toWikiLink(path: string, alias?: string): string {
  // Use provided alias, or extract filename as default alias
  const displayAlias = alias || path.split('/').pop() || path;
  return `[[${path}|${displayAlias}]]`;
}

/**
 * Extract path from WikiLink format
 * Supports both [[path]] and [[path|alias]] formats
 * Returns null if input is not a valid WikiLink format
 */
export function fromWikiLink(wikiLink: string): string | null {
  // Validate WikiLink format: must be [[...]]
  if (!wikiLink.startsWith('[[') || !wikiLink.endsWith(']]')) {
    return null;
  }
  // Extract content between [[ and ]]
  const content = wikiLink.slice(2, -2);
  if (content.length === 0) {
    return null;
  }
  // Handle alias format: [[path|alias]] -> extract path
  const pipeIndex = content.indexOf('|');
  return pipeIndex === -1 ? content : content.slice(0, pipeIndex);
}