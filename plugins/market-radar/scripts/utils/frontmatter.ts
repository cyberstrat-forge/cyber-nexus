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
 * Supports:
 * - Single-line values: key: value, key: "value", key: 'value'
 * - Multi-line arrays:
 *   ```yaml
 *   tags:
 *     - "item1"
 *     - "item2"
 *   ```
 * - Inline arrays: key: [item1, item2]
 * - Comments (skipped)
 * - null, boolean, number types
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

  let currentKey: string | null = null;
  let currentArray: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Check for list item (multi-line array)
    if (trimmedLine.startsWith('- ')) {
      if (currentKey !== null) {
        // Extract value after "- "
        let value = trimmedLine.slice(2).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\\/g, '\\');
        }

        currentArray.push(value);
      }
      continue;
    }

    // If we were building an array and hit a new key, save the array
    if (currentKey !== null && currentArray.length > 0) {
      frontmatter[currentKey] = currentArray;
      currentArray = [];
    }

    // Check for indentation (continuation of multi-line array)
    if (line.startsWith('  ') || line.startsWith('\t')) {
      // This is an indented line, might be part of multi-line array
      // but doesn't start with '-', skip it
      continue;
    }

    // Match key: value patterns
    const match = trimmedLine.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const key = match[1];
      let value: unknown = match[2].trim();
      const strValue = value as string;

      // Empty value after colon - might be start of multi-line array
      if (strValue === '') {
        currentKey = key;
        currentArray = [];
        continue;
      }

      // Reset current key tracking
      currentKey = null;

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
      } else if (strValue.startsWith('[') && strValue.endsWith(']')) {
        // Handle inline arrays [item1, item2]
        const inner = strValue.slice(1, -1).trim();
        if (inner === '') {
          value = [];
        } else {
          value = inner.split(',').map(s => {
            const item = s.trim();
            // Remove quotes if present
            if ((item.startsWith('"') && item.endsWith('"')) ||
                (item.startsWith("'") && item.endsWith("'"))) {
              return item.slice(1, -1);
            }
            return item;
          });
        }
      }

      frontmatter[key] = value;
    }
  }

  // Save any remaining multi-line array
  if (currentKey !== null && currentArray.length > 0) {
    frontmatter[currentKey] = currentArray;
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