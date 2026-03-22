/**
 * Pulse module type definitions
 *
 * Types for cyber-pulse API client and intel-pull command
 */

// ==================== Configuration Types ====================

/**
 * Single source configuration
 */
export interface PulseSource {
  /** Source name (unique identifier) */
  name: string;
  /** API base URL */
  url: string;
  /** Environment variable name for API key */
  key_ref: string;
}

/**
 * Pulse sources configuration file structure
 */
export interface PulseSourcesConfig {
  /** List of configured sources */
  sources: PulseSource[];
  /** Default source name */
  default_source: string;
}

// ==================== API Types ====================

/**
 * Source tier levels (T0 = highest priority, T3 = lowest)
 */
export type SourceTier = 'T0' | 'T1' | 'T2' | 'T3';

/**
 * Source connector types
 */
export type SourceType = 'rss' | 'api' | 'web' | 'media';

/**
 * ISO 8601 timestamp string
 */
export type Timestamp = string;

/**
 * Quality score (0-100)
 */
export type QualityScore = number;

/**
 * Source information embedded in content
 */
export interface PulseSourceInfo {
  /** Source ID */
  id: string;
  /** Source name */
  name: string;
  /** Source tier (T0-T3) */
  tier: SourceTier;
  /** Source type (rss, api, web, media) */
  type: SourceType;
}

/**
 * API content item from cyber-pulse v1.3.0
 *
 * Field mapping from API v1.3.0:
 * - id → content_id (frontmatter)
 * - title → Markdown 标题
 * - content → Markdown 正文
 * - fetched_at → first_seen_at (frontmatter)
 */
export interface PulseContent {
  /** Content ID (format: cnt_YYYYMMDDHHMMSS_xxxxxxxx) - maps to content_id */
  id: string;
  /** Title - used as Markdown heading */
  title: string;
  /** Markdown content - used as document body */
  content: string;
  /** HTML content (optional) */
  content_html?: string;
  /** Original URL */
  url?: string;
  /** Author (optional) */
  author?: string;
  /** Tags array */
  tags?: string[];
  /** Published timestamp (ISO 8601) */
  published_at?: Timestamp;
  /** Fetched timestamp (ISO 8601) - maps to first_seen_at */
  fetched_at: Timestamp;
  /** Source information */
  source?: PulseSourceInfo;
  /** Quality score (0-100) */
  quality_score?: QualityScore;
  /** Deduplication hash - maps to canonical_hash */
  canonical_hash: string;
}

/**
 * API list response (v1.3.0 format)
 */
export interface PulseListResponse {
  /** List of content items */
  data: PulseContent[];
  /** Pagination metadata */
  meta: {
    /** Cursor for next page */
    next_cursor: string | null;
    /** Whether more items available */
    has_more: boolean;
  };
}

/**
 * API single item response (v1.3.0 format)
 * Returns content object directly, not wrapped
 */
export type PulseItemResponse = PulseContent;

/**
 * API error response
 */
export interface PulseErrorResponse {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
}

// ==================== State Types ====================

/**
 * Cursor tracking for a single source
 */
export interface PulseCursorState {
  /** Current cursor (content_id) */
  cursor: string | null;
  /** Last pull timestamp (ISO 8601) */
  last_pull: string | null;
}

/**
 * Pulse state within state.json
 */
export interface PulseState {
  /** Cursor tracking per source */
  cursors: Record<string, PulseCursorState>;
}

// ==================== Pull Result Types ====================

/**
 * Result of pulling from a single source (success case)
 */
export interface PullSourceResultSuccess {
  /** Source name */
  source: string;
  /** Always true for success case */
  success: true;
  /** Number of items pulled */
  count: number;
  /** New cursor after pull */
  new_cursor?: string;
  /** Files written */
  files?: string[];
}

/**
 * Result of pulling from a single source (failure case)
 */
export interface PullSourceResultFailure {
  /** Source name */
  source: string;
  /** Always false for failure case */
  success: false;
  /** Always 0 for failure case */
  count: 0;
  /** Error message (required for failure) */
  error: string;
}

/**
 * Result of pulling from a single source
 *
 * Discriminated union ensures:
 * - success=true: no error field, count is actual number
 * - success=false: error is required, count is 0
 */
export type PullSourceResult = PullSourceResultSuccess | PullSourceResultFailure;

