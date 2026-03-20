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
 * API content item from cyber-pulse
 */
export interface PulseContent {
  /** Content ID (format: cnt_YYYYMMDDHHMMSS_xxxxxxxx) */
  content_id: string;
  /** Deduplication hash */
  canonical_hash: string;
  /** Normalized title */
  normalized_title: string;
  /** Normalized body content */
  normalized_body: string;
  /** First seen timestamp (ISO 8601) */
  first_seen_at: string;
  /** Last seen timestamp (ISO 8601) */
  last_seen_at: string;
  /** Number of sources */
  source_count: number;
}

/**
 * API list response
 */
export interface PulseListResponse {
  /** List of content items */
  items: PulseContent[];
  /** Cursor for next page */
  next_cursor: string | null;
  /** Whether more items available */
  has_more: boolean;
}

/**
 * API single item response
 */
export interface PulseItemResponse {
  /** Single content item */
  item: PulseContent;
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