/**
 * Frontmatter parsing utilities
 *
 * Provides functions for parsing and generating YAML frontmatter in markdown files.
 */

/**
 * Parse frontmatter from markdown content
 * Returns key-value pairs from the frontmatter section
 *
 * @param content - Markdown content with optional frontmatter
 * @returns Parsed frontmatter key-value pairs, or null if no frontmatter found
 */
export function parseFrontmatter(content: string): Record<string, string> | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter: Record<string, string> = {};
  const lines = frontmatterMatch[1].split('\n');

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*"(.*)"$/);
    if (match) {
      frontmatter[match[1]] = match[2];
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
    lines.push(`${key}: "${value}"`);
  }
  lines.push('---');
  lines.push(''); // Empty line after frontmatter
  return lines.join('\n');
}