/**
 * Frontmatter parsing utilities
 *
 * Provides functions for parsing and generating YAML frontmatter in markdown files.
 */

/**
 * Escape special characters for YAML double-quoted string
 *
 * @param value - Raw string value
 * @returns YAML-safe escaped string
 */
function escapeYamlString(value: string): string {
  // Escape backslashes first, then double quotes
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Format a single YAML value
 *
 * @param value - Value to format (string, number, null, or array)
 * @returns YAML-formatted value string
 */
function formatYamlValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    // Format as YAML array
    const items = value.map(item => {
      if (typeof item === 'string') {
        return `"${escapeYamlString(item)}"`;
      }
      return String(item);
    });
    return `[${items.join(', ')}]`;
  }
  if (typeof value === 'string') {
    return `"${escapeYamlString(value)}"`;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  // Fallback for other types
  return `"${escapeYamlString(String(value))}"`;
}

/**
 * Parse frontmatter from markdown content
 * Returns key-value pairs from the frontmatter section
 *
 * @param content - Markdown content with optional frontmatter
 * @returns Parsed frontmatter key-value pairs, or null if no frontmatter found
 */
export function parseFrontmatter(content: string): Record<string, unknown> | null {
  // Support both LF and CRLF line endings
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter: Record<string, unknown> = {};
  const lines = frontmatterMatch[1].split(/\r?\n/);

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    // Match key: value patterns (with or without quotes)
    // Supports: key: "value", key: 'value', key: value
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const key = match[1];
      let value: unknown = match[2].trim();
      const strValue = value as string;

      // Handle quoted strings (double or single quotes)
      if ((strValue.startsWith('"') && strValue.endsWith('"')) ||
          (strValue.startsWith("'") && strValue.endsWith("'"))) {
        // Remove quotes and unescape
        value = strValue.slice(1, -1)
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, '\\');
      } else if (strValue === 'null') {
        // Handle null
        value = null;
      } else if (strValue === 'true') {
        // Handle boolean true
        value = true;
      } else if (strValue === 'false') {
        // Handle boolean false
        value = false;
      } else if (/^-?\d+(\.\d+)?$/.test(strValue)) {
        // Handle numbers (integer or float)
        value = parseFloat(strValue);
      }
      // Arrays like [item1, item2] are kept as strings for now
      // More complex YAML structures would need a proper YAML parser

      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

/**
 * Generate frontmatter string from key-value pairs
 * Supports string, number, null, and array values
 *
 * @param fields - Key-value pairs to include in frontmatter
 * @returns Formatted frontmatter string with opening/closing delimiters
 */
export function generateFrontmatter(fields: Record<string, unknown>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`${key}: ${formatYamlValue(value)}`);
  }
  lines.push('---');
  lines.push(''); // Empty line after frontmatter
  return lines.join('\n');
}