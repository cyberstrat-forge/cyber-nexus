#!/usr/bin/env node
/**
 * Pulse API client module
 *
 * HTTP client for cyber-pulse API with retry and error handling
 *
 * Usage:
 *   import { PulseClient } from './api-client';
 *   const client = new PulseClient(baseUrl, apiKey);
 *   const response = await client.listContent();
 */

import { request, errors } from 'undici';
import {
  PulseListResponse,
  PulseItemResponse,
  PulseError,
  DEFAULT_LIMIT,
  CONNECT_TIMEOUT,
  REQUEST_TIMEOUT,
  RETRY_COUNT,
  RETRY_DELAY,
} from './types.js';

// ==================== Types ====================

/**
 * Query parameters for list content API
 */
interface ListQueryParams {
  cursor?: string;
  limit?: number;
  since?: string;
}

// ==================== Helper Functions ====================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== PulseClient Class ====================

/**
 * HTTP client for cyber-pulse API
 *
 * Features:
 * - Automatic retry on transient failures
 * - Connection and request timeouts
 * - Structured error handling with PulseError
 */
export class PulseClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  /**
   * Create a new Pulse API client
   *
   * @param baseUrl - API base URL (trailing slash will be removed)
   * @param apiKey - API key for authentication
   */
  constructor(baseUrl: string, apiKey: string) {
    // Remove trailing slash from baseUrl
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  /**
   * Make an API request with retry logic
   *
   * @param path - API path (e.g., /content)
   * @param query - Query parameters
   * @returns Parsed JSON response
   * @throws {PulseError} On authentication, timeout, or connection errors
   */
  private async makeRequest<T>(
    path: string,
    query?: ListQueryParams
  ): Promise<T> {
    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      if (query.cursor) {
        url.searchParams.set('cursor', query.cursor);
      }
      if (query.limit !== undefined) {
        url.searchParams.set('limit', String(query.limit));
      }
      if (query.since) {
        url.searchParams.set('since', query.since);
      }
    }

    let lastError: Error | null = null;
    const maxAttempts = RETRY_COUNT + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await request(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
          },
          headersTimeout: CONNECT_TIMEOUT,
          bodyTimeout: REQUEST_TIMEOUT,
        });

        // Handle HTTP status codes
        if (response.statusCode === 401) {
          throw new PulseError(
            'API_AUTH_FAILED',
            'API 认证失败: 无效的 API Key',
            { statusCode: 401, url: url.toString() }
          );
        }

        if (response.statusCode === 404) {
          throw new PulseError(
            'CONTENT_NOT_FOUND',
            '内容不存在',
            { statusCode: 404, url: url.toString() }
          );
        }

        if (response.statusCode >= 400) {
          const body = await response.body.text();
          let errorMessage = `API 错误: HTTP ${response.statusCode}`;
          try {
            const errorJson = JSON.parse(body);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            }
          } catch {
            // Body is not valid JSON, use default error message
            // Raw body is already included in details for debugging (line 143)
          }
          throw new PulseError(
            'API_ERROR',
            errorMessage,
            { statusCode: response.statusCode, url: url.toString(), body }
          );
        }

        // Parse successful response
        const body = await response.body.text();
        return JSON.parse(body) as T;
      } catch (error) {
        // Handle undici errors (connection/timeout errors)
        if (error instanceof errors.UndiciError) {
          const undiciError = error as errors.UndiciError & { code?: string };

          // Connection timeout
          if (error instanceof errors.ConnectTimeoutError) {
            throw new PulseError(
              'API_CONNECTION_FAILED',
              'API 连接超时',
              { code: error.code, url: url.toString() }
            );
          }

          // Timeout errors (headers/body)
          if (
            error instanceof errors.HeadersTimeoutError ||
            error instanceof errors.BodyTimeoutError
          ) {
            lastError = new PulseError(
              'API_TIMEOUT',
              'API 请求超时',
              { code: error.code, url: url.toString() }
            );

            // Retry on timeout
            if (attempt < maxAttempts) {
              await sleep(RETRY_DELAY);
              continue;
            }
            throw lastError;
          }

          // Other undici errors
          throw new PulseError(
            'API_ERROR',
            `API 错误: ${error.message}`,
            { code: undiciError.code, url: url.toString() }
          );
        }

        // Handle Node.js system errors (connection refused, DNS lookup failed, etc.)
        if (error instanceof Error && 'code' in error) {
          const nodeError = error as Error & { code: string };

          if (
            nodeError.code === 'ECONNREFUSED' ||
            nodeError.code === 'ENOTFOUND' ||
            nodeError.code === 'EAI_AGAIN' ||
            nodeError.code === 'ETIMEDOUT'
          ) {
            throw new PulseError(
              'API_CONNECTION_FAILED',
              `API 连接失败: ${error.message}`,
              { code: nodeError.code, url: url.toString() }
            );
          }
        }

        // Re-throw PulseError as-is
        if (error instanceof PulseError) {
          throw error;
        }

        // Handle JSON parse errors
        if (error instanceof SyntaxError) {
          throw new PulseError(
            'API_ERROR',
            `API 响应解析失败: ${error.message}`,
            { url: url.toString() }
          );
        }

        // Programming errors should not be retried
        if (error instanceof TypeError || error instanceof ReferenceError || error instanceof RangeError) {
          throw new PulseError(
            'API_ERROR',
            `内部错误: ${error.message}`,
            { url: url.toString(), originalError: error.constructor.name }
          );
        }

        // Generic error - retry for transient issues
        lastError = error instanceof Error ? error : new Error(String(error));

        // Retry on transient errors
        if (attempt < maxAttempts) {
          await sleep(RETRY_DELAY);
          continue;
        }
      }
    }

    // All retries exhausted
    throw new PulseError(
      'API_ERROR',
      lastError?.message || '请求失败',
      { url: url.toString(), attempts: maxAttempts }
    );
  }

  // ==================== API Methods ====================

  /**
   * List content items
   *
   * GET /api/v1/contents?cursor={cursor}&limit={limit}
   *
   * @param cursor - Pagination cursor (optional)
   * @param limit - Number of items to return (default: 100)
   * @returns List response with data and meta
   */
  async listContent(
    cursor?: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<PulseListResponse> {
    return this.makeRequest<PulseListResponse>('/api/v1/contents', {
      cursor,
      limit,
    });
  }

  /**
   * List content items since a specific datetime
   *
   * GET /api/v1/contents?since={since}&cursor={cursor}&limit={limit}
   *
   * @param since - ISO 8601 datetime string
   * @param cursor - Pagination cursor (optional)
   * @param limit - Number of items to return (default: 100)
   * @returns List response with data and meta
   */
  async listContentSince(
    since: string,
    cursor?: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<PulseListResponse> {
    return this.makeRequest<PulseListResponse>('/api/v1/contents', {
      since,
      cursor,
      limit,
    });
  }

  /**
   * Get a single content item by ID
   *
   * GET /api/v1/contents/{contentId}
   *
   * @param contentId - Content ID (format: cnt_YYYYMMDDHHMMSS_xxxxxxxx)
   * @returns Single content item (returned directly, not wrapped)
   */
  async getContent(contentId: string): Promise<PulseItemResponse> {
    return this.makeRequest<PulseItemResponse>(`/api/v1/contents/${contentId}`);
  }
}