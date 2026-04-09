/**
 * Obsidian tag normalization utilities
 *
 * Provides functions for normalizing tags to conform to Obsidian tag conventions.
 *
 * Obsidian tag rules:
 * - Allowed: letters, digits, _, -, /, Unicode characters
 * - Not allowed: spaces, special symbols (#, ., ,, :, ?, !, @, etc.)
 */

/**
 * Normalize a single tag to Obsidian format
 *
 * Processing rules:
 * 1. `:` -> `/` (preserve nesting semantics)
 * 2. Replace disallowed chars with `-`
 * 3. Collapse multiple consecutive `-` to single `-`
 * 4. Remove leading/trailing `-` and `/`
 * 5. Return empty string for invalid tags
 *
 * @param tag - Raw tag string (may be null or undefined)
 * @returns Normalized tag, or empty string if invalid
 */
export function normalizeObsidianTag(tag: string | null | undefined): string {
  // Handle null/undefined/empty
  if (!tag || typeof tag !== 'string') {
    return '';
  }

  // Trim whitespace
  let result = tag.trim();
  if (result === '') {
    return '';
  }

  // Step 1: `:` -> `/` (preserve nesting semantics)
  result = result.replace(/:/g, '/');

  // Step 2: Allowed chars: letters, digits, _, -, /, Unicode
  // Replace all other chars with `-`
  result = result.replace(/[^\p{L}\p{N}_\-/]/gu, '-');

  // Step 3: Collapse multiple consecutive `-` to single `-`
  result = result.replace(/-+/g, '-');

  // Step 4: Remove leading/trailing `-` and `/`
  result = result.replace(/^[-/]+|[-/]+$/g, '');

  return result;
}

/**
 * Normalize an array of tags, filtering out invalid ones
 *
 * @param tags - Array of raw tag strings (may contain null/undefined)
 * @returns Array of normalized tags (empty strings filtered out)
 */
export function normalizeObsidianTags(tags: (string | null | undefined)[]): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map(tag => normalizeObsidianTag(tag))
    .filter(tag => tag !== '');
}