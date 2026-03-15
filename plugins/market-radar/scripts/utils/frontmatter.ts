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
 * Parse frontmatter from markdown content
 * Returns key-value pairs from the frontmatter section
 *
 * @param content - Markdown content with optional frontmatter
 * @returns Parsed frontmatter key-value pairs, or null if no frontmatter found
 */
export function parseFrontmatter(content: string): Record<string, string> | null {
  // Support both LF and CRLF line endings
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter: Record<string, string> = {};
  const lines = frontmatterMatch[1].split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*"(.*)"$/);
    if (match) {
      // Unescape YAML string: \" -> ", \\ -> \
      frontmatter[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
  }

  return frontmatter;
}

/**
 * Generate frontmatter string from key-value pairs
 *
 * @param fields - Key-value pairs to include in frontmatter
 * @returns Formatted frontmatter string with opening/closing delimiters
 */
export function generateFrontmatter(fields: Record<string, string>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`${key}: "${escapeYamlString(value)}"`);
  }
  lines.push('---');
  lines.push(''); // Empty line after frontmatter
  return lines.join('\n');
}