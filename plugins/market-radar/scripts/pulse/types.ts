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
  /** API key for authentication (stored directly) */
  api_key: string;
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
 * ISO 8601 timestamp string
 */
export type Timestamp = string;

/**
 * Source information embedded in content (API v1)
 */
export interface PulseSourceInfo {
  /** Source ID */
  source_id: string;
  /** Source name */
  source_name: string;
  /** Source URL */
  source_url?: string;
  /** Source tier (T0-T3) */
  source_tier: SourceTier;
  /** Source score (0-100) */
  source_score?: number;
}

/**
 * API content item from cyber-pulse API v1
 *
 * Field mapping from API v1:
 * - id → content_id (frontmatter) - format: item_{8位hex}
 * - title → Markdown 标题
 * - body → Markdown 正文
 * - fetched_at → first_seen_at (frontmatter)
 */
export interface PulseContent {
  /** Item ID (format: item_{8位hex}) */
  id: string;
  /** Title - used as Markdown heading */
  title: string;
  /** Markdown content */
  body: string;
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
  /** Completeness score (0-1) */
  completeness_score?: number;
  /** Word count */
  word_count?: number;
}

/**
 * API list response (v1 format)
 */
export interface PulseListResponse {
  /** List of content items */
  data: PulseContent[];
  /** Cursor for next page */
  next_cursor: string | null;
  /** Whether more items available */
  has_more: boolean;
  /** Number of items in current response */
  count: number;
  /** Server timestamp (ISO 8601) */
  server_timestamp: string;
}

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
  /** Current cursor (item_id) */
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
  mode: 'incremental' | 'init' | 'since' | 'preview' | 'all';
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
  /** Initialize mode - pull all and reset cursor */
  init: boolean;
  /** Pull items since datetime */
  since?: string;
  /** Pull items until datetime */
  until?: string;
  /** Preview mode - show items without writing */
  preview: boolean;
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
  | 'API_KEY_NOT_SET'
  | 'SOURCE_NOT_FOUND'
  | 'API_CONNECTION_FAILED'
  | 'API_AUTH_FAILED'
  | 'API_TIMEOUT'
  | 'API_ERROR'
  | 'API_INVALID_RESPONSE'
  | 'INVALID_OPTIONS';

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
 * Validate API list response structure (v1 format)
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

  // v1: next_cursor and has_more at top level (not in meta)
  if (resp.next_cursor !== null && typeof resp.next_cursor !== 'string') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 next_cursor: 应为 string 或 null，实际为 ${typeof resp.next_cursor}`,
      { nextCursorType: typeof resp.next_cursor, response }
    );
  }

  if (typeof resp.has_more !== 'boolean') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 has_more: 应为 boolean，实际为 ${typeof resp.has_more}`,
      { hasMoreType: typeof resp.has_more, response }
    );
  }

  if (typeof resp.count !== 'number') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 count: 应为 number，实际为 ${typeof resp.count}`,
      { countType: typeof resp.count, response }
    );
  }

  if (typeof resp.server_timestamp !== 'string') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 server_timestamp: 应为 string，实际为 ${typeof resp.server_timestamp}`,
      { serverTimestampType: typeof resp.server_timestamp, response }
    );
  }

  return true;
}