/**
 * Overall pull result
 */
export interface PullResult {
  /** Pull mode used */
  mode: 'incremental' | 'since' | 'single' | 'all';
  /** Output directory */
  output_dir: string;
  /** Results per source */
  sources: PullSourceResult[];
  /** Total items pulled */
  total_count: number;
  /** Pull timestamp */
  pulled_at: string;
}

// ==================== CLI Types ====================

/**
 * Parsed CLI arguments
 */
export interface PullOptions {
  /** Source name to pull from */
  source?: string;
  /** Pull from all sources */
  all: boolean;
  /** Output directory */
  output: string;
  /** Pull items since datetime */
  since?: string;
  /** Pull single item by ID */
  id?: string;
  /** List sources mode */
  listSources: boolean;
  /** Add source mode */
  addSource: boolean;
  /** Remove source by name */
  removeSource?: string;
  /** Set default source */
  setDefault?: string;
}

// ==================== Error Types ====================

/**
 * Error codes for pulse module
 */
export type PulseErrorCode =
  | 'CONFIG_NOT_FOUND'
  | 'CONFIG_PARSE_ERROR'
  | 'ENV_VAR_NOT_SET'
  | 'SOURCE_NOT_FOUND'
  | 'API_CONNECTION_FAILED'
  | 'API_AUTH_FAILED'
  | 'API_TIMEOUT'
  | 'API_ERROR'
  | 'API_INVALID_RESPONSE'
  | 'CONTENT_NOT_FOUND'
  | 'STATE_ERROR';

/**
 * Pulse error with code
 */
export class PulseError extends Error {
  constructor(
    public code: PulseErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PulseError';
  }
}

// ==================== Constants ====================

/** Default limit for API requests */
export const DEFAULT_LIMIT = 100;

/** Connection timeout in milliseconds */
export const CONNECT_TIMEOUT = 10000;

/** Request timeout in milliseconds */
export const REQUEST_TIMEOUT = 30000;

/** Retry count for failed requests */
export const RETRY_COUNT = 1;

/** Retry delay in milliseconds */
export const RETRY_DELAY = 2000;

// ==================== Validation Functions ====================

/**
 * Validate API list response structure
 *
 * @param response - Raw API response
 * @returns True if valid, throws PulseError if invalid
 */
export function validateListResponse(response: unknown): response is PulseListResponse {
  if (!response || typeof response !== 'object') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      'API 返回无效响应: 响应为空或非对象',
      { response }
    );
  }

  const resp = response as Record<string, unknown>;

  if (!Array.isArray(resp.data)) {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效数据格式: data 应为数组，实际为 ${typeof resp.data}`,
      { dataType: typeof resp.data, response }
    );
  }

  if (!resp.meta || typeof resp.meta !== 'object') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      'API 返回无效响应: 缺少 meta 字段',
      { response }
    );
  }

  const meta = resp.meta as Record<string, unknown>;

  if (meta.next_cursor !== null && typeof meta.next_cursor !== 'string') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 meta.next_cursor: 应为 string 或 null，实际为 ${typeof meta.next_cursor}`,
      { nextCursorType: typeof meta.next_cursor, response }
    );
  }

  if (typeof meta.has_more !== 'boolean') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 meta.has_more: 应为 boolean，实际为 ${typeof meta.has_more}`,
      { hasMoreType: typeof meta.has_more, response }
    );
  }

  return true;
}

/**
 * Validate API single item response
 *
 * @param response - Raw API response
 * @param contentId - Requested content ID (for error messages)
 * @returns True if valid, throws PulseError if invalid
 */
export function validateItemResponse(
  response: unknown,
  contentId?: string
): response is PulseContent {
  if (!response || typeof response !== 'object') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效内容${contentId ? `: ${contentId}` : ''}`,
      { contentId, response }
    );
  }

  const content = response as Record<string, unknown>;

  const missingFields: string[] = [];
  if (!content.id) missingFields.push('id');
  if (!content.fetched_at) missingFields.push('fetched_at');
  if (!content.canonical_hash) missingFields.push('canonical_hash');

  if (missingFields.length > 0) {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回内容缺少必需字段: ${missingFields.join(', ')}${contentId ? ` (${contentId})` : ''}`,
      { contentId, missingFields, response }
    );
  }

  return true;
}